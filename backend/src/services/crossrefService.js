//src/services/crossrefService.js
import axios from 'axios';
const CROSSLREF_BASE = 'https://api.crossref.org/works';

export async function fetchCrossrefByDOI(doi) {
  try {
    const url = `${CROSSLREF_BASE}/${encodeURIComponent(doi)}`;
    const res = await axios.get(url, { headers: { 'User-Agent': `acre-app (${process.env.CROSSREF_MAILTO})` }});
    const m = res.data.message;
    return {
      doi: m.DOI,
      title: (m.title && m.title[0]) || '',
      published: m.created,
      authors: (m.author || []).map(a => ({ name: `${a.given || ''} ${a.family || ''}`.trim() }))
    };
  } catch (err) {
    console.error('Crossref fetch fail', err.message);
    throw err;
  }
}
