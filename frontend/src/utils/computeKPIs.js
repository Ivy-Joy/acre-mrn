// src/utils/computeKPIs.js
// Returns computed KPIs and derived datasets from publication + grant arrays.
// Designed to be deterministic (pure functions) and fast.

import dayjs from 'dayjs';

/**
 * normalize string for simple comparisons
 */
const norm = (s = '') => String(s || '').toLowerCase().trim();

/**
 * build yearly buckets for charting (last N years)
 */
function yearBuckets(publications = [], years = 5) {
  const now = dayjs();
  const startYear = now.year() - (years - 1);
  const buckets = {};
  for (let y = startYear; y <= now.year(); y++) buckets[y] = 0;
  publications.forEach(p => {
    const y = p.publishedAt ? dayjs(p.publishedAt).year() : null;
    if (y && y >= startYear && y <= now.year()) buckets[y] = (buckets[y] || 0) + 1;
  });
  return Object.keys(buckets).map(y => ({ year: Number(y), count: buckets[y] }));
}

/**
 * Count publications per country using simple affiliation parsing.
 * (Assumes affiliation strings contain a country name or city; we use a small heuristic.)
 */
function geoDistribution(publications = []) {
  // quick country keywords to search for in affiliation strings (expand as needed)
  const countries = ['kenya','uganda','nigeria','south africa','ghana','ethiopia','tanzania','zambia','rwanda','cote d\'ivoire','ivory coast'];
  const map = {};
  publications.forEach(pub => {
    (pub.authors || []).forEach(a => {
      const aff = norm(a.affiliation || a.currentAffiliation || '');
      for (const c of countries) {
        if (aff.includes(c)) map[c] = (map[c] || 0) + 1;
      }
    });
  });
  // fallback: cluster unmatched into "other"
  const totalHits = Object.values(map).reduce((s,n)=>s+n,0);
  return { countries: map, other: Math.max(0, (publications.length - totalHits)) };
}

/**
 * compute top authors by number of publications
 */
function topAuthors(publications = [], limit = 6) {
  const counts = {};
  publications.forEach(p => {
    (p.authors || []).forEach(a => {
      const k = norm(a.name) || 'unknown';
      counts[k] = counts[k] ? { name: a.name || k, count: counts[k].count+1 } : { name: a.name || k, count: 1 };
    });
  });
  return Object.values(counts).sort((a,b)=>b.count-a.count).slice(0, limit);
}

/**
 * compute compliance distribution buckets
 */
function complianceBuckets(publications = []) {
  const buckets = { high: 0, medium: 0, low: 0 };
  publications.forEach(p => {
    const s = Number(p.complianceScore || 0);
    if (s >= 80) buckets.high++;
    else if (s >= 50) buckets.medium++;
    else buckets.low++;
  });
  return buckets;
}

/**
 * identify ambiguous matches (score < threshold)
 */
function ambiguousMatches(publications = [], threshold = 55) {
  return publications.filter(p => {
    const s = Number(p.complianceScore || 0);
    // ambiguous = not high, and has some grant hints (acknowledgements or PI name) OR no ORCID
    return s > 0 && s < threshold;
  });
}

/**
 * quick "policy-engaged" detection via keyword matching (expand list as needed)
 */
const POLICY_KEYWORDS = ['policy', 'government', 'guideline', 'recommend', 'recommendation', 'public health', 'policy brief'];

function policyEngaged(publications = []) {
  return publications.filter(p => {
    const txt = `${p.title || ''} ${p.abstract || ''} ${(p.notes || '')}`.toLowerCase();
    return POLICY_KEYWORDS.some(k => txt.includes(k));
  });
}

/**
 * public API
 */
export function computeKPIs({ publications = [], grants = [] } = {}) {
  const totalPublications = publications.length;
  const matchedGrants = publications.filter(p => (p.matchedGrants || []).length > 0).length;
  const avgCompliance = totalPublications ? Math.round(publications.reduce((s,p)=>s + Number(p.complianceScore||0), 0) / totalPublications) : 0;
  const recentByYear = yearBuckets(publications, 6); // last 6 years
  const geo = geoDistribution(publications);
  const top = topAuthors(publications, 6);
  const compliance = complianceBuckets(publications);
  const ambiguous = ambiguousMatches(publications);
  const policyOutputs = policyEngaged(publications);
  const topGrants = (grants || []).slice().sort((a,b) => (b._count||0) - (a._count||0)).slice(0,6);

  return {
    totalPublications,
    matchedGrants,
    avgCompliance,
    recentByYear,
    geo,
    top,
    compliance,
    ambiguous,
    policyOutputs,
    topGrants
  };
}
