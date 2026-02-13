import dotenv from 'dotenv';
dotenv.config();
import cron from 'node-cron';
import Publication from './models/Publication.js';
import { fetchCrossrefByDOI } from './services/crossrefService.js';
import { checkDataLink } from './services/dataLinkChecker.js';
import { findGrantIds } from './services/acknowledgementParser.js';
import { connectDB } from './config/db.js';
import { matchPublicationToGrants } from './services/matcher.js';

async function runOnce() {
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
})();
