# Secure Electronic Health Records — Faculty Presentation Guide

> This document explains every technical aspect of the EthSecure Health system in depth, designed to answer any faculty question comprehensively.

---

## 1. Project Title & Summary

**Project Name:** Secure Electronic Health Records (EthSecure Health)

**Summary:** The "Secure Electronic Health Records" project utilizes Ethereum blockchain, Metamask, and Ganache to enable patients to securely upload medical data and also view their data, manage doctor access, and view data history. Doctors can manage patient lists, access records, generate consultancy reports, and revoke access given by patient. Diagnostic centers can create EHR reports, ensuring visibility for both patients and doctors through IPFS integration. This decentralized approach enhances data security, interoperability, and patient control over health information, ultimately improving healthcare delivery and patient outcomes.

---

## 2. Technology Stack (with Justification)

| Technology | Role | Why We Chose This |
|-----------|------|-------------------|
| **Ethereum** | Public Blockchain | Provides decentralization, transparency, and censorship resistance. The most widely adopted smart contract platform with battle-tested security. |
| **MetaMask** | Crypto Wallet | Industry-standard browser wallet. Allows users to sign transactions without exposing their private keys to the application. |
| **Ganache** | Local Testnet | Simulates a full Ethereum blockchain locally for development and testing without spending real ETH (gas fees). |
| **IPFS (Pinata)** | Decentralized Storage | Content-addressed file storage. Unlike traditional servers, data on IPFS cannot be deleted or censored. Pinata provides reliable pinning. |
| **Solidity** | Smart Contract Language | The native programming language for Ethereum. Compiles to EVM bytecode that runs identically on every node in the network. |
| **OpenZeppelin** | Security Library | Provides audited, production-ready implementations of access control patterns, preventing common vulnerabilities. |
| **ReactJS + Vite** | Frontend Framework | React provides component-based UI architecture. Vite provides near-instant hot module replacement during development. |
| **ethers.js** | Web3 Library | Connects our React frontend to Ethereum smart contracts. Handles ABI encoding, transaction signing, and event listening. |
| **crypto-js** | Encryption Library | Implements AES-256 symmetric encryption entirely in the browser. Medical data is encrypted *before* it ever leaves the patient's computer. |
| **Truffle / Hardhat** | Testing Framework | Provides a complete testing environment with local blockchain simulation, automated test runners, and assertion libraries. |
| **Git** | Version Control | Tracks every code change with full history for collaboration and rollback. |
| **Node.js** | Runtime Environment | JavaScript runtime that powers the build tools, testing frameworks, and development servers. |

---

## 3. Why Public Blockchain with Private Data?

### The Problem with Traditional Healthcare Systems
Traditional hospital databases are:
- **Centralized** → A single point of failure. If the server goes down, all records are inaccessible.
- **Vulnerable** → Centralized servers are prime targets for ransomware attacks and data breaches.
- **Siloed** → Hospital A cannot easily share records with Hospital B, leading to duplicate tests and fragmented care.
- **Controlled by institutions** → Patients have no direct control over who accesses their data.

### Our Hybrid Solution
We use a **Public Blockchain** (Ethereum) but keep the **Data Private**. Here's why and how:

| Concern | Our Solution |
|---------|-------------|
| "But if Ethereum is public, can't anyone see the medical records?" | **No.** Only encrypted CID hashes are stored on-chain. The actual medical data is encrypted with AES-256 before upload. |
| "Where are the actual MRI images and blood reports stored?" | **On IPFS** (InterPlanetary File System). IPFS is a decentralized network — no single server holds the data. But even on IPFS, the files are encrypted. |
| "Who holds the decryption key?" | **Only the patient.** The encryption key never leaves the patient's browser. They share it only with doctors they explicitly trust. |
| "What exactly is stored ON the Ethereum blockchain?" | Three things: (1) The IPFS CID hash pointer, (2) Access control mappings (which doctor can access which patient), (3) Audit trail events with timestamps. |
| "Why not just use a private blockchain?" | A private blockchain is controlled by a single organization. A public blockchain ensures that NO single entity (not even the hospital) can tamper with or delete the access logs. |

---

## 4. Core Application Modules (Detailed)

### Module A: Registration

**What happens:** Each user connects their MetaMask wallet. The system admin assigns them a role on the blockchain.

