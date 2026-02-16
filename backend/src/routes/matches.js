import express from 'express';
import Publication from '../models/Publication.js';
import { computeMatchCandidatesForPublication, resolveCandidate } from '../services/matcher.js';
const router = express.Router();

// 1) list ambiguous publications (candidates between AMBIGUOUS_MIN and AUTO_LINK_AUDIT)
// returns publications with their top candidate scores and matchCandidates
router.get('/ambiguous', async (req, res) => {
  try {
    const min = 0.55; // or import from matcher thresholds
    const max = 0.80;
    // find pubs where at least one candidate has score in range
    const pubs = await Publication.find({ 'matchCandidates.score': { $gte: min, $lt: max } })
      .select('doi title matchCandidates matchedGrants matchDecision complianceScore')
      .limit(200)
      .populate('matchedGrants');
    res.json(pubs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2) run compute candidates for a single publication (on demand)
router.post('/compute/:pubId', async (req, res) => {
  try {
    const pub = await Publication.findById(req.params.pubId);
    if (!pub) return res.status(404).json({ error: 'publication not found' });
    const candidates = await computeMatchCandidatesForPublication(pub);
    res.json({ ok: true, candidates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3) admin resolve candidate
router.post('/resolve/:pubId', async (req, res) => {
  try {
    const { grantId, decision, actor, note } = req.body;
    if (!grantId || !decision) return res.status(400).json({ error: 'grantId and decision required' });
    const pub = await resolveCandidate(req.params.pubId, grantId, decision, actor || 'admin', note || '');
    res.json({ ok: true, publication: pub });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
