import mongoose from 'mongoose';
const { Schema } = mongoose;
const AuthorSchema = new Schema({
  name: String,
  orcid: String,
  currentAffiliation: String,
  lastSeen: Date
});
export default mongoose.model('Author', AuthorSchema);
