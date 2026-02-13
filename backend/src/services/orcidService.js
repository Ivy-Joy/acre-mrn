import axios from 'axios';
export async function fetchOrcidProfile(orcid) {
  try {
    const url = `https://pub.orcid.org/v3.0/${orcid}`;
    const res = await axios.get(url, { headers: { Accept: 'application/json' }});
    // Simplify response
    const r = res.data;
    return {
      orcid,
      name: r['person']?.['name'] ? `${r.person.name['given-names']?.value || ''} ${r.person.name['family-name']?.value || ''}`.trim() : '',
      bio: r['person']?.biography?.content,
      affiliations: (r['activities-summary']?.employments?.employment-summary || []).map(e => e.organization?.name)
    };
  } catch (err) {
    console.warn('ORCID fetch error', orcid, err.message);
    return null;
  }
}
