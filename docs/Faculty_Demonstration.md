# 🧑‍🏫 EthSecure Health — Faculty Demonstration Guide

> A step-by-step walkthrough for **demonstrating the project live** to faculty evaluators. This guide covers setup, every demonstration scenario, and what to highlight at each step.

---

## 📋 Pre-Demo Setup Checklist

Complete these steps **before** the faculty arrives. The entire setup takes ~5 minutes if dependencies are already installed.

### Terminal 1: Start Ganache (Local Blockchain)

```bash
cd d:\EthSecure-Health--main
npx ganache --port 8545
```

**What to verify:** You should see 10 accounts with 1000 ETH each and their private keys printed. Copy Account #1 and #2 private keys — you'll need them for MetaMask.

### Terminal 2: Deploy Smart Contracts

```bash
cd d:\EthSecure-Health--main
npx hardhat compile
npx hardhat run scripts/deploy.js --network localhost
```

**What to verify:** You should see:
```
  ✅ Deployment Complete!
  AccessControl : 0x5FbDB2315678afecb367f032d93F642f64180aa3
  SecureRecord  : 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
  Admin         : 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
  Doctor        : 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
  Patient       : 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
  Diagnostic    : 0x90F79bf6EB2c4f870365E785982E1f101E93b906
```

### Terminal 3: Start Backend

```bash
cd d:\EthSecure-Health--main\backend
npm run dev
```

**What to verify:** Console shows:
```
✅ MongoDB connected
🚀 EthSecure Backend running on http://localhost:5000
```

> ⚠️ **MongoDB must be running** — either locally (`mongod`) or via MongoDB Atlas cloud. Check `backend/.env` for the connection string.

### Terminal 4: Start Frontend

```bash
cd d:\EthSecure-Health--main\frontend
npm run dev
```

**What to verify:** Console shows:
```
  VITE v8.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

### MetaMask Setup

1. Open MetaMask browser extension
2. Add network → **Custom RPC**:
   - Network Name: `Ganache`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `1337`
   - Currency Symbol: `ETH`
3. Import **two** accounts using private keys from the Ganache terminal:
   - **Account for Patient** — use any Ganache account (e.g., Account #4)
   - **Account for Doctor** — use a different Ganache account (e.g., Account #5)

> 💡 **Tip:** Use accounts that are NOT the first 4 (those are used by the deploy script for demo data). Using Account #4 onward ensures a fresh demonstration.

### Browser Setup

- Open `http://localhost:5173` in Chrome/Brave (MetaMask must be installed)
- Keep the browser tab visible for the faculty

---

## 🎬 Demonstration Scenarios

### Scenario Overview

| # | Scenario | Duration | What It Proves |
|---|----------|----------|----------------|
| 1 | Landing Page Walkthrough | 1 min | Premium UI, professional design |
| 2 | Patient Registration | 3 min | On-chain registration + MongoDB profile storage |
| 3 | Upload Prescription | 2 min | AES-256 encryption + IPFS upload + blockchain storage |
| 4 | Doctor Registration | 2 min | Role-based self-registration |
| 5 | Doctor Requests Access | 2 min | Off-chain access request workflow |
| 6 | Patient Approves Access | 2 min | On-chain access grant |
| 7 | Doctor Views Patient Records | 2 min | Authorized access to medical reports |
| 8 | Patient Revokes Access | 2 min | Instant on-chain revocation |
| 9 | Doctor Blocked After Revocation | 1 min | Smart contract security enforcement |
| 10 | Run Test Suite | 2 min | 14 automated tests passing |
| **Total** | | **~19 min** | |

---

## 🔷 Scenario 1: Landing Page Walkthrough

**Goal:** Show the faculty the premium UI design and explain the system overview.

### Steps:

1. Open `http://localhost:5173` in the browser
2. Point out the visual design elements:
   - **Glassmorphism cards** with backdrop blur effect
   - **Animated gradient orbs** floating in the background
   - **Hover animations** on the feature cards
   - **Custom dark-mode color palette** (deep navy background, blue/purple accents)

