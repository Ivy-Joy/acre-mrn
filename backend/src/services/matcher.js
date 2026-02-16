//src/services/matcher.js
/*import stringSimilarity from 'string-similarity';
import Grant from '../models/Grant.js';
import Publication from '../models/Publication.js';*/

/*export async function matchPublicationToGrants(publication) {
  // naive approach: load grants and run fuzzy match
  const grants = await Grant.find({});
  const titleOrAuthors = `${publication.title} ${publication.authors?.map(a=>a.name).join(' ')}`;
  const matches = [];
  for (const g of grants) {
    const score = stringSimilarity.compareTwoStrings((g.piName || '').toLowerCase(), (publication.authors?.[0]?.name || '').toLowerCase());
    // also match by institution or grant terms in acknowledgement text
    let ackMatch = 0;
    if (publication.acknowledgementText && g.grantId && publication.acknowledgementText.includes(g.grantId)) ackMatch = 1;
    const totalScore = Math.max(score, ackMatch);
    if (totalScore > 0.6) {
      matches.push({ grant: g, score: Math.round(totalScore*100) });
    }
  }
  // sort by score desc
  matches.sort((a,b)=>b.score-a.score);
  return matches;
}*/

//(using fast-levenshtein + double metaphone + precomputed normalized fields)
/*import Grant from '../models/Grant.js';
import { levenshteinDistance } from 'fast-levenshtein';
import doubleMetaphone from 'double-metaphone';

function tokenSetRatio(a,b) { /* implement token set ratio from fuzzball logic */ 

/*export async function matchPublicationToGrants(pub) {
  const grants = await Grant.find({});
  const candidates = [];
  const pubNames = (pub.authors||[]).map(a=>normalizeName(a.name));
  const pubMetas = pubNames.map(n=>n.metaphone);

  for (const g of grants) {
    let score = 0;
    // ORCID exact
    if (g.piOrcid && pub.authors.some(a=>a.orcid === g.piOrcid)) score += 0.6;
    // acknowledgement exact grant id
    if (pub.acknowledgementText?.includes(g.grantId)) score += 0.4;
    // name similarity
    const nameScore = Math.max(...pubNames.map(n => tokenSetRatio(n.canonical, normalizeName(g.piName).canonical)));
    score += 0.3 * nameScore;
    // institution
    if (g.institution && pub.acknowledgementText?.toLowerCase().includes(g.institution.toLowerCase())) score += 0.1;
    // date window
    const py = (pub.publishedAt && new Date(pub.publishedAt).getFullYear()) || null;
    if (py && g.startDate && g.endDate) {
      if (py >= new Date(g.startDate).getFullYear() && py <= new Date(g.endDate).getFullYear()) score += 0.05;
    }
    candidates.push({grant: g, score: Math.min(1, score)});
  }
  return candidates.sort((a,b)=>b.score-a.score);
}*/

import Grant from '../models/Grant.js';
import Publication from '../models/Publication.js';
import stringSimilarity from 'string-similarity';
import { normalizeName } from '../utils/normalizeName.js';

/**
 * TUNABLE thresholds
 */
export const THRESHOLDS = {
  AUTO_LINK: 0.95,
  AUTO_LINK_AUDIT: 0.80,
  AMBIGUOUS_MIN: 0.55
};

/**
 * tokenSetRatio: quick token-set similarity (simple)
 */
function tokenSetRatio(a, b) {
  if (!a || !b) return 0;
  const at = new Set(a.split(/\s+/).filter(Boolean));
  const bt = new Set(b.split(/\s+/).filter(Boolean));
  const inter = new Set([...at].filter(x => bt.has(x)));
  const unionCount = at.size + bt.size - inter.size;
  if (unionCount === 0) return 0;
  const score = (2 * inter.size) / (at.size + bt.size); // 0..1
  return score;
}

/**
 * compute composite score for a single grant candidate
 * returns {score, reasons[]}
 */
