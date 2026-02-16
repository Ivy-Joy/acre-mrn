// backend/src/services/dataHealth.js
import { fetchCrossrefByDOI } from './crossrefService.js';
import { checkDataLink } from './dataLinkChecker.js';
import { findGrantIds } from './acknowledgementParser.js';
import dayjs from 'dayjs';

/**
 * compute data health for a publication doc (Mongoose doc or plain obj)
 * returns { score, issues: [...], checks: { ... } }
 */
export async function computeDataHealth(pub) {
  // defensive
  const result = {
    score: 0,
    issues: [],
    checks: {}
  };

  // 1) DOI exists (CrossRef) -> +10
  result.checks.doi = false;
  try {
    if (pub.doi) {
      const cr = await fetchCrossrefByDOI(pub.doi).catch(()=>null);
      if (cr && cr.doi) {
        result.checks.doi = true;
        result.score += 10;
      } else {
        result.issues.push('doi-not-resolved');
      }
    } else {
      result.issues.push('no-doi');
    }
  } catch (e) {
    result.issues.push('doi-check-failed');
  }

  // 2) Data link reachable -> +15 (check first available dataLink)
  result.checks.dataLinks = [];
  let dataLinkOk = false;
  const dataLinks = (pub.dataLinks || []).map(dl => dl.url).filter(Boolean);
  for (const url of dataLinks) {
    try {
      const r = await checkDataLink(url);
      result.checks.dataLinks.push({ url, ok: r.status === 200, status: r.status, lastChecked: r.lastModified || null });
      if (r.status === 200) dataLinkOk = true;
    } catch (err) {
      result.checks.dataLinks.push({ url, ok: false, error: err.message });
    }
  }
  if (dataLinkOk) { result.score += 15; } else { result.issues.push('data-link-unreachable'); }

  // 3) Acknowledgement contains Grant ID -> +20
  const foundGrants = findGrantIds(pub.acknowledgementText || '');
  result.checks.foundGrantIds = foundGrants;
  if (foundGrants && foundGrants.length) { result.score += 20; } else { result.issues.push('no-grant-acknowledgement'); }

  // 4) ORCID present for at least one author -> +10
  const hasOrcid = (pub.authors || []).some(a => !!(a.orcid));
  result.checks.hasOrcid = hasOrcid;
  if (hasOrcid) result.score += 10; else result.issues.push('no-orcid');

  // 5) Affiliation present for all authors -> +10
  const authors = pub.authors || [];
  const allAff = authors.length > 0 && authors.every(a => a.currentAffiliation || a.affiliation || a.affiliationName);
  result.checks.allAuthorsHaveAffiliation = allAff;
  if (allAff) result.score += 10; else result.issues.push('missing-author-affiliation');

  // 6) No missing critical fields (sample size, methods) -> +15
  // Heuristics: check rawMetadata.abstract & presence of keywords
  const textCandidates = [
    pub.rawMetadata?.abstract || '',
    pub.rawMetadata?.description || '',
    pub.title || '',
    pub.acknowledgementText || ''
  ].join(' ');
  const hasMethods = /(method|methods|study design|sample size|participants|protocol|cohort|trial)/i.test(textCandidates);
  const hasSampleSize = /(N=|sample size|n ?=|participants|cohort of)/i.test(textCandidates);
  result.checks.methodsPresent = hasMethods;
  result.checks.sampleSizePresent = hasSampleSize;
  if (hasMethods && hasSampleSize) { result.score += 15; } else { result.issues.push('missing-methods-or-sample-size'); }

  // 7) Version is latest & not superseded -> +10
  // Heuristic: CrossRef metadata has 'is-preprint-of' or 'relation'. If pub.rawMetadata has 'isVersionOf' or relation to newer item, flag.
  let latest = true;
  try {
    const rel = pub.rawMetadata?.relation || pub.rawMetadata?.relation || null;
    // best-effort: if CrossRef contains 'is-preprint-of' or 'isVersionOf' etc -> assume published update exists
    if (pub.rawMetadata && (pub.rawMetadata.isVersionOf || (pub.rawMetadata.relation && pub.rawMetadata.relation['isVersionOf']))) {
      latest = false;
    }
    // simple date: if CrossRef message has 'update-to' (older) or 'is_previous_version' metadata, skip
  } catch (e) {
    latest = true;
  }
  result.checks.isLatest = latest;
  if (latest) result.score += 10; else result.issues.push('not-latest-version');

  // 8) LOD handling documented -> +10
  const lodFound = /(limit of detection|limit of quantification|LOD|LOQ|below detection|below limit)/i.test(textCandidates);
  result.checks.lodHandling = lodFound;
  if (lodFound) result.score += 10; else result.issues.push('lod-not-mentioned');

  // Normalize score to 0-100 (sum of checks yields up to 100)
  result.score = Math.max(0, Math.min(100, Math.round(result.score)));

  // Add final structured summary
  result.summary = {
    score: result.score,
    issues: result.issues,
    computedAt: new Date().toISOString()
  };

  return result;
}
