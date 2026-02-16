// backend/src/models/Reviewer.js
//Model for reviewer profiles used by the suggestion engine.
import mongoose from 'mongoose';
const { Schema } = mongoose;

const ReviewerSchema = new Schema({
  name: { type: String, required: true },
  orcid: String,
  affiliation: String,
  email: String,
  expertiseTokens: [String], // keywords describing specialties (e.g., 'genomics', 'epidemiology')
  recentAbstracts: [String], // short text snippets to build TF-IDF vectors
  availability: { type: String, enum: ['available','busy','unknown'], default: 'unknown' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Reviewer', ReviewerSchema);