function scoreCandidate(pub, grant) {
  const reasons = [];
  let score = 0;

  // 1) ORCID exact
  if (grant.piOrcid && pub.authors && pub.authors.some(a => a.orcid && a.orcid === grant.piOrcid)) {
    score += 0.6;
    reasons.push('orcid-exact');
  }

  // 2) acknowledgement contains explicit grantId
  if (pub.acknowledgementText && grant.grantId && pub.acknowledgementText.toLowerCase().includes(grant.grantId.toLowerCase())) {
    score += 0.4;
    reasons.push('acknowledgement-grantId');
  }

  // 3) name similarity (use publication first author vs PI)
  const pubFirst = (pub.authors && pub.authors[0] && pub.authors[0].name_canonical) || (pub.authors && pub.authors[0] && pub.authors[0].name) || '';
  const pi = grant.piName_canonical || grant.piName || '';
  if (pubFirst && pi) {
    const lev = stringSimilarity.compareTwoStrings(pubFirst, pi); // 0..1
    // tokenSet gives better for swapped tokens
    const tokenScore = tokenSetRatio(pubFirst, pi);
    const nameSimilarity = Math.max(lev, tokenScore);
    score += 0.3 * nameSimilarity;
    reasons.push(`name-sim:${(nameSimilarity).toFixed(3)}`);
  }

  // 4) institution match
  if (grant.institution && pub.acknowledgementText && pub.acknowledgementText.toLowerCase().includes(grant.institution.toLowerCase())) {
    score += 0.1;
    reasons.push('institution-ack');
  }

  // 5) publication year in grant window
  if (pub.publishedAt && grant.startDate && grant.endDate) {
    const py = new Date(pub.publishedAt).getFullYear();
    const sy = new Date(grant.startDate).getFullYear();
    const ey = new Date(grant.endDate).getFullYear();
    if (py >= sy && py <= ey) {
      score += 0.05;
      reasons.push('year-window');
    }
  }

  // cap
  score = Math.min(1, score);
  return { score, reasons };
}

/**
 * Main exported function
 * - computes candidates for a publication
 * - writes matchCandidates and matchAudit into the Publication doc (but does not auto-apply matchDecision)
 */
export async function computeMatchCandidatesForPublication(publicationDoc) {
  const grants = await Grant.find({}); // small number assumed; for scale, query per heuristics
  const pub = publicationDoc.toObject ? publicationDoc.toObject() : publicationDoc;

  // ensure authors have canonical fields (if not, normalize on-the-fly)
  pub.authors = (pub.authors || []).map(a => {
    if (!a.name_canonical) {
      const norm = normalizeName(a.name || '');
      return { ...a, name_canonical: norm.canonical, name_metaphone: norm.metaphone, name_ngrams: norm.ngrams };
    }
    return a;
  });

  const candidates = [];

  for (const g of grants) {
    const { score, reasons } = scoreCandidate(pub, g);
    if (score >= THRESHOLDS.AMBIGUOUS_MIN) {
      candidates.push({
        grantId: g.grantId,
        grantRef: g._id,
        score,
        method: 'composite',
        reasons
      });
    }
  }

  // sort desc
  candidates.sort((a, b) => b.score - a.score);

  // write into publication: matchCandidates + matchAudit entry
  const PublicationModel = Publication; // already imported
  const update = {
    matchCandidates: candidates,
    // append to audit: record the run as 'auto' audit
    $push: {
      matchAudit: {
        $each: candidates.map(c => ({
          grantId: c.grantId,
          score: c.score,
          method: c.method,
          matchedAt: new Date(),
          actor: 'system',
          action: 'auto',
          note: 'automated candidate computed'
        }))
      }
    }
  };

  await PublicationModel.findByIdAndUpdate(pub._id, update, { new: true });

  return candidates;
}

/**
 * resolveCandidate: admin accepts or rejects a candidate; writes matchDecision & matchAudit
 * params: pubId, candidateGrantId, decision ('accept'|'reject'), actor (user id), optional note
 */
export async function resolveCandidate(pubId, candidateGrantId, decision, actor='admin', note='') {
  const pub = await Publication.findById(pubId);
  if (!pub) throw new Error('publication not found');

  const candidate = (pub.matchCandidates || []).find(c => c.grantId === candidateGrantId);
  if (!candidate) throw new Error('candidate not found');

  if (decision === 'accept') {
    // set matchedGrants (push if not present) and set decision
    const GrantModel = (await import('../models/Grant.js')).default;
    const g = await GrantModel.findOne({ grantId: candidateGrantId });
    if (g && !(pub.matchedGrants || []).some(id => id.equals(g._id))) {
      pub.matchedGrants = (pub.matchedGrants || []).concat([g._id]);
    }
    pub.matchDecision = { grantId: candidateGrantId, grantRef: g ? g._id : null, decidedBy: actor, decidedAt: new Date() };
    pub.matchAudit.push({ grantId: candidateGrantId, score: candidate.score, method: candidate.method, matchedAt: new Date(), actor, action: 'accepted', note });
  } else {
    // reject: record audit
    pub.matchAudit.push({ grantId: candidateGrantId, score: candidate.score, method: candidate.method, matchedAt: new Date(), actor, action: 'rejected', note });
    // optionally remove the candidate from matchCandidates list
    pub.matchCandidates = (pub.matchCandidates || []).filter(c => c.grantId !== candidateGrantId);
  }

  await pub.save();
  return pub;
}
