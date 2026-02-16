//Routes to create/update/submit reviews and to fetch reviews for a publication.
//backend/src/routes/reviews.js
import express from 'express';
import Review from '../models/Review.js';
import Publication from '../models/Publication.js';
import { runAutoChecks } from '../services/reviewChecks.js';

const router = express.Router();

// get reviews for a publication
router.get('/pub/:pubId', async (req, res) => {
  try {
    const list = await Review.find({ publication: req.params.pubId }).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// create a draft review with auto checks filled
router.post('/create/:pubId', async (req, res) => {
  try {
    const pub = await Publication.findById(req.params.pubId);
    if (!pub) return res.status(404).json({ error: 'publication not found' });

    const autoChecks = await runAutoChecks(pub);

    const review = new Review({
      publication: pub._id,
      reviewer: req.body.reviewer || {},
      autoChecks,
      status: 'draft'
    });

    await review.save();
    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// update review (scores / comments)
router.put('/:reviewId', async (req, res) => {
  try {
    const r = await Review.findById(req.params.reviewId);
    if (!r) return res.status(404).json({ error: 'review not found' });

    Object.assign(r, req.body);
    r.updatedAt = new Date();
    await r.save();
    res.json(r);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// submit a review (change status to submitted and apply outcome rules)
router.post('/submit/:reviewId', async (req, res) => {
  try {
    const r = await Review.findById(req.params.reviewId);
    if (!r) return res.status(404).json({ error: 'review not found' });

    r.status = 'submitted';
    r.updatedAt = new Date();
    if (req.body.recommendation) r.recommendation = req.body.recommendation;
    if (req.body.scores) r.scores = req.body.scores;
    if (req.body.comments) r.comments = req.body.comments;
    await r.save();

    // Outcome rules: check other submitted reviews for same pub
    const others = await Review.find({ publication: r.publication, status: 'submitted' });
    // If at least 2 independent reviewers with 'accept' -> mark publication matchDecision? (business rule)
    // We'll compute a simple accept count
    const acceptCount = others.filter(x => x.recommendation === 'accept').length;
    if (acceptCount >= 2) {
      // store an audit event in Publication.matchAudit (append-only)
      await Publication.findByIdAndUpdate(r.publication, {
        $push: {
          matchAudit: {
            grantId: null,
            score: 0,
            method: 'review-outcome',
            matchedAt: new Date(),
            actor: 'system',
            action: 'auto-accept-based-on-reviews',
            note: `Auto-accepted publication due to ${acceptCount} reviewer accepts`
          }
        }
      });
    }

    res.json(r);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
