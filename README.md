# 🏥 EthSecure Health — Secure Electronic Health Records

> A Patient-Centric Ethereum Blockchain System for Secure Medical Records using IPFS, MongoDB & Client-Side AES-256 Encryption

---

## 📋 Project Summary

**EthSecure Health** is a full-stack decentralized application (DApp) that puts patients in complete control of their medical data. The system combines **Ethereum smart contracts** for immutable access control, **IPFS (Pinata)** for decentralized encrypted file storage, and a **MongoDB-backed Express.js API** for user profiles and access request management.

### What Each User Can Do

| Role | Capabilities |
|------|-------------|
| **Patient** | Register on-chain, upload encrypted prescriptions, view medical records, grant/revoke doctor access, approve/reject access requests |
| **Doctor** | Register on-chain, request patient access, search & view authorized patient records, submit medical reports (Blood Test, MRI, X-Ray, etc.) |
| **Diagnostic Center** | Upload EHR reports for any registered patient without needing explicit access grant |
| **Admin** | Assign roles via smart contract (deployer wallet) |

---

## 🏗️ System Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React 19 + Vite 8)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────────────┐ │
│  │   Patient     │  │   Doctor     │  │   Registration / Login      │ │
│  │   Dashboard   │  │   Dashboard  │  │   (Unique ID + Password)    │ │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┬──────────────┘ │
│         │                 │                          │                │
│         └─────────────────┼──────────────────────────┘                │
│                           │                                           │
│              ┌────────────┼────────────────┐                          │
│              │            │                │                          │
│     ┌────────▼────────┐   │   ┌────────────▼──────────────┐          │
│     │   ethers.js     │   │   │   crypto-js (AES-256)     │          │
│     │   + MetaMask    │   │   │   Client-side encryption  │          │
│     └────────┬────────┘   │   └────────────┬──────────────┘          │
└──────────────┼────────────┼────────────────┼─────────────────────────┘
               │            │                │
    ┌──────────▼──────────┐ │  ┌─────────────▼──────────────┐
    │  ETHEREUM NETWORK   │ │  │  IPFS NETWORK (Pinata)     │
    │  (Ganache Local)    │ │  │                            │
    │                     │ │  │  Stores: AES-256 encrypted │
    │  Stores:            │ │  │  MRI, Blood Reports, X-Ray,│
    │  • IPFS CID Hashes  │ │  │  prescriptions as blobs    │
    │  • Access Control   │ │  │                            │
    │  • Audit Events     │ │  │  Returns: CID Hash         │
    │  • Role Mappings    │ │  └────────────────────────────┘
    └─────────────────────┘ │
                            │
    ┌───────────────────────▼────────────────────────────────┐
    │  SMART CONTRACTS (Solidity ^0.8.20)                     │
    │                                                        │
    │  EthSecureHealthAccess.sol                             │
    │  └─ Role-Based Access Control (RBAC via OpenZeppelin)  │
    │  └─ Self-registration for patients & doctors           │
    │                                                        │
    │  EthSecureRecord.sol                                   │
    │  └─ Patient Registration with IPFS demographics        │
    │  └─ Grant / Revoke doctor access                       │
    │  └─ Medical Report storage (CID + metadata)            │
    │  └─ Immutable Audit Trail via Events                   │
    └────────────────────────────────────────────────────────┘

    ┌────────────────────────────────────────────────────────┐
    │  BACKEND API (Express.js + MongoDB)                    │
    │                                                        │
    │  • User registration & login (SHA-256 password hash)   │
    │  • Profile storage (demographics, credentials)         │
    │  • Doctor → Patient access request workflow            │
    │  • Unique ID-based user lookup                         │
    │                                                        │
    │  MongoDB Models:                                       │
    │  └─ User (wallet, uniqueId, role, profile data)        │
    │  └─ AccessRequest (patient ↔ doctor, status)           │
    └────────────────────────────────────────────────────────┘
