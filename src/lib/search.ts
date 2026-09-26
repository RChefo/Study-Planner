/**
 * Forgiving text matching for the command palette: case-insensitive, ignores Arabic
 * diacritics/tatweel and folds common letter variants (أ إ آ → ا, ة → ه, ى → ي).
 */
export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Every query word must appear somewhere in the text. */
export function matchesQuery(text: string, query: string): boolean {
  const hay = normalizeSearch(text);
  return normalizeSearch(query)
    .split(' ')
    .filter(Boolean)
    .every(word => hay.includes(word));
}
