// Simple parser: searches for grant identifiers like DEL-15-011
export function findGrantIds(text) {
  if (!text) return [];
  const regex = /[A-Z]{2,5}-\d{2,4}-\d{2,4}/g; // simplistic; customize for your IDs
  const found = text.match(regex);
  return found ? Array.from(new Set(found)) : [];
}
