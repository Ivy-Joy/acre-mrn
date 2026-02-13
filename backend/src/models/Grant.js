import mongoose from 'mongoose';
const { Schema } = mongoose;

const GrantSchema = new Schema({
  grantId: { type: String, required: true, unique: true }, // e.g., DEL-15-011
  programme: String,
  piName: String,
  piOrcid: String,
  institution: String,
  startDate: Date,
  endDate: Date
});

export default mongoose.model('Grant', GrantSchema);