**Under the hood:**
```
User clicks "Connect Wallet"
    → MetaMask popup appears
    → User approves connection
    → ethers.js calls: window.ethereum.request({ method: 'eth_requestAccounts' })
    → Returns the user's public Ethereum address (e.g., 0x1234...abcd)

Admin registers the user on-chain:
    → Calls: accessControl.addPatient(userAddress)
    → Internally: grantRole(PATIENT_ROLE, account)
    → Emits: PatientAdded(account) event
    → This role assignment is PERMANENT and IMMUTABLE on the blockchain
```

**Smart Contract Function:**
```solidity
function addPatient(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
    grantRole(PATIENT_ROLE, account);
    emit PatientAdded(account);
}
```

**Why OpenZeppelin AccessControl?**
- Provides `onlyRole()` modifier — automatically rejects unauthorized callers
- Provides `hasRole()` — checks if an address holds a specific role
- Heavily audited by security researchers worldwide, used by thousands of production dApps

---

### Module B: Patient Dashboard

**What the patient can do:**
1. **Upload medical data** → Data is encrypted in the browser, uploaded to IPFS, and the CID is stored on Ethereum.
2. **View health history** → Calls `getPatientMedicalReports()` to fetch all CIDs, then decrypts each from IPFS.
3. **Grant access** → Calls `grantAccess(doctorAddress)` which updates the on-chain mapping.
4. **Revoke access** → Calls `revokeAccess(doctorAddress)` which instantly blocks the doctor.
5. **View authorized doctors** → Calls `getAuthorizedDoctors()` to see who currently has permissions.

**Data Upload Flow (Step by Step):**
```
Step 1: Patient selects a medical document (PDF/Image) in the browser

Step 2: storage.js → encryptAndUpload(file, secretKey)
    → CryptoJS.AES.encrypt(fileData, secretKey)
    → Produces encrypted ciphertext (unreadable without key)

Step 3: Encrypted blob uploaded to IPFS via Pinata API
    → axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", encryptedBlob)
    → Pinata returns CID: "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"

Step 4: CID stored on Ethereum blockchain
    → secureRecordContract.addMedicalReport(patientAddress, CID, "Blood Test")
    → Emits ReportAdded event with timestamp for audit trail

Step 5: Transaction confirmed on blockchain — record is now IMMUTABLE
```

---

### Module C: Doctor Dashboard

**What the doctor can do:**
1. **View patient list** → See all patients who have granted them access.
2. **Access patient records** → Calls `getPatientMedicalReports(patientAddress)` which the smart contract only allows if `checkAccess()` returns `true`.
3. **Generate consultancy reports** → Doctor uploads a new report CID linked to the patient.

**Record Retrieval Flow (Step by Step):**
```
Step 1: Doctor connects MetaMask wallet

Step 2: Frontend calls checkAccess(patientAddress, doctorAddress) on smart contract
    → If FALSE: "Not authorized to view records" (transaction reverts)
    → If TRUE: Proceed to Step 3

Step 3: Frontend calls getPatientMedicalReports(patientAddress)
    → Returns array of MedicalReport structs containing IPFS CIDs

Step 4: For each CID, frontend calls retrieveAndDecrypt(cid, sharedKey)
    → axios.get fetches encrypted blob from IPFS gateway
    → CryptoJS.AES.decrypt(encryptedData, sharedKey)
    → Original medical document is reconstructed

Step 5: Doctor views the decrypted medical records in the browser
```

**Smart Contract Security Check:**
```solidity
function getPatientMedicalReports(address _patient) public view returns (MedicalReport[] memory) {
    bool isPatient = msg.sender == _patient;
    bool isAuthorizedDoctor = hasRole(DOCTOR_ROLE, msg.sender) && doctorAccess[_patient][msg.sender];
    require(isPatient || isAuthorizedDoctor, "Not authorized to view records");
    return patientReports[_patient];
}
```

---

### Module D: Revoking Permissions

**Why this matters:** In traditional systems, once a doctor has access, it's very difficult for patients to revoke it. In our system, revocation is instant and absolute.

