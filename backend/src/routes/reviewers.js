//Routes to add/list reviewers and get suggestions for a publication.
// backend/src/routes/reviewers.js
import express from 'express';
import Reviewer from '../models/Reviewer.js';
import { suggestReviewersForPublication } from '../services/reviewerSuggest.js';

const router = express.Router();

// list reviewers
router.get('/', async (req, res) => {
  const list = await Reviewer.find({}).limit(200);
  res.json(list);
});

// create reviewer
router.post('/', async (req, res) => {
  try {
    const r = new Reviewer(req.body);
    await r.save();
    res.status(201).json(r);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// suggest reviewers for a publication
router.get('/suggest/:pubId', async (req, res) => {
  try {
    const suggestions = await suggestReviewersForPublication(req.params.pubId, 8);
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
