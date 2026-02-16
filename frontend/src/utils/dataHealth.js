// compute a dataHealth object client-side from a publication object
export function computeDataHealth(pub) {
  let score = 0;
  const issues = [];
  const checks = {};

  checks.doi = !!pub.doi;
  if (checks.doi) score += 10;

  checks.dataLink = (pub.dataLinks || []).length > 0;
  if (checks.dataLink) score += 15;

  checks.grantMentioned = /DEL-|GRANT-|DELTAS|THRiVE|grant/i.test(pub.acknowledgementText || '');
  if (checks.grantMentioned) score += 20;

  const hasOrcid = (pub.authors || []).some(a => !!a.orcid);
  checks.hasOrcid = hasOrcid;
  if (hasOrcid) score += 10;

  const allAff = (pub.authors || []).length > 0 && (pub.authors || []).every(a => !!a.affiliation);
  checks.affiliationsComplete = allAff;
  if (allAff) score += 10;

  const txt = (pub.abstract || '') + ' ' + (pub.notes || '');
  const methods = /(method|study|design|regression|anova)/i.test(txt);
  const sample = /(N=|participants|sample size|n =|n=)/i.test(txt);
  checks.methodsPresent = methods;
  checks.sampleSizePresent = sample;
  if (methods && sample) score += 15;

  // version
  checks.isLatest = !/v0|preprint|superseded/i.test(pub.version || '');
  if (checks.isLatest) score += 10;

  const lod = /(limit of detection|LOD|LOQ)/i.test(txt);
  checks.lodHandling = lod;
  if (lod) score += 10;

  score = Math.max(0, Math.min(100, Math.round(score)));

  return { score, issues, checks };
}