```

---

## 📦 Core Application Modules

### 1. 🔐 Registration & Authentication

Users connect their MetaMask wallet, choose a role (Patient or Doctor), and either **register** or **login**.

**Registration Flow:**
1. User fills in profile form (name, DOB, blood type, contact info, etc.)
2. Creates a Unique ID (e.g., `PAT-A7X3K9`) and password
3. Self-registers the role on-chain via `selfRegisterAsPatient()` or `selfRegisterAsDoctor()`
4. Patient also calls `registerPatient(ipfsHash)` to create on-chain record
5. Profile data saved to MongoDB with SHA-256 hashed password

**Login Flow:**
1. User enters Unique ID + password
2. Backend verifies credentials against MongoDB
3. Profile loaded and dashboard rendered based on role

**Smart Contract Functions:**
```solidity
function selfRegisterAsPatient() external     // Anyone can self-register as patient
function selfRegisterAsDoctor() external      // Anyone can self-register as doctor
function registerPatient(string _ipfsHash) public  // Stores demographic CID on-chain
```

### 2. 📊 Patient Dashboard

The central hub for patients with four tabs:

| Tab | Features |
|-----|----------|
| **👤 Profile** | View all stored profile information (name, DOB, blood type, contact, emergency contact) |
| **📤 Upload Rx** | Upload prescriptions with drag-and-drop, attach metadata (doctor name, date, medication), AES-256 encrypt & store on IPFS |
| **📋 Records** | View all medical reports with CID, report type, timestamp, uploader address; decrypt & view individual records |
| **🔐 Access** | View pending doctor access requests (approve/reject), view & revoke active doctor authorizations |

**Smart Contract Functions:**
```solidity
function grantAccess(address _doctor) public       // Patient authorizes a doctor
function revokeAccess(address _doctor) public       // Patient removes authorization
function getAuthorizedDoctors(address) public view  // List all authorized doctors
function getPatientMedicalReports(address) public view  // View all personal EHR data
function addMedicalReport(address, string, string) public  // Upload report CID
```

### 3. 👨‍⚕️ Doctor Dashboard

A secure portal for verified medical professionals with four tabs:

| Tab | Features |
|-----|----------|
| **👤 Profile** | View doctor profile (name, specialization, hospital, license, experience, languages) |
| **🔓 Request Access** | Enter patient's Unique ID to send an access request (stored in MongoDB, patient approves from their dashboard) |
| **🔍 Search Patient** | Search patient by Unique ID, view their reports if authorized, see "Access Required" prompt if not |
| **📄 Add Report** | Submit medical reports for authorized patients (Blood Test, MRI, X-Ray, CT Scan, ECG, Ultrasound, Prescription, Consultancy Report) |

### 4. 🔄 Access Request Workflow

A two-phase access control system combining on-chain and off-chain:

```
Doctor enters patient Unique ID → Backend stores pending request in MongoDB
                                          ↓
Patient sees request in "Access" tab → Clicks "Approve"
                                          ↓
On-chain: grantAccess(doctorAddress) → Backend: status updated to "approved"
                                          ↓
Doctor can now search & view patient records
```

### 5. 🚫 Revoking Permissions

Patients can instantly revoke any doctor's access. This executes an on-chain state change making it impossible for the doctor to retrieve records.

```solidity
function revokeAccess(address _doctor) public onlyRegisteredPatient(msg.sender) {
    require(doctorAccess[msg.sender][_doctor], "Doctor does not have access");
    doctorAccess[msg.sender][_doctor] = false;  // Instant state change
    emit AccessRevoked(msg.sender, _doctor, block.timestamp);  // Audit log
}
```

### 6. 🔬 Diagnostic Center

Diagnostic centers can upload encrypted EHR reports (MRI, Blood Work, X-Ray, CT Scan) for any registered patient **without needing explicit access grants** — their `DIAGNOSTIC_CENTER_ROLE` is sufficient authorization.

---

## 🔒 Security Model: Public Blockchain + Private Data

| Layer | Storage | What is Stored | Visibility |
|-------|---------|---------------|------------|
| **Ethereum** (On-Chain) | Smart Contract State | IPFS CID hashes, Access mappings, Audit events | Public but contains NO sensitive data |
| **IPFS** (Off-Chain) | Pinata Gateway | AES-256 encrypted medical documents | Public but mathematically unreadable |
| **MongoDB** (Off-Chain) | Backend Database | User profiles, hashed passwords, access request status | Private server-side storage |
| **Browser** (Client-Side) | Local Memory | Encryption keys, Raw medical data | Never leaves the user's device |

**Key Insight:** Medical data (MRI images, blood reports, etc.) is encrypted **before** it leaves the patient's browser using AES-256. Without the correct decryption key, the data on IPFS is just random noise. Passwords are SHA-256 hashed client-side before transmission — the server never sees plaintext passwords.

---

## 🔄 Data Flow Diagram

```
Patient uploads prescription
        │
        ▼
