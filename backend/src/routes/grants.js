import express from 'express';
import Grant from '../models/Grant.js';
const router = express.Router();

router.get('/', async (req,res)=> {
  const g = await Grant.find({});
  res.json(g);
});

// upload simple grant (for demo)
router.post('/', async (req,res)=> {
  const { grantId, programme, piName, piOrcid, institution, startDate, endDate } = req.body;
  const grant = new Grant({ grantId, programme, piName, piOrcid, institution, startDate, endDate });
  await grant.save();
  res.json({ ok: true, grant });
});

export default router;
