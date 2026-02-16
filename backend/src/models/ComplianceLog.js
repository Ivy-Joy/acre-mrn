//src/models/ComplianceLog.js
/*import mongoose from 'mongoose';
const { Schema } = mongoose;
const ComplianceLog = new Schema({
  publication: { type: Schema.Types.ObjectId, ref: 'Publication' },
  issueType: String,
  severity: { type: String, enum: ['low','medium','high'], default: 'medium' },
  details: String,
  createdAt: { type: Date, default: Date.now }
});
export default mongoose.model('ComplianceLog', ComplianceLog);*/

// backend/src/models/ComplianceLog.js
import mongoose from 'mongoose';
const { Schema } = mongoose;

const ComplianceLogSchema = new Schema({
  publication: { type: Schema.Types.ObjectId, ref: 'Publication' },
  dataHealth: Schema.Types.Mixed, // full object returned by dataHealth()
  score: Number,
  issues: [String],
  reportUrl: String, // S3/MinIO PDF link
  generatedAt: { type: Date, default: Date.now },
  createdBy: { type: String, default: 'system' }
});

export default mongoose.model('ComplianceLog', ComplianceLogSchema);
