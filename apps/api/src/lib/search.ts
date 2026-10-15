/**
 * PostgreSQL büyük/küçük harf duyarsız aramada "I" harfini "i" yapıyor, bu yüzden
 * "YILMAZ" araması "Yılmaz"ı bulamıyor. Terimin Türkçe küçültülmüş hâli de aranarak çözülüyor.
 */
export function searchTerms(term: string): string[] {
  return [...new Set([term, term.toLocaleLowerCase("tr-TR")])];
}

/** Terimin her hâli için büyük/küçük harf duyarsız `contains` filtrelerini OR ile birleştirir. */
export function containsAny<T>(term: string, build: (contains: { contains: string; mode: "insensitive" }) => T[]): T[] {
  return searchTerms(term).flatMap((variant) => build({ contains: variant, mode: "insensitive" }));
}