┌─────────────────────────┐
│  Browser encrypts with  │
│  AES-256 locally        │───── Key stays with patient
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Encrypted blob uploads │
│  to IPFS via Pinata     │───── Returns CID: "QmYwAP..."
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  CID stored on Ethereum │
│  via addMedicalReport() │───── Immutable on-chain record
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Doctor requests access │
│  via Backend API        │───── Stored in MongoDB (pending)
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Patient approves on    │
│  dashboard (on-chain +  │───── grantAccess() + API update
│  backend update)        │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Doctor fetches CID,    │
│  retrieves from IPFS,   │
│  decrypts locally       │───── Views original document
└─────────────────────────┘
```

---

## 🛠️ Technology Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Blockchain | **Ethereum** | — | Decentralized ledger for access control & audit trail |
| Wallet | **MetaMask** | — | Browser-based Ethereum wallet for user authentication |
| Local Blockchain | **Ganache** | ^7.9.2 | Local Ethereum testnet for development & testing |
| File Storage | **IPFS (Pinata)** | — | Decentralized encrypted medical document storage |
| Smart Contracts | **Solidity** | ^0.8.20 | Access control logic & patient record management |
| Contract Security | **OpenZeppelin** | ^5.6.1 | Battle-tested RBAC library (`AccessControl.sol`) |
| Contract Tooling | **Hardhat** | ^2.28.6 | Compilation, deployment, and testing framework |
| Frontend | **React** | ^19.2.4 | Component-based user interface |
| Build Tool | **Vite** | ^8.0.1 | Lightning-fast frontend bundler & dev server |
| Web3 Library | **ethers.js** | ^6.16.0 | Frontend ↔ Ethereum smart contract communication |
| Encryption | **crypto-js** | ^4.2.0 | Client-side AES-256 medical data encryption |
| HTTP Client | **axios** | ^1.15.0 | IPFS upload/download via Pinata REST API |
| Backend Runtime | **Node.js + Express** | ^4.21.0 | REST API server for user management |
| Database | **MongoDB + Mongoose** | ^8.8.0 | User profiles, credentials, access requests |
| Styling | **TailwindCSS** | ^3.4.19 | Utility-first CSS + custom glassmorphism theme |
| Typography | **Inter** (Google Fonts) | — | Modern sans-serif font family |
| Testing | **Hardhat + Chai** | ^4.5.0 | Smart contract unit testing (14 test cases) |
| Version Control | **Git** | — | Source code management |

---

## 📂 Project Structure

```
EthSecure-Health/
├── contracts/
│   ├── EthSecureHealthAccess.sol       # RBAC — roles: Admin, Patient, Doctor, Diagnostic
│   └── EthSecureRecord.sol             # Core registry — records, access, audit events
│
├── scripts/
│   └── deploy.js                       # Deploys contracts, sets up demo roles & data,
│                                       # saves ABIs + addresses to frontend/src/contracts/
│
├── test/
│   └── EthSecureHealth.test.js         # 14 automated test cases (registration, access,
│                                       # reports, revocation, security)
│
├── backend/
│   ├── server.js                       # Express.js API (register, login, profiles,
│   │                                   # access requests — runs on port 5000)
│   ├── models/
│   │   ├── User.js                     # Mongoose schema: wallet, uniqueId, role,
│   │   │                               # passwordHash, demographics, doctor fields
│   │   └── AccessRequest.js            # Mongoose schema: patient ↔ doctor pairing,
│   │                                   # status (pending/approved/rejected)
│   ├── package.json                    # Backend dependencies (express, mongoose, cors, dotenv)
│   └── .env.example                    # MONGO_URI, PORT
│
├── frontend/
│   ├── index.html                      # SPA entry point
│   ├── src/
│   │   ├── App.jsx                     # Single-file React app (924 lines) — all views:
│   │   │                               # Landing, Role Select, Auth, Registration,
│   │   │                               # Login, Patient Dashboard, Doctor Dashboard
│   │   ├── main.jsx                    # React DOM entry point
│   │   ├── index.css                   # Premium design system (722 lines) — glassmorphism,
│   │   │                               # animations, orbs, dark theme, responsive grids
│   │   ├── ipfs/
│   │   │   └── storage.js             # IPFS utilities: encryptAndUpload(), retrieveAndDecrypt()
│   │   ├── contracts/                  # Auto-generated by deploy.js
│   │   │   ├── deployment.json         # Contract addresses + demo wallet addresses
│   │   │   ├── EthSecureHealthAccess.json  # Access control ABI
│   │   │   └── EthSecureRecord.json    # Record contract ABI
│   │   └── assets/
│   │       ├── hero.png                # Landing page hero image
│   │       ├── react.svg               # React logo
│   │       └── vite.svg                # Vite logo
│   ├── public/
│   │   ├── favicon.svg                 # Custom favicon
│   │   └── icons.svg                   # UI icon sprites
│   ├── tailwind.config.js              # Custom theme (surf, brand, accent colors + Inter font)
│   ├── postcss.config.js               # PostCSS pipeline (Tailwind + Autoprefixer)
│   ├── vite.config.js                  # Vite + React plugin
│   ├── eslint.config.js                # ESLint rules
│   ├── package.json                    # Frontend dependencies
│   └── .env.example                    # VITE_PINATA_API_KEY, VITE_PINATA_SECRET_KEY
│
├── docs/
│   ├── Presentation_Guide.md           # Slide-by-slide presentation script with Q&A prep
│   ├── Faculty_Demonstration.md        # Step-by-step live demo walkthrough for faculty
│   ├── Project_Recreation_Guide.md     # Step-by-step guide to recreate from scratch
│   └── Project_Report.md              # Comprehensive project report
│
├── hardhat.config.js                   # Solidity ^0.8.20, Ganache localhost network
├── package.json                        # Root dependencies (Hardhat, OpenZeppelin, ethers)
├── .gitignore                          # Ignores node_modules, artifacts, cache, .env, dist
└── README.md                           # This file
```

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| **Node.js** | v18+ | [nodejs.org](https://nodejs.org/) |
| **MongoDB** | v6+ | [mongodb.com](https://www.mongodb.com/try/download/community) (or use MongoDB Atlas) |
| **MetaMask** | Latest | [metamask.io](https://metamask.io/) |
| **Ganache** | Latest | Bundled as npm dependency |
| **Git** | v2+ | [git-scm.com](https://git-scm.com/) |

### Step 1: Clone & Install Root Dependencies

```bash
git clone <repository-url>
cd EthSecure-Health
npm install
```

### Step 2: Compile & Test Smart Contracts

```bash
# Compile Solidity contracts
npx hardhat compile

