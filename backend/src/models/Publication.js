import mongoose from 'mongoose';
const { Schema } = mongoose;

const PublicationSchema = new Schema({
  doi: { type: String, required: true, unique: true },
  title: String,
  version: { type: Number, default: 1 },
  publishedAt: Date,
  authors: [{ name: String, orcid: String }],
  acknowledgementText: String,
  dataLinks: [{ url: String, status: String, lastChecked: Date }],
  isLatest: { type: Boolean, default: true },
  complianceScore: { type: Number, default: 0 },
  matchedGrants: [{ type: Schema.Types.ObjectId, ref: 'Grant' }],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Publication', PublicationSchema);
