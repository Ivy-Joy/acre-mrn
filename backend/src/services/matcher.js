import stringSimilarity from 'string-similarity';
import Grant from '../models/Grant.js';
import Publication from '../models/Publication.js';

export async function matchPublicationToGrants(publication) {
  // naive approach: load grants and run fuzzy match
  const grants = await Grant.find({});
  const titleOrAuthors = `${publication.title} ${publication.authors?.map(a=>a.name).join(' ')}`;
  const matches = [];
  for (const g of grants) {
    const score = stringSimilarity.compareTwoStrings((g.piName || '').toLowerCase(), (publication.authors?.[0]?.name || '').toLowerCase());
    // also match by institution or grant terms in acknowledgement text
    let ackMatch = 0;
    if (publication.acknowledgementText && g.grantId && publication.acknowledgementText.includes(g.grantId)) ackMatch = 1;
    const totalScore = Math.max(score, ackMatch);
    if (totalScore > 0.6) {
      matches.push({ grant: g, score: Math.round(totalScore*100) });
    }
  }
  // sort by score desc
  matches.sort((a,b)=>b.score-a.score);
  return matches;
}
