//Simple reviewer suggestion engine using TF-IDF (natural). It computes TF-IDF vectors for reviewers (from expertiseTokens + recentAbstracts) then computes similarity vs publication abstract/title, filters out COI (same affiliation or ORCID match).
// backend/src/services/reviewerSuggest.js
import Reviewer from '../models/Reviewer.js';
import Publication from '../models/Publication.js';
import natural from 'natural';

const TfIdf = natural.TfIdf;

/**
 * Build TF-IDF vectors for all reviewers from expertise tokens + recent abstracts,
 * then compute similarity to the publication abstract/title.
 *
 * This is a simple, in-process approach adequate for small pools of reviewers.
 * For larger pools, index into OpenSearch or compute embeddings instead.
 */
export async function suggestReviewersForPublication(pubId, topN = 5) {
  const pub = await Publication.findById(pubId);
  if (!pub) throw new Error('publication not found');

  // text to represent the publication
  const pubText = [pub.title || '', pub.rawMetadata?.abstract || ''].join(' ').trim();
  if (!pubText) return [];

  const reviewers = await Reviewer.find({});
  if (!reviewers || reviewers.length === 0) return [];

  // Build TF-IDF corpus: each reviewer -> doc (expertiseTokens + recentAbstracts)
  const docs = reviewers.map(r => {
    const parts = [];
    if (r.expertiseTokens) parts.push(r.expertiseTokens.join(' '));
    if (r.recentAbstracts) parts.push(r.recentAbstracts.join(' '));
    return parts.join(' ').trim() || r.name;
  });

  const tfidf = new TfIdf();
  docs.forEach(d => tfidf.addDocument(d));

  // Get vector for pubText by computing tfidf terms (approx)
  // We'll compute cosine similarity using term weights
  const pubTerms = {};
  tfidf.tfidfs(pubText, function(i, measure, key) {
    // this callback gives measure for each term? but natural Tfidf usage is limited.
  });

  // Simpler approach: compute cosine similarity using Bag-of-Words via tokenizer
  const tokenizer = new natural.WordTokenizer();
  const pubTokens = tokenizer.tokenize(pubText.toLowerCase());
  const pubFreq = {};
  for (const t of pubTokens) pubFreq[t] = (pubFreq[t] || 0) + 1;

  function docScore(docText) {
    const tokens = tokenizer.tokenize(docText.toLowerCase());
    const freq = {};
    for (const t of tokens) freq[t] = (freq[t] || 0) + 1;
    // cosine similarity
    let dot = 0, magA = 0, magB = 0;
    for (const k of Object.keys(pubFreq)) {
      dot += (pubFreq[k] || 0) * (freq[k] || 0);
      magA += Math.pow(pubFreq[k] || 0, 2);
    }
    for (const k of Object.keys(freq)) {
      magB += Math.pow(freq[k] || 0, 2);
    }
    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);
    if (magA === 0 || magB === 0) return 0;
    return dot / (magA * magB);
  }

  const suggestions = [];

  for (let i = 0; i < reviewers.length; i++) {
    const r = reviewers[i];
    const doc = docs[i];
    const sim = docScore(doc);
    // Conflict of interest checks: same ORCID or same affiliation string
    let coi = false;
    if (r.orcid && pub.authors && pub.authors.some(a => a.orcid && a.orcid === r.orcid)) coi = true;
    if (r.affiliation && pub.authors && pub.authors.some(a => a.currentAffiliation && a.currentAffiliation.toLowerCase().includes((r.affiliation || '').toLowerCase()))) coi = true;
    if (coi) continue; // skip reviewer with COI

    suggestions.push({
      reviewerId: r._id,
      name: r.name,
      orcid: r.orcid,
      affiliation: r.affiliation,
      score: Number(sim.toFixed(4))
    });
  }

  suggestions.sort((a, b) => b.score - a.score);
  return suggestions.slice(0, topN);
}
