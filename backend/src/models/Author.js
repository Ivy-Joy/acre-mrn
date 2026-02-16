//src/models/Author.js
/*import mongoose from 'mongoose';
const { Schema } = mongoose;
const AuthorSchema = new Schema({
  name: String,
  orcid: String,
  currentAffiliation: String,
  lastSeen: Date
});
export default mongoose.model('Author', AuthorSchema); */

import mongoose from 'mongoose';
const { Schema } = mongoose;

const AuthorSchema = new Schema({
  name: { type: String, required: true },
  orcid: String,
  currentAffiliation: String,
  lastSeen: Date,

  // Normalized fields for matching
  name_canonical: { type: String, index: true },
  name_tokens: [String],
  name_metaphone: String,
  name_ngrams: [String]
});

export default mongoose.model('Author', AuthorSchema);
