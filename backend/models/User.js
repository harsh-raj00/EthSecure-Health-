import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  wallet:       { type: String, required: true, unique: true, lowercase: true },
  uniqueId:     { type: String, required: true, unique: true },
  role:         { type: String, required: true, enum: ['patient', 'doctor'] },
  passwordHash: { type: String, required: true },
  fullName:     { type: String, required: true },
  dob:          String,
  gender:       String,
  bloodType:    String,
  phone:        String,
  email:        String,
  street:       String,
  city:         String,
  state:        String,
  emergencyName:  String,
  emergencyPhone: String,
  // Doctor-specific
  specialization: String,
  hospital:       String,
  licenseNo:      String,
  experience:     String,
  languages:      String,
}, { timestamps: true });

export default mongoose.model('User', userSchema);
