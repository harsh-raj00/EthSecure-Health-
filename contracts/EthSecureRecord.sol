// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./EthSecureHealthAccess.sol";

/**
 * @title EthSecureRecord
 * @author EthSecure Health Team
 * @notice Core patient record registry. Maps patients to encrypted IPFS data
 *         and manages fine-grained doctor/diagnostic-center accessibility.
 * @dev All sensitive medical data is stored OFF-CHAIN on IPFS as encrypted blobs.
 *      Only the lightweight CID (Content Identifier) hash is stored on-chain,
 *      drastically reducing gas costs while preserving full auditability.
 *
 *      Access Flow:
 *        1. Patient registers with an IPFS hash of their encrypted demographics.
 *        2. Diagnostic center or authorized doctor uploads a medical report CID.
 *        3. Patient explicitly grants/revokes access to specific doctors.
 *        4. Only the patient or an authorized doctor can retrieve report CIDs.
 */
contract EthSecureRecord {

    // ─── State Variables ─────────────────────────────────────────────
    EthSecureHealthAccess public accessControl;
    uint256 public reportCount;

    // ─── Data Structures ─────────────────────────────────────────────

    /// @notice Stores patient demographic metadata pointer
    struct Patient {
        string  ipfsHash;       // CID of encrypted demographic data on IPFS
        bool    isRegistered;   // Registration flag
    }

    /// @notice Represents a single medical report linked to a patient
    struct MedicalReport {
        uint256 id;             // Unique report identifier
        string  ipfsHash;       // CID of encrypted report on IPFS
        address uploadedBy;     // Address of the uploader (doctor/diagnostic center)
        uint256 timestamp;      // Block timestamp when the report was added
        string  reportType;     // Type of report (e.g., "MRI", "Blood Test", "X-Ray")
    }

    // ─── Mappings ────────────────────────────────────────────────────

    /// @dev patient address => Patient struct
    mapping(address => Patient) private patients;

    /// @dev patient address => array of MedicalReport structs
    mapping(address => MedicalReport[]) private patientReports;

    /// @dev patient address => doctor address => boolean access flag
    mapping(address => mapping(address => bool)) private doctorAccess;

    /// @dev patient address => list of doctor addresses that have been granted access
    mapping(address => address[]) private authorizedDoctors;

    // ─── Events (Audit Trail) ────────────────────────────────────────

    /// @notice Emitted when a patient successfully registers on the platform
    event PatientRegistered(address indexed patient, string ipfsHash, uint256 timestamp);

    /// @notice Emitted when a patient grants a doctor access to their records
    event AccessGranted(address indexed patient, address indexed doctor, uint256 timestamp);

    /// @notice Emitted when a patient revokes a doctor's access
    event AccessRevoked(address indexed patient, address indexed doctor, uint256 timestamp);

    /// @notice Emitted when a new medical report is added for a patient
    event ReportAdded(
        address indexed patient,
        uint256 reportId,
        address indexed uploadedBy,
        string  reportType,
        uint256 timestamp
    );

    // ─── Modifiers ───────────────────────────────────────────────────

    /// @dev Ensures the target patient address is registered
    modifier onlyRegisteredPatient(address _patient) {
        require(patients[_patient].isRegistered, "Patient is not registered");
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────────

    /**
     * @notice Initializes the contract with a reference to the access control contract.
     * @param _accessControlAddress Address of the deployed EthSecureHealthAccess contract.
     */
    constructor(address _accessControlAddress) {
        accessControl = EthSecureHealthAccess(_accessControlAddress);
    }

    // ─── Registration ────────────────────────────────────────────────

    /**
     * @notice Registers the caller as a patient with an encrypted demographic IPFS hash.
     * @param _ipfsHash The CID of the patient's encrypted demographic data on IPFS.
     * @dev Only addresses with PATIENT_ROLE can register. Each patient can register once.
     */
    function registerPatient(string memory _ipfsHash) public {
        require(
            accessControl.hasRole(accessControl.PATIENT_ROLE(), msg.sender),
            "Caller is not a patient"
        );
        // require(!patients[msg.sender].isRegistered, "Already registered");

        patients[msg.sender] = Patient({
            ipfsHash: _ipfsHash,
            isRegistered: true
        });

        emit PatientRegistered(msg.sender, _ipfsHash, block.timestamp);
    }

    // ─── Access Control (Patient Dashboard) ──────────────────────────

    /**
     * @notice Grants a specific doctor address permission to view the caller's records.
     * @param _doctor The Ethereum wallet address of the doctor to authorize.
     * @dev The caller must be a registered patient. The target must hold DOCTOR_ROLE.
     */
    function grantAccess(address _doctor) public onlyRegisteredPatient(msg.sender) {
        require(
            accessControl.hasRole(accessControl.DOCTOR_ROLE(), _doctor),
            "Target is not a doctor"
        );
        require(!doctorAccess[msg.sender][_doctor], "Doctor already has access");

        doctorAccess[msg.sender][_doctor] = true;
        authorizedDoctors[msg.sender].push(_doctor);

        emit AccessGranted(msg.sender, _doctor, block.timestamp);
    }

    /**
     * @notice Revokes a specific doctor's permission to view the caller's records.
     * @param _doctor The Ethereum wallet address of the doctor to revoke.
     * @dev Instantly removes on-chain access. The doctor can no longer decrypt IPFS data.
     */
    function revokeAccess(address _doctor) public onlyRegisteredPatient(msg.sender) {
        require(doctorAccess[msg.sender][_doctor], "Doctor does not have access");

        doctorAccess[msg.sender][_doctor] = false;

        emit AccessRevoked(msg.sender, _doctor, block.timestamp);
    }

    /**
     * @notice Checks whether a doctor has active access to a patient's records.
     * @param _patient The patient's Ethereum wallet address.
     * @param _doctor  The doctor's Ethereum wallet address.
     * @return True if the doctor is authorized, false otherwise.
     */
    function checkAccess(address _patient, address _doctor) public view returns (bool) {
        return doctorAccess[_patient][_doctor];
    }

    /**
     * @notice Returns all doctor addresses that have been granted access by a patient.
     * @param _patient The patient's Ethereum wallet address.
     * @return Array of doctor addresses (includes revoked; check `checkAccess` for active status).
     */
    function getAuthorizedDoctors(address _patient) public view onlyRegisteredPatient(_patient) returns (address[] memory) {
        require(msg.sender == _patient, "Only the patient can view their authorized doctors");
        return authorizedDoctors[_patient];
    }

    // ─── Medical Reports (Doctor Dashboard & Diagnostic Center) ──────

    /**
     * @notice Adds a new medical report (IPFS CID) to a patient's record history.
     * @param _patient    The patient's Ethereum wallet address.
     * @param _ipfsHash   The CID of the encrypted medical report on IPFS.
     * @param _reportType A label describing the report (e.g., "MRI", "Blood Test").
     * @dev Can only be called by a diagnostic center OR an authorized doctor.
     */
    function addMedicalReport(
        address _patient,
        string memory _ipfsHash,
        string memory _reportType
    ) public onlyRegisteredPatient(_patient) {
        bool isPatient = msg.sender == _patient;
        bool isDiagnostic = accessControl.hasRole(
            accessControl.DIAGNOSTIC_CENTER_ROLE(), msg.sender
        );
        bool isAuthorizedDoctor = accessControl.hasRole(
            accessControl.DOCTOR_ROLE(), msg.sender
        ) && doctorAccess[_patient][msg.sender];

        require(
            isPatient || isDiagnostic || isAuthorizedDoctor,
            "Not authorized to add report for this patient"
        );

        reportCount++;
        MedicalReport memory newReport = MedicalReport({
            id: reportCount,
            ipfsHash: _ipfsHash,
            uploadedBy: msg.sender,
            timestamp: block.timestamp,
            reportType: _reportType
        });

        patientReports[_patient].push(newReport);

        emit ReportAdded(_patient, reportCount, msg.sender, _reportType, block.timestamp);
    }

    /**
     * @notice Retrieves all medical reports for a given patient.
     * @param _patient The patient's Ethereum wallet address.
     * @return Array of MedicalReport structs containing IPFS CIDs and metadata.
     * @dev Only the patient themselves or an authorized doctor can call this.
     */
    function getPatientMedicalReports(
        address _patient
    ) public view onlyRegisteredPatient(_patient) returns (MedicalReport[] memory) {
        bool isPatient = msg.sender == _patient;
        bool isAuthorizedDoctor = accessControl.hasRole(
            accessControl.DOCTOR_ROLE(), msg.sender
        ) && doctorAccess[_patient][msg.sender];

        require(isPatient || isAuthorizedDoctor, "Not authorized to view records");

        return patientReports[_patient];
    }

    /**
     * @notice Returns the total number of reports stored for a specific patient.
     * @param _patient The patient's Ethereum wallet address.
     * @return The count of medical reports.
     */
    function getReportCount(address _patient) public view onlyRegisteredPatient(_patient) returns (uint256) {
        bool isPatient = msg.sender == _patient;
        bool isAuthorizedDoctor = accessControl.hasRole(
            accessControl.DOCTOR_ROLE(), msg.sender
        ) && doctorAccess[_patient][msg.sender];

        require(isPatient || isAuthorizedDoctor, "Not authorized");

        return patientReports[_patient].length;
    }
}
