// backend/src/services/pdfGenerator.js
import ejs from 'ejs';
import fs from 'fs';
import path from 'path';
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import { fileURLToPath } from 'url';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { spawnSync } from 'child_process';
import puppeteer from 'puppeteer-core';
import { promisify } from 'util';
const readFile = promisify(fs.readFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// init i18next (server-side) - load locales from ../locales
await i18next.use(Backend).init({
  backend: { loadPath: path.join(__dirname, '../locales/{{lng}}/{{ns}}.json') },
  lng: process.env.DEFAULT_LOCALE || 'en',
  fallbackLng: 'en',
  preload: ['en','fr']
});

// configure S3 client (works with MinIO if endpoint configured)
function makeS3Client() {
  const endpoint = process.env.S3_ENDPOINT || undefined;
  const region = process.env.S3_REGION || 'us-east-1';
  const credentials = {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
  };
  // @aws-sdk/client-s3 will accept endpoint via constructor
  return new S3Client({ endpoint, region, credentials, forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true' });
}

async function uploadBufferToS3(buffer, key, contentType='application/pdf') {
  const client = makeS3Client();
  const upload = new Upload({
    client,
    params: {
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType
    }
  });
  const result = await upload.done();
  // Construct accessible URL depending on endpoint style
  const endpoint = process.env.S3_ENDPOINT;
  if (endpoint) {
    // If MinIO with path style: `${endpoint}/${bucket}/${key}`
    return `${endpoint}/${process.env.S3_BUCKET}/${key}`;
  }
  // For AWS, best to return s3 object key (clients can generate presigned URL)
  return `s3://${process.env.S3_BUCKET}/${key}`;
}

/**
 * renderHtml -> PDF buffer using puppeteer-core (system Chrome) or wkhtmltopdf fallback
 */
async function renderPdfFromHtml(html, options = { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH }) {
  // if puppeteer executable provided: use puppeteer-core
  if (options.executablePath) {
    const browser = await puppeteer.launch({ executablePath: options.executablePath, args: ['--no-sandbox','--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' } });
    await browser.close();
    return pdf;
  } else {
    // wkhtmltopdf fallback
    try {
      // write to temp html file and call wkhtmltopdf binary
      const tmpHtml = path.join(__dirname, `../tmp/report-${Date.now()}.html`);
      const tmpPdf = path.join(__dirname, `../tmp/report-${Date.now()}.pdf`);
      fs.writeFileSync(tmpHtml, html, 'utf8');
      // `wkhtmltopdf` package could be used, but we shell out for reliability
      const res = spawnSync('wkhtmltopdf', [tmpHtml, tmpPdf], { timeout: 600000 });
      if (res.error) throw res.error;
      const pdf = fs.readFileSync(tmpPdf);
      // cleanup
      try { fs.unlinkSync(tmpHtml); fs.unlinkSync(tmpPdf); } catch(e){/*ignore*/ }
      return pdf;
    } catch (err) {
      throw new Error('PDF generation failed: ' + err.message);
    }
  }
}

/**
 * renderDataHealthPdf
 * - pub: publication doc (with fields)
 * - dataHealth: output of computeDataHealth(pub)
 * - locale: 'en' or 'fr'
 *
 * returns uploaded PDF URL
 */
export async function renderDataHealthPdfAndUpload({ pub, dataHealth, locale='en' }) {
  // render ejs template with i18n
  const tplPath = path.join(__dirname, '../views/dataHealthTemplate.ejs');
  const tpl = await readFile(tplPath, 'utf8');

  // change language in i18next instance temporarily
  const t = (key) => i18next.getFixedT(locale)(key);

  const html = ejs.render(tpl, {
    pub,
    dataHealth,
    t,
    lang: locale,
    generatedAt: new Date().toLocaleString(locale)
  });

  // produce pdf buffer
  const pdfBuffer = await renderPdfFromHtml(html, { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH });

  // upload
  const key = `reports/data-health-${pub.doi.replace(/\//g,'_')}-${Date.now()}.pdf`;
  const url = await uploadBufferToS3(pdfBuffer, key);

  return { url, key };
}
