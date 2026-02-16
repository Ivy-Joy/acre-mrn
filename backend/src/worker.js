//src/worker.js
/*import dotenv from 'dotenv';
dotenv.config();
import cron from 'node-cron';
import Publication from './models/Publication.js';
import { fetchCrossrefByDOI } from './services/crossrefService.js';
import { checkDataLink } from './services/dataLinkChecker.js';
import { findGrantIds } from './services/acknowledgementParser.js';
import { connectDB } from './config/db.js';
import { matchPublicationToGrants } from './services/matcher.js';
import { computeMatchCandidatesForPublication } from './services/matcher.js';

// ... inside worker loop after pub created/updated
const candidates = await computeMatchCandidatesForPublication(pub);
console.log('Candidates:', candidates.map(c => `${c.grantId}:${c.score}`));


/*async function runOnce() {
  console.log('Worker started: sample ingest run');
  // — For demo: you will feed a DOI list manually or read from a feed
  const sampleDois = [
    '10.12688/aasopenres.13351.2' // replace with real DOI(s)
  ];
  for (const doi of sampleDois) {
    try {
      const meta = await fetchCrossrefByDOI(doi);
      let pub = await Publication.findOne({ doi: meta.doi });
      if (!pub) {
        pub = new Publication({
          doi: meta.doi,
          title: meta.title,
          authors: meta.authors
        });
      } else {
        // simple versioning: increment if published date changed
        // real logic should parse CrossRef 'version' fields if available
        pub.title = meta.title;
      }

      // For demo: find data links or ack text — here we assume CrossRef has no ack; you can fetch the ORA page for more
      const ackText = ''; // you could fetch ORA page HTML and parse acknowledgement section
      pub.acknowledgementText = ackText;
      const foundGrants = findGrantIds(ackText);
      // data link check: if metadata has resource link (not always in crossref)
      pub.dataLinks = [];
      // try GTLD
      // For demo, check the Mendeley/M Figshare DOI
      const dataLinkStatus = await checkDataLink('https://doi.org/10.17632/67b55dncm7.143').catch(()=>({error:'fail'}));
      pub.dataLinks.push({ url: 'https://doi.org/10.17632/67b55dncm7.143', status: dataLinkStatus.status || 'error', lastChecked: new Date() });

      // match to grants
      const grantMatches = await matchPublicationToGrants(pub);
      pub.matchedGrants = grantMatches.map(m=>m.grant._id);

      // compute basic compliance score
      let score = 50;
      if (foundGrants.length>0) score += 30;
      if (dataLinkStatus && dataLinkStatus.status===200) score += 20;
      pub.complianceScore = score;
      await pub.save();
      console.log('Saved publication', pub.doi, 'score', pub.complianceScore);
    } catch (err) {
      console.error('Error processing doi', doi, err.message);
    }
  }
}

(async ()=> {
  await connectDB();
  // run once now
  await runOnce();
  // schedule periodic run (every day at 02:00)
  cron.schedule('0 2 * * *', () => {
    runOnce();
  });
})(); */


/*This worker ingests DOIs, updates Publication rawMetadata + provenance, runs data checks, 
computes match candidates (from matcher.computeMatchCandidatesForPublication), runs auto-checks,
 requests reviewer suggestions (top N), and optionally creates a draft Review with autoChecks for 
 manual reviewers to complete.*/
// backend/src/worker.js
import dotenv from 'dotenv';
dotenv.config();
import cron from 'node-cron';
import axios from 'axios';
import Publication from './models/Publication.js';
import { fetchCrossrefByDOI } from './services/crossrefService.js';
import { checkDataLink } from './services/dataLinkChecker.js';
import { findGrantIds } from './services/acknowledgementParser.js';
import { connectDB } from './config/db.js';
import { computeMatchCandidatesForPublication } from './services/matcher.js';
import { runAutoChecks } from './services/reviewChecks.js';
import { suggestReviewersForPublication } from './services/reviewerSuggest.js';
import Review from './models/Reviewer.js';

/**
 * Small helper: fetch ORA or publisher page if needed to scrape acknowledgement text.
 * For now we keep it conservative and use CrossRef data + rawMetadata.
 */
async function fetchAcknowledgementFromORA(doi) {
  // Placeholder: ORA pages often have HTML we could parse. For now return null.
  return null;
}

