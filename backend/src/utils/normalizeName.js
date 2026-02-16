import doubleMetaphone from 'double-metaphone';

/**
 * Normalize a personal name:
 * - lowercase, remove punctuation, strip diacritics
 * - split tokens, build 3-grams per token and metaphone
 */
export function normalizeName(name) {
  if (!name || typeof name !== 'string') return {
    canonical: '',
    tokens: [],
    metaphone: '',
    ngrams: []
  };

  // Remove titles common to academia
  const titlesRegex = /\b(dr|prof|professor|mr|mrs|ms|miss)\b\.?/gi;
  let s = name.replace(titlesRegex, ' ');

  // remove parentheses and extra punctuation; keep letters/numbers/space
  s = s.normalize('NFD').replace(/\p{Diacritic}/gu, ''); // strip diacritics
  s = s.replace(/[^\p{L}\p{N}\s]/gu, ' ').toLowerCase().trim();
  s = s.replace(/\s+/g, ' ');

  const tokens = s.split(' ').filter(Boolean);

  // double metaphone: returns [primary, alternate]
  let metaphoneJoined = '';
  try {
    const dm = doubleMetaphone(s);
    metaphoneJoined = Array.isArray(dm) ? dm.join('|') : String(dm);
  } catch (e) {
    metaphoneJoined = '';
  }

  // build simple character trigrams per token
  const ngrams = tokens.flatMap(t => {
    const padded = `__${t}__`;
    const out = [];
    for (let i = 0; i < Math.max(0, padded.length - 2); i++) out.push(padded.substr(i, 3));
    return out;
  });

  return {
    canonical: s,
    tokens,
    metaphone: metaphoneJoined,
    ngrams
  };
}
