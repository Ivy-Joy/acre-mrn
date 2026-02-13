import mongoose from 'mongoose';
const { Schema } = mongoose;
const ComplianceLog = new Schema({
  publication: { type: Schema.Types.ObjectId, ref: 'Publication' },
  issueType: String,
  severity: { type: String, enum: ['low','medium','high'], default: 'medium' },
  details: String,
  createdAt: { type: Date, default: Date.now }
});
export default mongoose.model('ComplianceLog', ComplianceLog);
