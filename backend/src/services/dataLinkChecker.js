import axios from 'axios';

export async function checkDataLink(url) {
  try {
    const res = await axios.head(url, { maxRedirects: 5, timeout: 8000 });
    return { url: res.request.res.responseUrl || url, status: res.status, lastModified: res.headers['last-modified'] || null };
  } catch (err) {
    return { url, error: err.message };
  }
}