### What to say:

> "This is our landing page. Notice the modern glassmorphism design with animated background orbs and smooth hover effects. The three cards highlight the core security features:"
> - 🔐 **End-to-End Encryption** — AES-256 encryption happens in the browser before data leaves
> - ⛓️ **Blockchain Auditable** — Every access/revocation is permanently on-chain
> - 👨‍⚕️ **Doctor Access Control** — Patients decide exactly who sees their data

### What to highlight to faculty:

- "The entire UI is built with React, custom CSS using glassmorphism design, with Inter font from Google Fonts"
- "No template was used — every component was designed and coded from scratch"

---

## 🔷 Scenario 2: Patient Registration

**Goal:** Demonstrate the blockchain registration + MongoDB profile creation.

### Steps:

1. Click **"🦊 Connect with MetaMask"** on the landing page
2. MetaMask popup appears → Click **Connect** → Approve the connection
3. You'll see the **Role Selection** screen → Click **"I'm a Patient"**
4. Click **"📝 Register"**
5. Fill in the registration form:

   | Field | Sample Value |
   |-------|-------------|
   | Full Name | Rahul Sharma |
   | Date of Birth | 2000-05-15 |
   | Gender | Male |
   | Blood Type | B+ |
   | Phone | +91 98765 43210 |
   | Email | rahul@example.com |
   | Street | 42 MG Road |
   | City | Mumbai |
   | State | Maharashtra |
   | Emergency Contact Name | Priya Sharma |
   | Emergency Contact Phone | +91 98765 43211 |
   | **Unique ID** | **PAT-RAHUL01** |
   | **Password** | **demo123** |
   | Confirm Password | demo123 |

6. Click **"📝 Register as Patient"**
7. **Two MetaMask popups will appear** — confirm both:
   - First: `selfRegisterAsPatient()` — assigns PATIENT_ROLE on-chain
   - Second: `registerPatient(ipfsHash)` — stores demographic CID on-chain

### What to highlight to faculty:

- "Notice the two separate blockchain transactions. The first assigns the Patient role via OpenZeppelin's AccessControl, and the second registers the patient with an encrypted demographic hash."
- "Simultaneously, the user's profile data — name, blood type, contact info — is stored in MongoDB with a SHA-256 hashed password. The backend never sees the plaintext password."
- "The Unique ID (PAT-RAHUL01) acts as a human-readable identifier for the access request system."

### What to verify:

- ✅ Green status bar shows "Registered successfully!"
- ✅ Patient Dashboard appears with the Profile tab showing all entered data
- ✅ Wallet address shown in the navbar badge

---

## 🔷 Scenario 3: Upload Prescription

**Goal:** Demonstrate client-side encryption and blockchain storage.

### Steps:

1. On the Patient Dashboard, click the **"📤 Upload Rx"** tab
2. Click the upload zone (or drag-and-drop a PDF/image file)
3. Fill in metadata:

   | Field | Value |
   |-------|-------|
   | Doctor Name | Dr. Ananya Gupta |
   | Date | today's date |
   | Medication / Notes | Amoxicillin 500mg, Twice daily for 7 days |

4. Click **"📤 Upload to Blockchain"**
5. A password modal appears → Enter: `demo123` (this is the AES-256 encryption key)
6. Confirm the MetaMask transaction

### What to highlight to faculty:

> "The file is encrypted using AES-256 BEFORE leaving the browser. The encryption key is the patient's password. The encrypted blob is uploaded to IPFS, and only the CID hash is stored on the Ethereum blockchain."

> "If we switch to the Records tab, you can see the new report with its IPFS CID, report type 'Prescription', and the timestamp."

> "Clicking 'View Record' will prompt for the decryption password, retrieve the encrypted blob from IPFS, decrypt it locally, and display the original file."

### What to verify:

