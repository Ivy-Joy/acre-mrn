// backend/src/queue/index.js
//This creates a queue reports and a worker that picks jobs, runs the dataHealth check, renders PDF, 
// uploads to S3/MinIO, saves a ComplianceLog, and updates Publication.
import { Queue, Worker, QueueScheduler } from 'bullmq';
import IORedis from 'ioredis';
import { computeDataHealth } from '../services/dataHealth.js';
import { renderDataHealthPdfAndUpload } from '../services/pdfGenerator.js';
import Publication from '../models/Publication.js';
import ComplianceLog from '../models/ComplianceLog.js';

const connection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
  password: process.env.REDIS_PASSWORD || undefined
});

export const reportQueue = new Queue('reports', { connection });
new QueueScheduler('reports', { connection });

// Worker: processes generate-report jobs
export const reportWorker = new Worker('reports', async job => {
  const { doi, locale } = job.data;
  const pub = await Publication.findOne({ doi });
  if (!pub) throw new Error('publication not found for doi ' + doi);

  // 1) compute data health
  const dataHealth = await computeDataHealth(pub);

  // 2) render and upload PDF
  const { url: reportUrl } = await renderDataHealthPdfAndUpload({ pub, dataHealth, locale });

  // 3) write ComplianceLog
  const log = new ComplianceLog({
    publication: pub._id,
    dataHealth,
    score: dataHealth.score,
    issues: dataHealth.issues,
    reportUrl,
    createdBy: 'system'
  });
  await log.save();

  // 4) update publication with lastReport link
  pub.lastReport = { url: reportUrl, generatedAt: new Date(), complianceLog: log._id };
  await pub.save();

  return { reportUrl, complianceLogId: log._id };
}, { connection, concurrency: 2 });

reportWorker.on('completed', job => {
  console.log('Report job completed', job.id, job.returnvalue);
});
reportWorker.on('failed', (job, err) => {
  console.error('Report job failed', job.id, err);
});