# Run the full test suite (14 test cases)
npx hardhat test
```

### Step 3: Start Ganache (Local Blockchain)

Open a **separate terminal** and start Ganache:

```bash
npx ganache --port 8545
```

> ⚠️ Keep this terminal running. Note the private keys printed — you'll import these into MetaMask.

### Step 4: Deploy Smart Contracts

```bash
npx hardhat run scripts/deploy.js --network localhost
```

This will:
- Deploy `EthSecureHealthAccess` and `EthSecureRecord`
- Assign demo roles (Admin, Doctor, Patient, Diagnostic Center)
- Register a demo patient ("John Doe") with 3 sample reports
- Save contract ABIs and addresses to `frontend/src/contracts/`

### Step 5: Setup & Start Backend

```bash
# Install backend dependencies
cd backend
npm install

# Create environment file
cp .env.example .env
# Edit .env and set your MongoDB URI:
#   MONGO_URI=mongodb://localhost:27017/ethsecure
#   PORT=5000

# Start the backend server
npm run dev
```

> Backend runs at `http://localhost:5000`

### Step 6: Setup & Start Frontend

Open a **new terminal**:

```bash
# Install frontend dependencies
cd frontend
npm install

# Create environment file (optional — needed for real IPFS uploads)
cp .env.example .env
# Edit .env and add Pinata API keys:
#   VITE_PINATA_API_KEY=your_pinata_api_key_here
#   VITE_PINATA_SECRET_KEY=your_pinata_secret_key_here

# Start the dev server
npm run dev
```

