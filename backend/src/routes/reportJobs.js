// backend/src/routes/reportJobs.js
//API endpoints to enqueue report generation and check job status
import express from 'express';
import { reportQueue } from '../queue/index.js';
const router = express.Router();

/**
 * POST /api/publications/:doi/generate-report
 * body: { locale: 'en'|'fr' }
 */
router.post('/publications/:doi/generate-report', async (req, res) => {
  try {
    const doi = req.params.doi;
    const locale = req.body.locale || process.env.DEFAULT_LOCALE || 'en';
    // enqueue job
    const job = await reportQueue.add('generate-data-health', { doi, locale }, { removeOnComplete: true, removeOnFail: false });
    res.json({ ok: true, jobId: job.id, status: 'queued' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET job status (BullMQ stores limited info)
router.get('/jobs/:id', async (req, res) => {
  try {
    const job = await reportQueue.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: 'job not found' });
    const state = await job.getState();
    res.json({ id: job.id, name: job.name, data: job.data, state });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
