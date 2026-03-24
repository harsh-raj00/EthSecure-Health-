// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title EthSecureHealthAccess
 * @author EthSecure Health Team
 * @notice Manages role-based access control (RBAC) for the Secure Electronic Health Records system.
 * @dev Inherits OpenZeppelin's battle-tested AccessControl.
 *      Roles: ADMIN (deployer), PATIENT, DOCTOR, DIAGNOSTIC_CENTER.
 *      Only the admin can assign roles to Ethereum addresses.
 */
contract EthSecureHealthAccess is AccessControl {

    // ─── Role Definitions ────────────────────────────────────────────
    bytes32 public constant DOCTOR_ROLE = keccak256("DOCTOR_ROLE");
    bytes32 public constant DIAGNOSTIC_CENTER_ROLE = keccak256("DIAGNOSTIC_CENTER_ROLE");
    bytes32 public constant PATIENT_ROLE = keccak256("PATIENT_ROLE");

    // ─── Events ──────────────────────────────────────────────────────
    event DoctorAdded(address indexed account);
    event DiagnosticCenterAdded(address indexed account);
    event PatientAdded(address indexed account);

    /**
     * @notice Deploys the contract and assigns the deployer as the default admin.
     * @dev The admin wallet (msg.sender) is the only entity that can register
     *      doctors, patients, and diagnostic centers into the system.
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @notice Registers a new doctor address in the system.
     * @param account The Ethereum wallet address of the doctor.
     */
    function addDoctor(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(DOCTOR_ROLE, account);
        emit DoctorAdded(account);
    }

    /**
     * @notice Registers a new diagnostic center address in the system.
     * @param account The Ethereum wallet address of the diagnostic center.
     */
    function addDiagnosticCenter(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(DIAGNOSTIC_CENTER_ROLE, account);
        emit DiagnosticCenterAdded(account);
    }

    /**
     * @notice Registers a new patient address in the system.
     * @param account The Ethereum wallet address of the patient.
     */
    function addPatient(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(PATIENT_ROLE, account);
        emit PatientAdded(account);
    }

    /**
     * @notice Checks whether a given address holds a specific role.
     * @param role The bytes32 role identifier.
     * @param account The address to check.
     * @return True if the address holds the role, false otherwise.
     */
    function isAuthorized(bytes32 role, address account) external view returns (bool) {
        return hasRole(role, account);
    }
}
