import express from 'express';
import Publication from '../models/Publication.js';
const router = express.Router();

// list
router.get('/', async (req,res)=>{
  const list = await Publication.find({}).limit(200).populate('matchedGrants');
  res.json(list);
});

// get one
router.get('/:doi', async (req,res)=>{
  const p = await Publication.findOne({ doi: req.params.doi }).populate('matchedGrants');
  if (!p) return res.status(404).json({error:'not found'});
  res.json(p);
});

export default router;
