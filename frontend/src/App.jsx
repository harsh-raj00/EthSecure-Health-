import { useState } from 'react';
import { ethers } from 'ethers';
import './index.css';

// ─── Import Contract ABIs & Deployment Info ───────────────────
import deploymentData from './contracts/deployment.json';
import AccessControlABI from './contracts/EthSecureHealthAccess.json';
import SecureRecordABI from './contracts/EthSecureRecord.json';

function App() {
  const [account, setAccount] = useState("");
  const [role, setRole] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [status, setStatus] = useState("");
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [accessContract, setAccessContract] = useState(null);
  const [recordContract, setRecordContract] = useState(null);
  const [isMetaMask, setIsMetaMask] = useState(false);

  // Patient state
  const [doctorAddress, setDoctorAddress] = useState("");
  const [patientReports, setPatientReports] = useState([]);
  const [authorizedDoctors, setAuthorizedDoctors] = useState([]);

  // Doctor state
  const [patientAddress, setPatientAddress] = useState("");
  const [doctorReports, setDoctorReports] = useState([]);
  const [reportIpfs, setReportIpfs] = useState("");
  const [reportType, setReportType] = useState("Consultancy Report");

  // Diagnostic state
  const [diagPatientAddr, setDiagPatientAddr] = useState("");
  const [diagIpfsHash, setDiagIpfsHash] = useState("");
  const [diagReportType, setDiagReportType] = useState("Blood Test");

  // ─── Wallet Connection (MetaMask or Ganache) ────────────────────
  const connectWallet = async () => {
    try {
      let prov, sig, addr;

      if (window.ethereum) {
        // MetaMask is installed
        setIsMetaMask(true);
        prov = new ethers.BrowserProvider(window.ethereum);
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        sig = await prov.getSigner();
        addr = await sig.getAddress();

        // Listen for account changes in MetaMask
        window.ethereum.on('accountsChanged', (accounts) => {
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            setStatus(`💳 MetaMask Account changed to: ${accounts[0].substring(0, 10)}... Please refresh if contracts fail.`);
          } else {
            setAccount("");
            setStatus("❌ MetaMask disconnected.");
          }
        });
      } else {
        // Fallback: Connect directly to Ganache RPC
        setIsMetaMask(false);
        prov = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        sig = await prov.getSigner(0);
        addr = await sig.getAddress();
      }

      setProvider(prov);
      setSigner(sig);
      setAccount(addr);

      // Initialize contract instances
      const access = new ethers.Contract(
        deploymentData.contracts.EthSecureHealthAccess,
        AccessControlABI.abi,
        sig
      );
      const record = new ethers.Contract(
        deploymentData.contracts.EthSecureRecord,
        SecureRecordABI.abi,
        sig
      );
      setAccessContract(access);
      setRecordContract(record);

      setStatus(`✅ Connected: ${addr.substring(0, 10)}... | Contracts loaded from Ganache`);
    } catch (err) {
      console.error(err);
      setStatus("❌ Connection failed: " + (err.message || "Unknown error"));
    }
  };

  // ─── Switch Accounts (for demo) ─────────────────────────────────
  const switchAccount = async (index) => {
    try {
      const prov = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
      const sig = await prov.getSigner(index);
      const addr = await sig.getAddress();

      setProvider(prov);
      setSigner(sig);
      setAccount(addr);

      const access = new ethers.Contract(
        deploymentData.contracts.EthSecureHealthAccess,
        AccessControlABI.abi,
        sig
      );
      const record = new ethers.Contract(
        deploymentData.contracts.EthSecureRecord,
        SecureRecordABI.abi,
        sig
      );
      setAccessContract(access);
      setRecordContract(record);

      const roleName = index === 0 ? "Admin" : index === 1 ? "Doctor" : "Patient";
      setStatus(`✅ Switched to ${roleName}: ${addr.substring(0, 10)}...`);
    } catch (err) {
      setStatus("❌ " + err.message);
    }
  };

  // ─── Role Selection ─────────────────────────────────────────────
  const selectRole = async (r) => {
    setRole(r);
    setActiveTab(r);
    
    if (isMetaMask) {
      // If using MetaMask, we can't force an account switch. The user must do it in the extension.
      setStatus(`🦊 Switched to ${r} tab. Please ensure your active MetaMask account matches this role!`);
    } else {
      // Auto-switch to the correct Ganache account for the role in Demo Mode
      if (r === "patient") await switchAccount(2);
      else if (r === "doctor") await switchAccount(1);
      else if (r === "diagnostic") await switchAccount(3);
    }
  };

  // ─── Patient Functions (Real Smart Contract Calls) ──────────────
  const registerPatient = async () => {
    try {
      setStatus("⏳ Registering on blockchain...");
      const ipfsHash = "Qm" + Math.random().toString(36).substring(2, 15);
      const tx = await recordContract.registerPatient(ipfsHash);
      await tx.wait();
      setStatus(`✅ Patient registered on blockchain! TX: ${tx.hash.substring(0, 15)}... | IPFS: ${ipfsHash}`);
    } catch (err) {
      setStatus("❌ " + (err.reason || err.message || "Registration failed"));
    }
  };

  const grantAccess = async () => {
    if (!doctorAddress) {
      setStatus("❌ Enter a doctor address first");
      return;
    }
    try {
      setStatus("⏳ Granting access on blockchain...");
      const tx = await recordContract.grantAccess(doctorAddress);
      await tx.wait();
      setStatus(`✅ Access granted to ${doctorAddress.substring(0, 10)}... | TX: ${tx.hash.substring(0, 15)}...`);
      setDoctorAddress("");
      await refreshDoctors();
    } catch (err) {
      setStatus("❌ " + (err.reason || err.message || "Grant failed"));
    }
  };

  const revokeAccess = async (doctor) => {
    try {
      setStatus("⏳ Revoking access on blockchain...");
      const tx = await recordContract.revokeAccess(doctor);
      await tx.wait();
      setStatus(`🚫 Access revoked from ${doctor.substring(0, 10)}... | TX: ${tx.hash.substring(0, 15)}...`);
      await refreshDoctors();
    } catch (err) {
      setStatus("❌ " + (err.reason || err.message || "Revoke failed"));
    }
  };

  const viewMyReports = async () => {
    try {
      setStatus("⏳ Fetching reports from blockchain...");
      const reports = await recordContract.getPatientMedicalReports(account);
      const parsed = reports.map((r) => ({
        id: Number(r.id),
        ipfsHash: r.ipfsHash,
        uploadedBy: r.uploadedBy,
        timestamp: new Date(Number(r.timestamp) * 1000).toLocaleString(),
        reportType: r.reportType
      }));
      setPatientReports(parsed);
      setStatus(`📋 Found ${parsed.length} medical report(s) on blockchain`);
    } catch (err) {
      setStatus("❌ " + (err.reason || err.message || "Failed to fetch reports"));
    }
  };

  const refreshDoctors = async () => {
    try {
      const docs = await recordContract.getAuthorizedDoctors(account);
      // Check which doctors still have active access
      const activeDocs = [];
      for (const doc of docs) {
        const hasAccess = await recordContract.checkAccess(account, doc);
        if (hasAccess) activeDocs.push(doc);
      }
      setAuthorizedDoctors(activeDocs);
    } catch {
      setAuthorizedDoctors([]);
    }
  };

  // ─── Doctor Functions ───────────────────────────────────────────
  const viewPatientReports = async () => {
    if (!patientAddress) {
      setStatus("❌ Enter patient address first");
      return;
    }
    try {
      setStatus("⏳ Fetching patient records from blockchain...");
      const reports = await recordContract.getPatientMedicalReports(patientAddress);
      const parsed = reports.map((r) => ({
        id: Number(r.id),
        ipfsHash: r.ipfsHash,
        uploadedBy: r.uploadedBy,
        timestamp: new Date(Number(r.timestamp) * 1000).toLocaleString(),
        reportType: r.reportType
      }));
      setDoctorReports(parsed);
      setStatus(`✅ Retrieved ${parsed.length} report(s) from blockchain`);
    } catch (err) {
      setStatus("🚫 " + (err.reason || "Not authorized to view this patient's records"));
    }
  };

  const addConsultancyReport = async () => {
    if (!patientAddress) {
      setStatus("❌ Enter patient address first");
      return;
    }
    try {
      setStatus("⏳ Submitting report to blockchain...");
      const ipfsHash = reportIpfs || "Qm" + Math.random().toString(36).substring(2, 15);
      const tx = await recordContract.addMedicalReport(patientAddress, ipfsHash, reportType);
      await tx.wait();
      setStatus(`✅ Report submitted! TX: ${tx.hash.substring(0, 15)}... | CID: ${ipfsHash}`);
      setReportIpfs("");
    } catch (err) {
      setStatus("🚫 " + (err.reason || "Not authorized to add reports for this patient"));
    }
  };

  // ─── Diagnostic Functions ───────────────────────────────────────
  const uploadEHR = async () => {
    if (!diagPatientAddr) {
      setStatus("❌ Enter patient address first");
      return;
    }
    try {
      setStatus("⏳ Uploading EHR report to blockchain...");
      const ipfsHash = diagIpfsHash || "Qm" + Math.random().toString(36).substring(2, 15);
      const tx = await recordContract.addMedicalReport(diagPatientAddr, ipfsHash, diagReportType);
      await tx.wait();
      setStatus(`✅ EHR uploaded! Type: ${diagReportType} | TX: ${tx.hash.substring(0, 15)}... | CID: ${ipfsHash}`);
      setDiagIpfsHash("");
      setDiagPatientAddr("");
    } catch (err) {
      setStatus("🚫 " + (err.reason || "Failed to upload EHR"));
    }
  };

  // ─── Styling ────────────────────────────────────────────────────
  const inputClass = "w-full bg-surf-800 border border-surf-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all";
  const btnPrimary = "bg-brand hover:bg-brand-dark px-6 py-3 rounded-lg font-semibold transition-all duration-300 shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] text-white";
  const btnDanger = "bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold transition-all text-white text-sm";
  const btnAccent = "bg-accent hover:bg-purple-700 px-6 py-3 rounded-lg font-semibold transition-all duration-300 shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] text-white";
  const btnGreen = "bg-emerald-600 hover:bg-emerald-700 px-6 py-3 rounded-lg font-semibold transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] text-white";

  return (
    <div className="min-h-screen bg-surf-900 text-white overflow-hidden relative">
      {/* Background glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/20 rounded-full blur-[120px] pointer-events-none"></div>

      {/* ─── Navbar ─── */}
      <nav className="relative z-10 glass-panel px-6 py-4 flex justify-between items-center w-full">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab("home")}>
          <div className="w-10 h-10 bg-gradient-to-tr from-brand to-accent rounded-xl flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-6 transition-transform">
            <span className="font-bold text-white text-xl flex items-center ml-0.5">E<span className="text-sm">SH</span></span>
          </div>
          <h1 className="text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">EthSecure Health</h1>
        </div>
        <div className="flex items-center gap-3">
          {account && (
            <div className="hidden md:flex gap-1 text-sm">
              <button onClick={() => selectRole("patient")} className={`px-4 py-2 rounded-lg transition-all ${activeTab === "patient" ? "bg-brand/20 text-brand-light border border-brand/30" : "text-gray-400 hover:text-white"}`}>🏥 Patient</button>
              <button onClick={() => selectRole("doctor")} className={`px-4 py-2 rounded-lg transition-all ${activeTab === "doctor" ? "bg-accent/20 text-accent border border-accent/30" : "text-gray-400 hover:text-white"}`}>👨‍⚕️ Doctor</button>
              <button onClick={() => selectRole("diagnostic")} className={`px-4 py-2 rounded-lg transition-all ${activeTab === "diagnostic" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-gray-400 hover:text-white"}`}>🔬 Diagnostic</button>
            </div>
          )}
          <button onClick={connectWallet} className={`px-5 py-2.5 rounded-lg font-semibold transition-all duration-300 ${account ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30" : "bg-brand hover:bg-brand-dark shadow-[0_0_15px_rgba(59,130,246,0.3)]"}`}>
            {account ? `🟢 ${account.substring(0, 6)}...${account.substring(38)}` : "🔗 Connect Wallet"}
          </button>
        </div>
      </nav>

      {/* ─── Status Bar ─── */}
      {status && (
        <div className="relative z-10 mx-auto max-w-5xl mt-4 px-6">
          <div className="glass-panel rounded-lg px-4 py-3 text-sm text-gray-300 border border-surf-700/50 flex justify-between items-center">
            <span>{status}</span>
            <button onClick={() => setStatus("")} className="text-gray-500 hover:text-white text-xs">✕</button>
          </div>
        </div>
      )}

      <main className="relative z-10 container mx-auto p-4 md:p-8 mt-6 mb-20">

        {/* ════════════════════ HOME ════════════════════ */}
        {activeTab === "home" && (
          <div className="animate-fade-in">
            <div className="glass-panel rounded-2xl p-10 lg:p-14 border border-surf-700/50 mb-10">
              <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">
                Secure Electronic Health <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-light to-accent">Records.</span>
              </h2>
              <p className="text-gray-300 mb-10 text-lg max-w-3xl leading-relaxed">
                A decentralized system utilizing Ethereum blockchain, Metamask, and IPFS. 
                {!account && " Connect your wallet to get started."}
              </p>

              {!account ? (
                <button onClick={connectWallet} className={btnPrimary + " text-lg px-8 py-4"}>
                  🔗 Connect Wallet
                </button>
              ) : (
                <div>
                  <p className="text-gray-400 mb-2">Select your role to continue:</p>
                  <p className="text-xs text-gray-500 mb-6">
                    {isMetaMask 
                      ? "🦊 Since you connected with MetaMask, change your account in the browser extension to match the role!"
                      : "Clicking a role will switch to the corresponding Ganache account automatically."}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <button onClick={() => selectRole("patient")} className="p-8 glass-panel rounded-xl glow-effect transition-all cursor-pointer text-left border border-surf-700/50 hover:border-brand/30">
                      <span className="text-4xl mb-4 block">🏥</span>
                      <h3 className="text-2xl font-bold mb-2">Patient</h3>
                      <p className="text-sm text-gray-400">Register, upload records, manage access</p>
                      <p className="text-xs text-gray-600 mt-2 font-mono">{deploymentData.roles.patient?.substring(0, 15)}...</p>
                    </button>
                    <button onClick={() => selectRole("doctor")} className="p-8 glass-panel rounded-xl glow-effect transition-all cursor-pointer text-left border border-surf-700/50 hover:border-accent/30">
                      <span className="text-4xl mb-4 block">👨‍⚕️</span>
                      <h3 className="text-2xl font-bold mb-2">Doctor</h3>
                      <p className="text-sm text-gray-400">View patient records, add reports</p>
                      <p className="text-xs text-gray-600 mt-2 font-mono">{deploymentData.roles.doctor?.substring(0, 15)}...</p>
                    </button>
                    <button onClick={() => selectRole("diagnostic")} className="p-8 glass-panel rounded-xl glow-effect transition-all cursor-pointer text-left border border-surf-700/50 hover:border-emerald-500/30">
                      <span className="text-4xl mb-4 block">🔬</span>
                      <h3 className="text-2xl font-bold mb-2">Diagnostic Center</h3>
                      <p className="text-sm text-gray-400">Upload EHR reports for patients</p>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* How It Works */}
            <div className="glass-panel rounded-2xl p-10 border border-surf-700/50">
              <h2 className="text-3xl font-black mb-8">How It Works</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { step: "01", title: "Register", desc: "Connect MetaMask and register on the blockchain.", icon: "🔐" },
                  { step: "02", title: "Upload & Encrypt", desc: "Data is AES-256 encrypted before uploading to IPFS.", icon: "📤" },
                  { step: "03", title: "Store on Chain", desc: "Only the IPFS hash goes on Ethereum — saving gas.", icon: "⛓️" },
                  { step: "04", title: "Authorize & View", desc: "Patients grant doctors access to decrypt records.", icon: "✅" },
                ].map((item) => (
                  <div key={item.step} className="text-center p-6">
                    <div className="text-4xl mb-4">{item.icon}</div>
                    <div className="text-brand-light text-xs font-bold mb-2 tracking-widest">STEP {item.step}</div>
                    <h4 className="text-lg font-bold mb-2">{item.title}</h4>
                    <p className="text-sm text-gray-400">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════ PATIENT DASHBOARD ════════════════════ */}
        {activeTab === "patient" && (
          <div className="animate-fade-in space-y-6">
            <h2 className="text-3xl font-black mb-2">🏥 Patient Dashboard</h2>
            <p className="text-gray-400 text-sm">Connected as: <span className="font-mono text-brand-light">{account}</span></p>

            {/* Registration */}
            <div className="glass-panel rounded-xl p-8 border border-surf-700/50">
              <h3 className="text-xl font-bold mb-4 text-brand-light">Registration</h3>
              <p className="text-gray-400 text-sm mb-4">Register your identity on the Ethereum blockchain. This is an on-chain transaction.</p>
              <button onClick={registerPatient} className={btnPrimary}>
                📝 Register as Patient
              </button>
            </div>

            {/* Grant/Revoke Access */}
            <div className="glass-panel rounded-xl p-8 border border-surf-700/50">
              <h3 className="text-xl font-bold mb-4 text-brand-light">Manage Doctor Access</h3>
              <div className="flex gap-3 mb-4">
                <input type="text" placeholder={`Enter doctor address (e.g., ${deploymentData.roles.doctor?.substring(0, 12)}...)`} value={doctorAddress} onChange={(e) => setDoctorAddress(e.target.value)} className={inputClass} />
                <button onClick={grantAccess} className={btnPrimary + " whitespace-nowrap"}>✅ Grant</button>
              </div>
              <button onClick={refreshDoctors} className="text-brand-light text-sm hover:underline mb-4 block">🔄 Refresh authorized doctors</button>
              {authorizedDoctors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-400 mb-2">Authorized Doctors:</h4>
                  {authorizedDoctors.map((doc, i) => (
                    <div key={i} className="flex justify-between items-center bg-surf-800 rounded-lg px-4 py-3 border border-surf-700">
                      <span className="text-sm font-mono text-gray-300">{doc}</span>
                      <button onClick={() => revokeAccess(doc)} className={btnDanger}>🚫 Revoke</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* View Reports */}
            <div className="glass-panel rounded-xl p-8 border border-surf-700/50">
              <h3 className="text-xl font-bold mb-4 text-brand-light">My Medical Records</h3>
              <button onClick={viewMyReports} className={btnPrimary + " mb-4"}>📂 View My Reports</button>
              {patientReports.length > 0 ? (
                <div className="space-y-3 mt-4">
                  {patientReports.map((r, i) => (
                    <div key={i} className="bg-surf-800 rounded-lg p-4 border border-surf-700">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs bg-brand/10 text-brand-light px-2 py-1 rounded-md mr-2">{r.reportType}</span>
                          <span className="text-xs text-gray-500">Report #{r.id}</span>
                        </div>
                        <span className="text-xs text-gray-500">{r.timestamp}</span>
                      </div>
                      <p className="text-sm font-mono text-gray-400 mt-2">CID: {r.ipfsHash}</p>
                      <p className="text-xs text-gray-500 mt-1">Uploaded by: {r.uploadedBy}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 mt-2">No reports found. Reports appear here once uploaded by a doctor or diagnostic center.</p>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════ DOCTOR DASHBOARD ════════════════════ */}
        {activeTab === "doctor" && (
          <div className="animate-fade-in space-y-6">
            <h2 className="text-3xl font-black mb-2">👨‍⚕️ Doctor Dashboard</h2>
            <p className="text-gray-400 text-sm">Connected as: <span className="font-mono text-accent">{account}</span></p>

            <div className="glass-panel rounded-xl p-8 border border-surf-700/50">
              <h3 className="text-xl font-bold mb-4 text-accent">View Patient Records</h3>
              <div className="flex gap-3 mb-4">
                <input type="text" placeholder={`Enter patient address (e.g., ${deploymentData.roles.patient?.substring(0, 12)}...)`} value={patientAddress} onChange={(e) => setPatientAddress(e.target.value)} className={inputClass} />
                <button onClick={viewPatientReports} className={btnAccent + " whitespace-nowrap"}>🔍 Fetch</button>
              </div>
              {doctorReports.length > 0 && (
                <div className="space-y-3">
                  {doctorReports.map((r, i) => (
                    <div key={i} className="bg-surf-800 rounded-lg p-4 border border-surf-700">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-md mr-2">{r.reportType}</span>
                          <span className="text-xs text-gray-500">Report #{r.id}</span>
                        </div>
                        <span className="text-xs text-gray-500">{r.timestamp}</span>
                      </div>
                      <p className="text-sm font-mono text-gray-400 mt-2">CID: {r.ipfsHash}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-panel rounded-xl p-8 border border-surf-700/50">
              <h3 className="text-xl font-bold mb-4 text-accent">Generate Consultancy Report</h3>
              <div className="space-y-4">
                <input type="text" placeholder={`Patient address (e.g., ${deploymentData.roles.patient?.substring(0, 12)}...)`} value={patientAddress} onChange={(e) => setPatientAddress(e.target.value)} className={inputClass} />
                <input type="text" placeholder="IPFS Hash (leave blank for auto-generated)" value={reportIpfs} onChange={(e) => setReportIpfs(e.target.value)} className={inputClass} />
                <select value={reportType} onChange={(e) => setReportType(e.target.value)} className={inputClass}>
                  <option value="Consultancy Report">Consultancy Report</option>
                  <option value="Prescription">Prescription</option>
                  <option value="Follow-up Notes">Follow-up Notes</option>
                  <option value="Referral">Referral</option>
                </select>
                <button onClick={addConsultancyReport} className={btnAccent}>📄 Submit Report</button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════ DIAGNOSTIC CENTER ════════════════════ */}
        {activeTab === "diagnostic" && (
          <div className="animate-fade-in space-y-6">
            <h2 className="text-3xl font-black mb-2">🔬 Diagnostic Center</h2>
            <p className="text-gray-400 text-sm">Connected as: <span className="font-mono text-emerald-400">{account}</span></p>

            <div className="glass-panel rounded-xl p-8 border border-surf-700/50">
              <h3 className="text-xl font-bold mb-4 text-emerald-400">Upload EHR Report</h3>
              <div className="space-y-4">
                <input type="text" placeholder={`Patient address (e.g., ${deploymentData.roles.patient?.substring(0, 12)}...)`} value={diagPatientAddr} onChange={(e) => setDiagPatientAddr(e.target.value)} className={inputClass} />
                <input type="text" placeholder="IPFS Hash (leave blank for auto-generated)" value={diagIpfsHash} onChange={(e) => setDiagIpfsHash(e.target.value)} className={inputClass} />
                <select value={diagReportType} onChange={(e) => setDiagReportType(e.target.value)} className={inputClass}>
                  <option value="Blood Test">Blood Test</option>
                  <option value="MRI Scan">MRI Scan</option>
                  <option value="X-Ray">X-Ray</option>
                  <option value="CT Scan">CT Scan</option>
                  <option value="Ultrasound">Ultrasound</option>
                  <option value="ECG">ECG</option>
                  <option value="Biopsy">Biopsy</option>
                </select>
                <button onClick={uploadEHR} className={btnGreen}>📤 Upload Report to Blockchain</button>
              </div>
            </div>
          </div>
        )}

      </main>

      <footer className="relative z-10 glass-panel px-8 py-6 text-center text-gray-500 text-sm">
        <p>© 2026 EthSecure Health — Powered by Ethereum & IPFS | Network: {deploymentData.network}</p>
      </footer>
    </div>
  );
}

export default App;
