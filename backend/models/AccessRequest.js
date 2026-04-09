import mongoose from 'mongoose';

const accessRequestSchema = new mongoose.Schema({
  patientAddress: { type: String, required: true, lowercase: true },
  doctorAddress:  { type: String, required: true, lowercase: true },
  status:         { type: String, default: 'pending', enum: ['pending', 'approved', 'rejected'] },
}, { timestamps: true });

// One pending request per doctor-patient pair
accessRequestSchema.index({ patientAddress: 1, doctorAddress: 1 }, { unique: true });

export default mongoose.model('AccessRequest', accessRequestSchema);