- ✅ Status bar shows "Prescription uploaded! CID: QmXXX..."
- ✅ Record appears in the Records tab with correct metadata

> ⚠️ **Note:** If Pinata API keys are not configured in `frontend/.env`, the IPFS upload will fail. For demo purposes, the system still stores a generated CID on-chain to demonstrate the flow.

---

## 🔷 Scenario 4: Doctor Registration

**Goal:** Show role-based registration for a different user type.

### Steps:

1. Click **"Logout"** in the navbar
2. Open MetaMask → **Switch to the Doctor account** (the second imported account)
3. On the landing page, click **"🦊 Connect with MetaMask"**
4. Choose **"I'm a Doctor"** → Click **"📝 Register"**
5. Fill in the doctor registration form:

   | Field | Sample Value |
   |-------|-------------|
   | Full Name | Dr. Ananya Gupta |
   | Phone | +91 99887 76655 |
   | Email | dr.ananya@hospital.com |
   | Gender | Female |
   | Specialization | Cardiology |
   | Hospital / Clinic | Apollo Hospital |
   | License No. | MED-KA-20198 |
   | Years of Experience | 8 |
   | Languages Spoken | English, Hindi, Kannada |
   | **Unique ID** | **DOC-ANANYA01** |
   | **Password** | **doc123** |
   | Confirm Password | doc123 |

6. Click **"📝 Register as Doctor"**
7. Confirm the MetaMask transaction (`selfRegisterAsDoctor()`)

### What to highlight to faculty:

- "Notice the form has doctor-specific fields — specialization, hospital, license number, experience. These are stored in MongoDB."
- "The registration calls `selfRegisterAsDoctor()` which assigns the DOCTOR_ROLE via OpenZeppelin's AccessControl."
- "The Doctor Dashboard has different tabs: Profile, Request Access, Search Patient, and Add Report."

### What to verify:

- ✅ Doctor Dashboard appears with profile showing specialization badge and hospital badge
- ✅ Status bar shows registration success

---

## 🔷 Scenario 5: Doctor Requests Patient Access

**Goal:** Demonstrate the off-chain access request workflow.

### Steps:

1. On the Doctor Dashboard, click the **"🔓 Request Access"** tab
2. Enter the patient's Unique ID: **PAT-RAHUL01**
3. Click **"🔓 Request Access"**

### What to highlight to faculty:

> "The doctor enters the patient's Unique ID — not their wallet address. The backend resolves the Unique ID to the wallet address stored in MongoDB."

> "This request is stored in MongoDB with status 'pending'. The patient has NOT yet been granted access on-chain — this is just a notification."

> "Let me show you: if the doctor tries to search for this patient's records right now in the 'Search Patient' tab, they'll see an 'Access Required' message because the on-chain `checkAccess()` returns false."

### What to verify:

- ✅ Status bar shows "Access request sent to Rahul Sharma!"
- ✅ Searching for PAT-RAHUL01 in "Search Patient" tab shows "🔒 Access Required"

---

## 🔷 Scenario 6: Patient Approves the Access Request

**Goal:** Demonstrate the combined on-chain + off-chain approval.

### Steps:

1. Click **"Logout"** from the Doctor Dashboard
2. Switch MetaMask back to the **Patient account**
3. Click **"🦊 Connect with MetaMask"** → Choose **"Patient"** → Click **"Login"**
4. Enter Unique ID: **PAT-RAHUL01** and Password: **demo123** → Click **Login**
5. Navigate to the **"🔐 Access"** tab
6. You should see the pending request from Dr. Ananya Gupta
7. Click **"✅ Approve"**
8. Confirm the MetaMask transaction (`grantAccess(doctorAddress)`)

### What to highlight to faculty:

> "The patient sees the doctor's name, their Unique ID, and their wallet address in the pending request."

> "When the patient clicks 'Approve', TWO things happen simultaneously:"
> 1. "**On-chain:** The `grantAccess(doctorAddress)` function is called on the smart contract, setting `doctorAccess[patient][doctor] = true`"
> 2. "**Off-chain:** The backend API updates the access request status to 'approved' in MongoDB"

