/** Automatic grading rules for the Ask Dhruv scorecard (see scripts/eval-ask.ts). */

const DEVANAGARI_DIGITS = /[०-९]/g;

/** Lower-case, Latin accents removed (Ålesund → alesund), Devanagari digits → 0-9. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .normalize('NFC')
    .replace(DEVANAGARI_DIGITS, (d) => String(d.charCodeAt(0) - 0x0966))
    .toLowerCase();
}

/** Every group must have at least one of its terms in the text. */
export function matchesAll(text: string, groups: string[][]): boolean {
  const t = normalize(text);
  return groups.every((g) => g.some((term) => t.includes(normalize(term))));
}

export function mentionsAny(text: string, terms: string[]): boolean {
  const t = normalize(text);
  return terms.some((term) => t.includes(normalize(term)));
}

const REFUSAL = [
  /couldn['’]?t find/,
  /could not find/,
  /(do|does)(n['’]?t| not) (have|contain|mention|include|say|provide|cover)/,
  /no (information|details|record|mention|data)/,
  /not (available|mentioned|covered|included|in the (archive|sources|dhruv))/,
  /(isn['’]?t|is not|aren['’]?t|are not) (in|part of|covered)/,
  /outside (the )?(scope|archive)/,
  /नहीं मिल/,
  /जानकारी (उपलब्ध )?नहीं/,
  /(उपलब्ध|उल्लेख|शामिल|मौजूद) नहीं/,
  /कोई (जानकारी|उल्लेख|विवरण)/,
];

/** Dhruv says the archive has no answer (English or Hindi). */
export function isRefusal(text: string): boolean {
  const t = normalize(text);
  return REFUSAL.some((r) => r.test(t));
}

/** Answer is in the asked language: Hindi answers keep English names, so use letter shares. */
export function langOk(text: string, locale: 'en' | 'hi'): boolean {
  const letters = text.match(/[A-Za-zऀ-ॿ]/g) ?? [];
  if (!letters.length) return false;
  const share = letters.filter((c) => /[ऀ-ॿ]/.test(c)).length / letters.length;
  return locale === 'hi' ? share > 0.5 : share < 0.1;
}
