// backend/src/models/Review.js
//Model for individual reviews and auto-check stored data.
import mongoose from 'mongoose';
const { Schema } = mongoose;

const ReviewSchema = new Schema({
  publication: { type: Schema.Types.ObjectId, ref: 'Publication', required: true },
  reviewer: { name: String, orcid: String, affiliation: String, reviewerRef: { type: Schema.Types.ObjectId, ref: 'Reviewer' } },
  scores: {
    methodology: { type: Number, min: 0, max: 5 },
    sampleSize: { type: Number, min: 0, max: 5 },
    reproducibility: { type: Number, min: 0, max: 5 },
    ethics: { type: Number, min: 0, max: 5 }
  },
  dataAvailability: { type: String, enum: ['yes','no','partial'] },
  statisticalReporting: { type: String, enum: ['yes','no','partial'] },
  autoChecks: Schema.Types.Mixed, // store output of runAutoChecks
  recommendation: { type: String, enum: ['accept','minor','major','reject','none'], default: 'none' },
  comments: String,
  status: { type: String, enum: ['draft','submitted','archived'], default: 'draft' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date
});

export default mongoose.model('Review', ReviewSchema);
