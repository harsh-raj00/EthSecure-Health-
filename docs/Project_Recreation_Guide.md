# Secure Electronic Health Records — Project Recreation Guide

> Follow this guide step-by-step to recreate the entire EthSecure Health project from scratch on any machine. Every single command and file is documented.

---

## Prerequisites

Before starting, ensure you have these installed:
- **Node.js** (v18 or higher) — [Download here](https://nodejs.org/)
- **MetaMask** browser extension — [Download here](https://metamask.io/)
- **Git** — [Download here](https://git-scm.com/)

Verify installation:
```bash
node --version    # Should show v18.x.x or higher
npm --version     # Should show 9.x.x or higher
git --version     # Should show git version 2.x.x
```

---

## Step 1: Initialize the Project Directory

Create the project folder, initialize npm, and install all required dependencies:

```bash
mkdir EthSecureHealth
cd EthSecureHealth
npm init -y
npm pkg set type="module"
```

**Why `type="module"`?** This enables ES Module (ESM) syntax (`import`/`export`) instead of CommonJS (`require`), which is required by Hardhat 3.x and modern JavaScript tooling.

### Install Smart Contract Dependencies

```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-ethers ethers chai @openzeppelin/contracts
```

| Package | Purpose |
|---------|---------|
| `hardhat` | Ethereum development environment — compile, deploy, test contracts |
| `@nomicfoundation/hardhat-ethers` | Integrates ethers.js into Hardhat for contract interaction |
| `ethers` | JavaScript library to communicate with Ethereum blockchain |
| `chai` | Assertion library for writing test expectations |
| `@openzeppelin/contracts` | Audited, battle-tested smart contract libraries (AccessControl) |

---

## Step 2: Configure Hardhat

Create `hardhat.config.js` in the root folder:

```javascript
// hardhat.config.js
import "@nomicfoundation/hardhat-ethers";

export default {
  solidity: "0.8.20",
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
};
```

**What this does:**
- Tells Hardhat to use Solidity compiler version `0.8.20`
- Maps the project folder structure for contracts, tests, and compiled artifacts
- Imports the `hardhat-ethers` plugin so we can use `ethers.getSigners()` and `ethers.getContractFactory()` in our tests

---

## Step 3: Create the Smart Contracts

Create the `contracts/` folder:
```bash
mkdir contracts
```

### Contract 1: `contracts/EthSecureHealthAccess.sol`

**Purpose:** Manages Role-Based Access Control (RBAC) using OpenZeppelin's AccessControl.

**How it connects to the system:**
- The `constructor()` uses `_grantRole(DEFAULT_ADMIN_ROLE, msg.sender)` to make the deployer the admin
- The admin calls `addDoctor()`, `addPatient()`, `addDiagnosticCenter()` to assign roles
- These roles are checked by `EthSecureRecord.sol` before allowing any action
- Inherits from `@openzeppelin/contracts/access/AccessControl.sol` which provides the `onlyRole()` modifier and `hasRole()` function

**Key functions:**
| Function | Who Can Call | What It Does |
|----------|-------------|-------------|
| `addDoctor(address)` | Admin only | Assigns DOCTOR_ROLE to an Ethereum address |
| `addPatient(address)` | Admin only | Assigns PATIENT_ROLE to an Ethereum address |
| `addDiagnosticCenter(address)` | Admin only | Assigns DIAGNOSTIC_CENTER_ROLE to an Ethereum address |
| `isAuthorized(role, address)` | Anyone | Returns true/false if address holds the role |

---

### Contract 2: `contracts/EthSecureRecord.sol`

**Purpose:** The core registry that binds patients → doctors → IPFS records.

**How it connects to the system:**
- Takes the address of `EthSecureHealthAccess` in its constructor, linking both contracts
- Uses `accessControl.hasRole()` to verify permissions before every action
- Stores IPFS CID hashes (NOT the actual medical data) on-chain
- Manages the `doctorAccess` mapping: `patient → doctor → true/false`

**Key functions:**
| Function | Who Can Call | What It Does |
|----------|-------------|-------------|
| `registerPatient(ipfsHash)` | Patient only | Registers patient with encrypted demographic CID |
| `grantAccess(doctorAddress)` | Registered patient | Authorizes a specific doctor to view records |
| `revokeAccess(doctorAddress)` | Registered patient | Instantly removes doctor's authorization |
| `checkAccess(patient, doctor)` | Anyone | Returns true/false for access status |
| `getAuthorizedDoctors(patient)` | Patient only | Returns list of all authorized doctor addresses |
| `addMedicalReport(patient, ipfsHash, reportType)` | Authorized doctor OR diagnostic center | Links a new IPFS report CID to the patient |
| `getPatientMedicalReports(patient)` | Patient or authorized doctor | Returns all report CIDs for a patient |
| `getReportCount(patient)` | Patient or authorized doctor | Returns total number of reports |

**Data Structures:**
```solidity
struct Patient {
    string ipfsHash;       // CID of encrypted demographic data
    bool   isRegistered;   // Registration flag
}

struct MedicalReport {
    uint256 id;            // Unique report ID
    string  ipfsHash;      // CID of encrypted medical report on IPFS
    address uploadedBy;    // Doctor or diagnostic center address
    uint256 timestamp;     // When it was uploaded (block.timestamp)
    string  reportType;    // "MRI", "Blood Test", "X-Ray", etc.
}
```

---

## Step 4: Write the Deployment Script

Create `scripts/` folder and the deploy script:
```bash
mkdir scripts
```

### `scripts/deploy.js`

**Purpose:** Deploys both smart contracts to the Ethereum network in the correct order.

**How it connects:**
1. First deploys `EthSecureHealthAccess` (standalone — no dependencies)
2. Gets the deployed address of `EthSecureHealthAccess`
3. Passes that address to `EthSecureRecord`'s constructor, linking them
4. Uses `ethers.getSigners()` to get the deployer wallet from Hardhat's local network

**Run deployment:**
```bash
npx hardhat run scripts/deploy.js --network localhost
```

---

## Step 5: Write Automated Tests

Create `test/` folder:
```bash
mkdir test
```

### `test/EthSecureHealth.test.js`

**Purpose:** 12 automated test cases that verify every module works correctly.

**How it connects:**
- Uses `ethers.getSigners()` to create 6 simulated wallets (owner, doctor, doctor2, diagnostic, patient, unauthorized)
- In `beforeEach()`, deploys fresh contracts and assigns roles before every test
- Uses `contract.connect(signer)` to simulate different users calling functions
- Uses `expect(...).to.be.revertedWith(...)` to verify security blocks

**Run tests:**
```bash
npx hardhat test
```

**Expected output:**
```
  EthSecure Health - Smart Contract Test Suite
    Registration
      ✓ Should allow a patient to register with IPFS hash
      ✓ Should prevent double registration
      ✓ Should prevent non-patient from registering
    Patient Dashboard - Grant & Revoke Access
      ✓ Should allow patient to grant access to a doctor
      ✓ Should allow patient to revoke access from a doctor
      ✓ Should prevent granting access to a non-doctor address
      ✓ Should prevent revoking access from a doctor who has no access
    Doctor Dashboard - Viewing Reports
      ✓ Should allow authorized doctor to add a medical report
      ✓ Should allow diagnostic center to add a report without explicit patient grant
      ✓ Should prevent unauthorized doctor from adding a report
      ✓ Should prevent unauthorized doctor from viewing reports
      ✓ Should allow patient to view their own reports
    Revoking Permissions
      ✓ Should block doctor from viewing after access is revoked
      ✓ Should block doctor from adding reports after access is revoked

  14 passing
```

---

## Step 6: Set Up the Frontend

From the project root folder:

```bash
npx create-vite frontend --template react
cd frontend
npm install
npm install ethers crypto-js axios tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p
```

**Why `tailwindcss@3`?** TailwindCSS v4 recently broke PostCSS plugin compatibility. Version 3 is the stable, widely-supported release.

| Package | Purpose |
|---------|---------|
| `ethers` | Connects React UI to Ethereum smart contracts via MetaMask |
| `crypto-js` | AES-256 encryption/decryption of medical data in the browser |
| `axios` | HTTP client for uploading/downloading from IPFS (Pinata API) |
| `tailwindcss` | Utility-first CSS framework for premium UI design |

---

## Step 7: Configure TailwindCSS

### `frontend/tailwind.config.js`
Configure custom color palette for the premium dark-mode glassmorphism theme:
- `surf-900/800/700` → Deep dark backgrounds
- `brand` → Blue accent for primary actions
- `accent` → Purple glow for hover effects

### `frontend/postcss.config.js`
Registers TailwindCSS and Autoprefixer as PostCSS plugins.

### `frontend/src/index.css`
Contains the Tailwind directives (`@tailwind base/components/utilities`) plus custom classes:
- `.glass-panel` → Glassmorphism effect (blurred, semi-transparent backgrounds)
- `.glow-effect` → Purple glow on hover
- `.animate-fade-in` → Smooth entrance animation

---

## Step 8: Build the IPFS Integration

### `frontend/src/ipfs/storage.js`

**Purpose:** Handles the entire medical data lifecycle — encrypt, upload, retrieve, decrypt.

**How each function connects to the system:**

| Function | Input | Process | Output |
|----------|-------|---------|--------|
| `encryptAndUpload(data, key)` | Raw medical data + patient's secret key | 1. `CryptoJS.AES.encrypt()` encrypts data locally → 2. `axios.post()` uploads encrypted blob to Pinata → 3. Pinata stores it on IPFS network | IPFS CID hash string (e.g., `"QmYwAP..."`) |
| `retrieveAndDecrypt(cid, key)` | IPFS CID + patient's secret key | 1. `axios.get()` fetches encrypted blob from IPFS gateway → 2. `CryptoJS.AES.decrypt()` decrypts locally | Original medical data (JSON or string) |

**To use Pinata (free tier):**
1. Go to [app.pinata.cloud](https://app.pinata.cloud) and create an account
2. Go to API Keys → New Key → Copy your API Key and Secret
3. Replace `YOUR_PINATA_API_KEY` and `YOUR_PINATA_SECRET_KEY` in `storage.js`

---

## Step 9: Build the React Frontend

### `frontend/src/App.jsx`

**How it connects to the blockchain:**
1. **`connectWallet()` function** → Calls `window.ethereum` (MetaMask API) → Creates an `ethers.BrowserProvider` → Gets the user's `signer` object → Extracts their Ethereum address
2. **Dashboard Cards** → Patient, Doctor, and Diagnostic Center cards that navigate to role-specific interfaces
3. **"How It Works" Section** → Visual 4-step guide explaining the system flow

---

## Step 10: Compile & Run Everything

### Compile Smart Contracts
```bash
cd ..   # Back to root
npx hardhat compile
```
This generates ABI files in `artifacts/contracts/` which are needed to connect the frontend to the contracts.

### Run Tests
```bash
npx hardhat test
```

### Start Frontend Dev Server
```bash
cd frontend
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Step 11: Full System Integration (Connecting Everything)

Once the contracts are deployed and the frontend is running:

1. **Import contract ABIs** from `artifacts/contracts/*.sol/*.json` into your React components
2. **Create contract instances** using ethers.js:
   ```javascript
   const provider = new ethers.BrowserProvider(window.ethereum);
   const signer = await provider.getSigner();
   const contract = new ethers.Contract(contractAddress, contractABI, signer);
   ```
3. **Call smart contract functions** directly from React:
   ```javascript
   // Patient grants access
   await contract.grantAccess(doctorAddress);
   
   // Doctor views reports
   const reports = await contract.getPatientMedicalReports(patientAddress);
   
   // Patient revokes access
   await contract.revokeAccess(doctorAddress);
   ```
4. **IPFS operations** use the functions from `storage.js`:
   ```javascript
   // Upload encrypted data
   const cid = await encryptAndUpload(medicalData, patientSecretKey);
   
   // Store CID on blockchain
   await contract.addMedicalReport(patientAddress, cid, "Blood Test");
   
   // Retrieve and decrypt
   const data = await retrieveAndDecrypt(cid, patientSecretKey);
   ```

---

## Complete Project File Structure

```
EthSecureHealth/
├── contracts/
│   ├── EthSecureHealthAccess.sol     # RBAC (75 lines)
│   └── EthSecureRecord.sol           # Core registry (230 lines)
├── scripts/
│   └── deploy.js                     # Deployment (55 lines)
├── test/
│   └── EthSecureHealth.test.js       # 12 test cases (140 lines)
├── frontend/
│   ├── src/
│   │   ├── App.jsx                   # Main UI (140 lines)
│   │   ├── index.css                 # Glassmorphism styles (60 lines)
│   │   └── ipfs/
│   │       └── storage.js            # IPFS encrypt/decrypt (90 lines)
│   ├── tailwind.config.js
│   └── postcss.config.js
├── docs/
│   ├── Faculty_Presentation.md       # Faculty explanation guide
│   └── Project_Recreation_Guide.md   # This file
├── hardhat.config.js
├── package.json
└── README.md
```

---

## Step 12: Push to GitHub (Version Control)

It is highly recommended to back up the project and share it with faculty using GitHub. The `.gitignore` file is already configured to automatically ignore heavy folders like `node_modules/` and compiled `artifacts/`.

```bash
# 1. Initialize Git in the root of your project
git init

# 2. Add all project files (including the docs/ folder)
git add .

# 3. Commit the project
git commit -m "Initial commit for EthSecure Health complete project"

# 4. Create a repository on GitHub (do this in your browser at github.com)
# 5. Link and Push your code
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

---

*By following every step in this guide exactly, you will have a fully functional, production-quality decentralized medical records system running on your local machine.*
