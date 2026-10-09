/**
 * PostgreSQL's case-insensitive matching lowercases "I" to "i", so "YILMAZ" would
 * not find "Yılmaz". Searching the Turkish-lowercased term as well covers that.
 */
export function searchTerms(term: string): string[] {
  return [...new Set([term, term.toLocaleLowerCase("tr-TR")])];
}

/** Builds an OR of case-insensitive `contains` filters over every term variant. */
export function containsAny<T>(term: string, build: (contains: { contains: string; mode: "insensitive" }) => T[]): T[] {
  return searchTerms(term).flatMap((variant) => build({ contains: variant, mode: "insensitive" }));
}