async function processDOI(doi) {
  try {
    console.log('Processing DOI', doi);
    const meta = await fetchCrossrefByDOI(doi);
    if (!meta) {
      console.warn('No meta for DOI', doi);
      return;
    }

    // find or create pub
    let pub = await Publication.findOne({ doi: meta.doi });
    if (!pub) {
      pub = new Publication({
        doi: meta.doi,
        title: meta.title,
        authors: meta.authors || [],
        rawMetadata: meta,
        provenance: [{ source: 'crossref', fetchedAt: new Date(), url: `https://doi.org/${meta.doi}` }]
      });
    } else {
      // update rawMetadata & provenance
      pub.title = meta.title;
      pub.rawMetadata = meta;
      pub.provenance = pub.provenance || [];
      pub.provenance.push({ source: 'crossref', fetchedAt: new Date(), url: `https://doi.org/${meta.doi}` });
    }

    // Attempt to fetch acknowledgement text (if possible)
    const ackText = await fetchAcknowledgementFromORA(meta.doi) || (meta.acknowledgement || '') || '';
    pub.acknowledgementText = ackText;

    // find grant IDs mentioned
    const foundGrants = findGrantIds(ackText);
    // store them in audit or rawMetadata for transparency
    pub.rawMetadata = pub.rawMetadata || {};
    pub.rawMetadata.foundGrantIds = foundGrants;

    // data link checks: if CrossRef contains resources (relation), check them; else check a sample
    pub.dataLinks = [];
    if (meta['link'] && Array.isArray(meta['link'])) {
      for (const l of meta['link']) {
        const url = l.URL || l.url || l;
        try {
          const status = await checkDataLink(url);
          pub.dataLinks.push({ url, status: status.status || 'error', lastChecked: new Date() });
        } catch (err) {
          pub.dataLinks.push({ url, status: 'error', lastChecked: new Date(), error: err.message });
        }
      }
    } else {
      // optionally check for known dataset DOI embedded (example placeholder)
      // (leave empty for now)
    }

    // Save early to get _id
    await pub.save();

    // MATCHING: compute match candidates (populates matchCandidates + matchAudit)
    const candidates = await computeMatchCandidatesForPublication(pub);
    console.log(`Found ${candidates.length} match candidates for ${pub.doi}`);

    // AUTO-CHECKS for peer review
    const autoChecks = await runAutoChecks(pub);
    // attach data health scoring to complianceScore (simple merge)
    const dataHealthScore = (() => {
      let score = 50;
      if (autoChecks.acknowledgementContainsGrant) score += 25;
      if (autoChecks.datasetAccessible) score += 15;
      if (autoChecks.methodSectionPresent) score += 10;
      return Math.min(100, score);
    })();
    pub.complianceScore = dataHealthScore;

    // Save autoChecks snapshot into a temp review if we want to auto-create a draft review
    // We'll create a draft review with autoChecks and suggested reviewers for admin to assign.
    const suggested = await suggestReviewersForPublication(pub._id, 6);

    // Create draft Review record for program editors to assign (one per suggested reviewer optionally)
    // Here we create a single draft review with autoChecks and a list of suggested reviewers in audit note.
    const draft = new Review({
      publication: pub._id,
      reviewer: {},
      autoChecks,
      comments: `Suggested reviewers: ${suggested.map(s => `${s.name}(${s.score})`).join('; ')}`,
      status: 'draft'
    });
    await draft.save();

    // update pub with last review draft id in provenance for traceability
    pub.provenance = pub.provenance || [];
    pub.provenance.push({ source: 'auto-review-draft', fetchedAt: new Date(), url: null, note: `draftReviewId:${draft._id}` });

    await pub.save();

    console.log(`Processed DOI ${doi}: complianceScore=${pub.complianceScore} draftReview=${draft._id}`);
    return { pubId: pub._id, candidates, draft, suggested };
  } catch (err) {
    console.error('Error processing doi', doi, err.stack || err.message);
    throw err;
  }
}

async function runOnce() {
  console.log('Worker started: sample ingest run');
  // You can replace this sample DOIs list with a feed, ORA API list, or a CSV import
  const sampleDois = [
    '10.12688/aasopenres.13351.2' // example DOI
  ];

  for (const doi of sampleDois) {
    try {
      await processDOI(doi);
    } catch (err) {
      console.error('Worker process error for DOI', doi, err.message);
    }
  }
}

(async ()=> {
  await connectDB();
  // run immediately once
  await runOnce();
  // schedule periodic run (every day at 02:00)
  cron.schedule('0 2 * * *', () => {
    runOnce().catch(e => console.error('Scheduled worker error', e));
  });
})();