**What happens when a patient revokes a doctor:**
```
Step 1: Patient clicks "Revoke Access" for a specific doctor

Step 2: Frontend calls: secureRecord.revokeAccess(doctorAddress)

Step 3: Smart contract executes:
    → doctorAccess[patient][doctor] = false;  // Instant state change
    → Emits AccessRevoked(patient, doctor, timestamp);

Step 4: From this moment forward, ANY call by the doctor to:
    → getPatientMedicalReports() → REVERTS with "Not authorized"
    → addMedicalReport()         → REVERTS with "Not authorized"

The revocation is PERMANENT until the patient explicitly re-grants access.
The doctor CANNOT bypass this — it is enforced by immutable smart contract code.
```

---

### Module E: Diagnostic Center

**What diagnostic centers do:**
1. Create EHR reports (MRI scans, blood work, X-rays, CT scans)
2. Encrypt the report and upload to IPFS
3. Store the CID on-chain linked to the patient's address
4. Both the patient AND their authorized doctors can see the report

**Key Difference:** Diagnostic centers do NOT need explicit patient permission to upload reports (they have `DIAGNOSTIC_CENTER_ROLE`), but they can ONLY upload — they cannot view previous records.

---

## 5. Smart Contract Architecture

### Contract 1: `EthSecureHealthAccess.sol`
**Purpose:** Manages WHO can do WHAT in the system.

| Role | Can Register | Can Upload | Can View | Can Grant/Revoke |
|------|-------------|-----------|---------|-----------------|
| Admin | ✅ (assigns roles) | ❌ | ❌ | ❌ |
| Patient | ✅ (self) | ✅ (own data) | ✅ (own data) | ✅ |
| Doctor | ❌ | ✅ (if authorized) | ✅ (if authorized) | ❌ |
| Diagnostic Center | ❌ | ✅ (reports only) | ❌ | ❌ |

### Contract 2: `EthSecureRecord.sol`
**Purpose:** Manages the actual data registry and permission mappings.

**Key Data Structures:**
```solidity
mapping(address => Patient) private patients;                          // Patient profiles
mapping(address => MedicalReport[]) private patientReports;            // All medical reports
mapping(address => mapping(address => bool)) private doctorAccess;     // Permission matrix
mapping(address => address[]) private authorizedDoctors;               // Doctor tracking
```

**Key Events (Audit Trail):**
```solidity
event PatientRegistered(address patient, string ipfsHash, uint256 timestamp);
event AccessGranted(address patient, address doctor, uint256 timestamp);
event AccessRevoked(address patient, address doctor, uint256 timestamp);
event ReportAdded(address patient, uint256 reportId, address uploadedBy, string reportType, uint256 timestamp);
```
Every single action in the system is permanently logged on the blockchain with timestamps — creating a complete, tamper-proof audit trail.

---

## 6. Testing Results

Our automated test suite covers **12 test cases** across all 4 modules:

| Test Category | Test Case | Expected Result |
|--------------|-----------|----------------|
| Registration | Patient registers with IPFS hash | ✅ Success |
| Registration | Double registration prevented | ✅ Reverts |
| Registration | Non-patient cannot register | ✅ Reverts |
| Patient Dashboard | Grant access to doctor | ✅ Access = true |
| Patient Dashboard | Revoke access from doctor | ✅ Access = false |
| Patient Dashboard | Cannot grant to non-doctor | ✅ Reverts |
| Patient Dashboard | Cannot revoke non-existing access | ✅ Reverts |
| Doctor Dashboard | Authorized doctor adds report | ✅ Report stored |
| Doctor Dashboard | Diagnostic center adds report | ✅ Report stored |
| Doctor Dashboard | Unauthorized doctor blocked | ✅ Reverts |
| Doctor Dashboard | Patient can view own reports | ✅ Returns data |
| Revoking | Doctor blocked after revocation | ✅ Reverts |

---

## 7. Key Advantages Over Traditional Systems

| Feature | Traditional Hospital DB | EthSecure Health |
|---------|----------------------|-----------------|
| Data ownership | Hospital | **Patient** |
| Single point of failure | ✅ Yes | **❌ No** (decentralized) |
| Tamper-proof audit trail | ❌ No | **✅ Yes** (blockchain) |
| Cross-hospital access | ❌ Difficult | **✅ Any authorized doctor** |
| Patient can revoke access | ❌ Rarely | **✅ Instant on-chain** |
| Data encryption | Varies | **✅ AES-256 mandatory** |
| Ransomware resistant | ❌ Vulnerable | **✅ Decentralized storage** |