> "The doctor now appears in the 'Active Access' section below, with a 'Revoke' button."

### What to verify:

- ✅ Pending request disappears after approval
- ✅ Doctor's address appears in "Active Access" section
- ✅ MetaMask transaction confirmed

---

## 🔷 Scenario 7: Doctor Views Patient Records

**Goal:** Prove that authorized access works end-to-end.

### Steps:

1. **Logout** from Patient Dashboard
2. Switch MetaMask to the **Doctor account**
3. Connect → Choose **Doctor** → **Login** with DOC-ANANYA01 / doc123
4. Go to the **"🔍 Search Patient"** tab
5. Enter: **PAT-RAHUL01**
6. Click **"🔍 Search"**

### What to highlight to faculty:

> "Now the doctor CAN see the patient's records. The smart contract's `checkAccess()` returns **true**, so `getPatientMedicalReports()` returns the full array of reports."

> "Each report card shows:"
> - "Report type (badge: 'Prescription', 'Blood Test', etc.)"
> - "Unique report ID"
> - "IPFS CID (the encrypted data address)"
> - "Timestamp of when it was uploaded"
> - "Address of who uploaded it"
> - "'View Record' button to decrypt and display the file"

> "The doctor can also add a new report from the 'Add Report' tab — let me demonstrate..."

### Optional: Doctor Adds a Report

1. Go to **"📄 Add Report"** tab
2. Enter Patient ID: **PAT-RAHUL01**
3. Select Report Type: **Blood Test**
4. Add Notes: "CBC — Normal range"
5. Click **"📄 Submit Report"**
6. Enter encryption key when prompted
7. Confirm MetaMask transaction

### What to verify:

- ✅ Patient reports are visible with correct data
- ✅ "View Record" button triggers the decryption modal
- ✅ If adding a report, it appears in both doctor and patient dashboards

---

## 🔷 Scenario 8: Patient Revokes Doctor Access

**Goal:** Demonstrate the critical security feature — instant revocation.

### Steps:

1. **Logout** from Doctor Dashboard
2. Switch MetaMask to **Patient account**
3. Login as PAT-RAHUL01
4. Go to the **"🔐 Access"** tab
5. Find Dr. Ananya's address in "Active Access"
6. Click **"Revoke"**
7. Confirm the MetaMask transaction (`revokeAccess(doctorAddress)`)

### What to highlight to faculty:

> "This is the most powerful security feature. When the patient clicks 'Revoke', the smart contract immediately sets `doctorAccess[patient][doctor] = false`. This is not a UI change — it's an immutable on-chain state change."

> "An `AccessRevoked` event is permanently emitted to the blockchain, creating an undeniable audit trail with the exact timestamp."

> "From this moment forward, the doctor's wallet address is mathematically blocked from calling `getPatientMedicalReports()` or `addMedicalReport()` for this patient."

### What to verify:

- ✅ Doctor's address disappears from "Active Access"
- ✅ Status bar shows "Access revoked."
- ✅ MetaMask shows the confirmed revocation transaction

---

## 🔷 Scenario 9: Verify Doctor is Blocked

**Goal:** Prove that revocation actually works at the smart contract level.

### Steps:

1. **Logout** from Patient Dashboard
2. Switch MetaMask to **Doctor account**
3. Login as DOC-ANANYA01
4. Go to **"🔍 Search Patient"** tab
5. Search for **PAT-RAHUL01** again

### What to highlight to faculty:

> "Watch what happens now. The same search that worked 2 minutes ago now shows '🔒 Access Required'. The smart contract's `checkAccess()` now returns **false**."

> "The doctor can no longer view records, add reports, or interact with this patient's data in any way. This is enforced at the blockchain level — not by our frontend, not by our backend — by Ethereum consensus itself."

