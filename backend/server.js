import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import User from './models/User.js';
import AccessRequest from './models/AccessRequest.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ethsecure';

// ─── Connect MongoDB ──────────────────────────────────────
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => { console.error('❌ MongoDB connection error:', err.message); process.exit(1); });

// ─── Register ─────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
  try {
    const { wallet, uniqueId, role, passwordHash, fullName, ...rest } = req.body;
    if (!wallet || !uniqueId || !role || !passwordHash || !fullName) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    // Check if uniqueId already taken
    const existingId = await User.findOne({ uniqueId });
    if (existingId) return res.status(409).json({ error: 'Unique ID already used.' });

    // Upsert by wallet (allows re-registration with same wallet)
    const user = await User.findOneAndUpdate(
      { wallet: wallet.toLowerCase() },
      { wallet: wallet.toLowerCase(), uniqueId, role, passwordHash, fullName, ...rest },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({ success: true, profile: user });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Unique ID already used.' });
    res.status(500).json({ error: err.message });
  }
});

// ─── Login ────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  try {
    const { wallet, uniqueId, passwordHash } = req.body;
    const user = await User.findOne({ wallet: wallet.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'No account found. Please register first.' });
    if (user.uniqueId !== uniqueId.trim()) return res.status(401).json({ error: 'Invalid Unique ID.' });
    if (user.passwordHash !== passwordHash) return res.status(401).json({ error: 'Incorrect password.' });
    res.json({ success: true, profile: user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Get Profile by wallet ────────────────────────────────
app.get('/api/profile/wallet/:address', async (req, res) => {
  try {
    const user = await User.findOne({ wallet: req.params.address.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Get Profile by uniqueId ──────────────────────────────
app.get('/api/profile/uid/:uniqueId', async (req, res) => {
  try {
    const user = await User.findOne({ uniqueId: req.params.uniqueId.trim() });
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Doctor: Request Access ───────────────────────────────
app.post('/api/access/request', async (req, res) => {
  try {
    const { patientAddress, doctorAddress } = req.body;
    if (!patientAddress || !doctorAddress) return res.status(400).json({ error: 'Missing addresses.' });

    // Check patient exists
    const patient = await User.findOne({ wallet: patientAddress.toLowerCase() });
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });

    await AccessRequest.findOneAndUpdate(
      { patientAddress: patientAddress.toLowerCase(), doctorAddress: doctorAddress.toLowerCase() },
      { patientAddress: patientAddress.toLowerCase(), doctorAddress: doctorAddress.toLowerCase(), status: 'pending' },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: `Access request sent to ${patient.fullName}!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Patient: Get pending requests ────────────────────────
app.get('/api/access/requests/:address', async (req, res) => {
  try {
    const requests = await AccessRequest.find({
      patientAddress: req.params.address.toLowerCase(),
      status: 'pending'
    });

    // Enrich with doctor names
    const enriched = await Promise.all(requests.map(async (r) => {
      const doc = await User.findOne({ wallet: r.doctorAddress });
      return {
        _id: r._id,
        docAddr: r.doctorAddress,
        docName: doc?.fullName || 'Unknown Doctor',
        docId: doc?.uniqueId || 'Unknown',
        createdAt: r.createdAt
      };
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Patient: Approve request ─────────────────────────────
app.post('/api/access/approve', async (req, res) => {
  try {
    const { requestId } = req.body;
    await AccessRequest.findByIdAndUpdate(requestId, { status: 'approved' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Patient: Reject request ──────────────────────────────
app.post('/api/access/reject', async (req, res) => {
  try {
    const { requestId } = req.body;
    await AccessRequest.findByIdAndDelete(requestId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Start Server ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 EthSecure Backend running on http://localhost:${PORT}`);
});
