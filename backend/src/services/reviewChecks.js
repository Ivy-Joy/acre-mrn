//Auto-checks for reviews: data link check, methods presence, statistical tests, code availability, LOD heuristic, simple similarity check placeholder.
// backend/src/services/reviewChecks.js
import { checkDataLink } from './dataLinkChecker.js';
import { findGrantIds } from './acknowledgementParser.js';
import stringSimilarity from 'string-similarity';

/**
 * Simple heuristics / regexes
 */
const METHOD_KEYWORDS = [
  'method', 'methods', ' methodology', 'materials and methods', 'protocol', 'study design', 'randomiz', 'experiment'
];

const STAT_TESTS_REGEX = /\b(t[- ]test|anova|chi(-| )?square|regression|logistic regression|linear regression|mixed model|wilcoxon|kruskal|mann-?whitney|pearson|spearman)\b/i;

function containsKeywords(text, keywords) {
  if (!text) return false;
  const s = text.toLowerCase();
  return keywords.some(k => s.includes(k));
}

/**
 * Run a set of automated checks for a publication object
 * pub should at least contain: doi, title, rawMetadata (with abstract if present), acknowledgementText, dataLinks
 */
export async function runAutoChecks(pub) {
  const results = {
    doiExists: !!pub.doi,
    dataLinks: [],
    datasetAccessible: false,
    acknowledgementContainsGrant: false,
    methodSectionPresent: false,
    statisticalTestsNamed: false,
    codeAvailable: false,
    lodHandlingFlagged: false,
    similarityScoreSample: null,
    checksSummary: {}
  };

  // DOI existence
  results.doiExists = !!pub.doi;

  // Data links: check each link
  if (pub.dataLinks && pub.dataLinks.length) {
    for (const dl of pub.dataLinks) {
      try {
        const status = await checkDataLink(dl.url);
        results.dataLinks.push({ url: dl.url, ok: !!status.status && +(status.status) === 200 });
        if (status.status === 200) results.datasetAccessible = true;
      } catch (err) {
        results.dataLinks.push({ url: dl.url, ok: false, error: err.message });
      }
    }
  }

  // Acknowledgement includes grant id
  const foundGrants = findGrantIds(pub.acknowledgementText || '');
  results.acknowledgementContainsGrant = (foundGrants.length > 0);
  results.checksSummary.foundGrants = foundGrants;

  // Methods present: look at rawMetadata.abstract, title, acknowledgement
  const textToSearch = [
    pub.rawMetadata?.abstract || '',
    pub.title || '',
    pub.acknowledgementText || ''
  ].join(' ');
  results.methodSectionPresent = containsKeywords(textToSearch, METHOD_KEYWORDS);

  // Statistical tests
  results.statisticalTestsNamed = STAT_TESTS_REGEX.test(textToSearch);

  // Code availability: simple heuristics - look for github/gitlab/zenodo/figshare/source code links
  const codeLinkRegex = /(github\.com|gitlab\.com|bitbucket\.org|zenodo\.org|figshare\.com|osf\.io)/i;
  results.codeAvailable = codeLinkRegex.test((textToSearch || ''));

  // LOD handling heuristic: if rawMetadata mentions 'LOD' or 'limit of detection' or 'below detection'
  const lodKeywords = ['limit of detection', 'lod', 'below detection', 'above limit', 'below limit'];
  results.lodHandlingFlagged = containsKeywords(textToSearch, lodKeywords);

  // Quick sample similarity: compare title to existing publications' titles (optional: use DB)
  // We'll leave a null placeholder; calling code may compute real similarity with corpus
  results.similarityScoreSample = null;

  // Short human-readable summary
  results.checksSummary = {
    doiExists: results.doiExists,
    datasetAccessible: results.datasetAccessible,
    acknowledgementGrants: foundGrants,
    methodSectionPresent: results.methodSectionPresent,
    statisticalTestsNamed: results.statisticalTestsNamed,
    codeAvailable: results.codeAvailable,
    lodHandlingFlagged: results.lodHandlingFlagged
  };

  return results;
}
