//src/routes/grant.js
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


router.post('/', async (req, res) => {
  try {
    const { grantId, ...updateData } = req.body;
    
    // Find by grantId, update with body, or create if missing (upsert)
    const grant = await Grant.findOneAndUpdate(
      { grantId }, 
      { grantId, ...updateData }, 
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ ok: true, grant });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
export default router;
