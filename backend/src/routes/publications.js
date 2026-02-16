import express from 'express';
import Publication from '../models/Publication.js';
const router = express.Router();

// 1. List all
router.get('/', async (req, res) => {
  try {
    const list = await Publication.find({}).limit(200).populate('matchedGrants');
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Create (Seed data)
router.post('/', async (req, res) => {
  try {
    const newPub = new Publication(req.body);
    
    // Premium Logic: Auto-link to existing grants by PI Name
    const Grant = (await import('../models/Grant.js')).default;
    const authorNames = newPub.authors.map(a => a.name);
    const linkedGrants = await Grant.find({ piName: { $in: authorNames } });
    
    newPub.matchedGrants = linkedGrants.map(g => g._id);
    
    // Compliance logic based on the PDF you provided
    if (linkedGrants.length > 0 && newPub.acknowledgementText.toLowerCase().includes("no grants")) {
      newPub.complianceScore = 42; 
    } else if (linkedGrants.length > 0) {
      newPub.complianceScore = 100;
    }

    await newPub.save();
    res.status(201).json({ ok: true, publication: newPub });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Get one by DOI (Fixed the wildcard syntax)
// The '*' tells Express to capture everything, including internal slashes
/*router.get('/:doi*', async (req, res) => {
  try {
    // In some versions, 'doi' will be the key; in others, it might be in params[0]
    // We combine them to be safe
    const fullDoi = req.params.doi + (req.params[0] || '');
    const cleanDoi = decodeURIComponent(fullDoi);
    
    const p = await Publication.findOne({ doi: cleanDoi }).populate('matchedGrants');
    
    if (!p) return res.status(404).json({ error: `DOI ${cleanDoi} not found` });
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});*/

// Express 5 strictly requires a named parameter for wildcards
/*router.get('/:doi{*rest}', async (req, res) => {
  try {
    // Combine the base DOI and the rest of the segments captured by the wildcard
    const fullDoi = req.params.doi + (req.params.rest || '');
    
    // Explicitly decode to handle %2F and other special characters
    const cleanDoi = decodeURIComponent(fullDoi);
    
    const p = await Publication.findOne({ doi: cleanDoi }).populate('matchedGrants');
    
    if (!p) return res.status(404).json({ error: `DOI ${cleanDoi} not found` });
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});*/

// This captures everything after the / as a single parameter named 'doi'
/*router.get('/{*doi}', async (req, res) => {
  try {
    // With {*doi}, req.params.doi captures the entire string including slashes
    const cleanDoi = decodeURIComponent(req.params.doi);
    
    const p = await Publication.findOne({ doi: cleanDoi }).populate('matchedGrants');
    
    if (!p) return res.status(404).json({ error: `DOI ${cleanDoi} not found` });
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});*/

// Express 5 + Node 20: Use a Regex to capture the entire string after /publications/
router.get(/^\/(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)$/i, async (req, res) => {
  try {
    // In Regex routes, the capture group ( ) is available in req.params[0]
    const cleanDoi = decodeURIComponent(req.params[0]);
    
    const p = await Publication.findOne({ doi: cleanDoi }).populate('matchedGrants');
    
    if (!p) return res.status(404).json({ error: `DOI ${cleanDoi} not found` });
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


export default router;