> Frontend runs at `http://localhost:5173`

### Step 7: Configure MetaMask

1. Open MetaMask and add a custom network:
   - **Network Name:** Ganache Local
   - **RPC URL:** `http://127.0.0.1:8545`
   - **Chain ID:** `1337`
   - **Currency:** ETH
2. Import Ganache accounts using private keys from the Ganache terminal
3. Navigate to `http://localhost:5173` and click **"Connect with MetaMask"**

---

## 🧪 Test Suite

The project includes **14 automated test cases** covering all critical functionality:

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

## 🔗 Backend API Reference

The Express.js backend runs on port `5000` and provides the following REST endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/register` | Register new user (patient/doctor) with profile data |
| `POST` | `/api/login` | Authenticate user via Unique ID + SHA-256 password hash |
| `GET` | `/api/profile/wallet/:address` | Get user profile by Ethereum wallet address |
| `GET` | `/api/profile/uid/:uniqueId` | Get user profile by Unique ID |
| `POST` | `/api/access/request` | Doctor sends access request to a patient |
| `GET` | `/api/access/requests/:address` | Get pending access requests for a patient |
| `POST` | `/api/access/approve` | Patient approves a doctor's access request |
| `POST` | `/api/access/reject` | Patient rejects (deletes) a doctor's access request |

---

## 🎨 UI Design System

The frontend uses a custom **glassmorphism dark-mode** design system built with TailwindCSS and vanilla CSS:

| Design Token | Value | Usage |
|-------|-------|-------|
| **Background** | `#060c1f` → `#0b1330` | Deep navy dark mode |
| **Brand** | `#3b82f6` (Blue) | Primary actions, patient theme |
| **Accent** | `#8b5cf6` (Purple) | Secondary actions, doctor theme |
| **Health** | `#10b981` (Emerald) | Success states, diagnostic theme |
| **Danger** | `#ef4444` (Red) | Destructive actions, errors |
| **Typography** | Inter (Google Fonts) | All text elements |

**Key CSS Features:**
- 🔮 Glassmorphism cards with `backdrop-filter: blur(20px)`
- 🌟 Animated gradient orbs in background
- ✨ Pulse-glow animations on CTAs
- 🎭 Staggered entrance animations
- 📱 Fully responsive grid system (4 → 2 → 1 columns)
- 🎨 Custom scrollbar, upload zones, status bars

---

## 🚀 Future Improvements

| # | Improvement | Description |
|---|-------------|-------------|
| 1 | **Production IPFS** | Connect real Pinata API keys for encrypted file uploads/downloads |
| 2 | **Multi-Hospital Support** | Allow multiple hospitals to register and manage their own doctors & diagnostic centers |
| 3 | **Emergency Access Protocol** | Time-locked emergency access for unconscious or incapacitated patients |
| 4 | **Notification System** | Email/push alerts when a doctor accesses records or new reports are uploaded |
| 5 | **ZK-Proof Verification** | Zero-knowledge proofs for verifying medical credentials without revealing identity |
| 6 | **Mainnet / Testnet Deployment** | Deploy to Sepolia or Polygon for real-world testing beyond local Ganache |
| 7 | **Mobile App (React Native)** | Cross-platform mobile app for patients to manage health records on the go |
| 8 | **AI-Powered Diagnostics** | Integrate ML models for preliminary diagnosis suggestions from uploaded reports |
| 9 | **Session Management** | JWT-based auth tokens with refresh & expiry for enhanced security |
| 10 | **Audit Log Dashboard** | Frontend view of on-chain events (AccessGranted, AccessRevoked, ReportAdded) |

---

## 📜 License

This project is licensed under the MIT License.