> "This is exactly why we use blockchain. No hospital admin, no rogue employee, no hacker can override this revocation without the patient's explicit wallet signature."

### What to verify:

- ✅ "🔒 Access Required" screen appears
- ✅ No records are shown
- ✅ The UI displays the correct patient name with an explanation to use "Request Access" tab

---

## 🔷 Scenario 10: Run the Test Suite

**Goal:** Show automated testing and 100% pass rate.

### Steps:

1. Open a terminal
2. Run:
   ```bash
   cd d:\EthSecure-Health--main
   npx hardhat test
   ```

### What to highlight to faculty:

> "We have 14 automated test cases covering registration, access control, medical reports, and revocation security."

> "Notice how each test uses different simulated wallets — owner, doctor, doctor2, diagnostic, patient, unauthorized. The `beforeEach` block deploys fresh contracts before every test, ensuring complete isolation."

> "All 14 tests pass, validating that:"
> - "Unauthorized users cannot register"
> - "Non-doctors cannot be granted access"
> - "Unauthorized doctors cannot view records"
> - "Revoked doctors are completely blocked"

### What to verify:

- ✅ Output shows "14 passing" in green
- ✅ No failures or warnings

---

## 🛠️ Troubleshooting During Demo

| Problem | Solution |
|---------|----------|
| MetaMask not connecting | Ensure MetaMask is on the Ganache network (Chain ID: 1337). Try resetting the account in MetaMask → Settings → Advanced → Reset Account |
| "Nonce too high" error | Reset MetaMask account (Settings → Advanced → Reset Account). Ganache was restarted but MetaMask has stale nonce |
| Backend "MongoDB connection error" | Ensure MongoDB is running. Check `backend/.env` for correct MONGO_URI |
| "Caller is not a patient" error | You're using a wallet that hasn't been assigned the Patient role. Use a fresh account and register |
| Frontend shows blank page | Check browser console for errors. Ensure `frontend/src/contracts/deployment.json` exists (run deploy script first) |
| IPFS upload fails | Pinata API keys not configured. This is expected for local demo — the CID generation still works for demonstration |
| Test suite fails | Ensure you ran `npx hardhat compile` first. If tests still fail, run `npx ganache --port 8545` in a separate terminal |

---

## 💡 Tips for a Successful Faculty Demo

1. **Pre-register one account** before the faculty arrives so the Profile tab has data ready to show
2. **Keep all 4 terminals visible** (Ganache, Deploy, Backend, Frontend) — faculty may ask to see them
3. **Practice the MetaMask account switching** — it's the trickiest part of the live demo
4. **Have the test output ready** in a separate terminal — you can show it without restarting anything
5. **Know the Ganache account addresses** — have a notepad with Account #4 = Patient, Account #5 = Doctor
6. **Don't rush the revocation demo** — it's the most impressive security feature; explain it slowly
7. **If something breaks**, explain why — "This is expected because the smart contract is blocking unauthorized access" turns errors into demonstrations

---

## 📊 Key Numbers to Mention

| Metric | Value |
|--------|-------|
| Smart Contract Lines | ~337 lines (90 + 247) |
| Frontend Lines | ~924 lines (App.jsx) + 722 lines (CSS) |
| Backend Lines | ~156 lines (server.js) + 41 lines (models) |
| Test Cases | 14 automated tests |
| Total Dependencies | 18 packages across root, frontend, and backend |
| Roles Supported | 4 (Admin, Patient, Doctor, Diagnostic Center) |
| API Endpoints | 8 REST endpoints |
| Report Types | 8 (Blood Test, MRI, X-Ray, CT, Ultrasound, ECG, Prescription, Consultancy) |
| Encryption Standard | AES-256 (same as US military & banking) |
| Solidity Version | ^0.8.20 |

---

*Follow this guide step-by-step for a flawless faculty demonstration. The key is to demonstrate the access → revoke → blocked workflow, which powerfully shows why blockchain is the right choice for healthcare data.*
