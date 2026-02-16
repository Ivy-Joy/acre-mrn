import mongoose from 'mongoose';
const { Schema } = mongoose;

const GrantSchema = new Schema({
  grantId: { type: String, required: true, unique: true }, // e.g., DEL-15-011
  programme: String,
  piName: String,
  piName_canonical: String,
  piName_metaphone: String,
  piName_ngrams: [String],
  piOrcid: String,
  institution: String,
  startDate: Date,
  endDate: Date
});

export default mongoose.model('Grant', GrantSchema);
