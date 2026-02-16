import mongoose from 'mongoose';
const { Schema } = mongoose;

const PublicationSchema = new Schema({
  doi: { type: String, required: true, unique: true },
  title: String,
  version: { type: Number, default: 1 },
  publishedAt: Date,
  authors: [{ name: String, orcid: String, name_canonical: String, name_metaphone: String, name_ngrams: [String] }],
  acknowledgementText: String,
  dataLinks: [{ url: String, status: String, lastChecked: Date }],
  isLatest: { type: Boolean, default: true },
  complianceScore: { type: Number, default: 0 },
  matchedGrants: [{ type: Schema.Types.ObjectId, ref: 'Grant' }],
  // new fields:
  rawMetadata: Schema.Types.Mixed,
  provenance: [{ source: String, fetchedAt: Date, url: String }],
  // candidates from automatic matcher: array of {grantId, score, method, reasons}
  matchCandidates: [{
    grantId: String,
    grantRef: { type: Schema.Types.ObjectId, ref: 'Grant', default: null },
    score: Number,
    method: String,
    reasons: [String],
    createdAt: { type: Date, default: Date.now }
  }],
  // audit trail of manual overrides or match attempts
  matchAudit: [{
    grantId: String,
    score: Number,
    method: String,
    matchedAt: Date,
    actor: String, // user id or system
    action: { type: String, enum: ['auto','accepted','rejected','updated'] },
    note: String
  }],
  matchDecision: { // final decision if human chooses one
    grantId: String,
    grantRef: { type: Schema.Types.ObjectId, ref: 'Grant', default: null },
    decidedBy: String,
    decidedAt: Date
  },

  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Publication', PublicationSchema);
