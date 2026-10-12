/**
 * Hindi → English terms for search. Most archive text is English (with Hindi summaries), and the
 * database's full-text index is English, so a Hindi query also searches for the English words.
 * Station names follow the project's glossary (मैत्री, भारती, हिमाद्रि, हिमांश).
 */
const GLOSSARY: [string, string][] = [
  ['दक्षिण गंगोत्री', 'Dakshin Gangotri'],
  ['दक्षिणी ध्रुव', 'South Pole'],
  ['उत्तरी ध्रुव', 'North Pole'],
  ['समुद्री बर्फ़', 'sea ice'],
  ['समुद्री बर्फ', 'sea ice'],
  ['वार्षिक रिपोर्ट', 'annual report'],
  ['वार्षिक प्रतिवेदन', 'annual report'],
  ['मैत्री', 'Maitri'],
  ['भारती', 'Bharati'],
  ['हिमाद्रि', 'Himadri'],
  ['हिमांश', 'Himansh'],
  ['अंटार्कटिका', 'Antarctica'],
  ['अंटार्कटिक', 'Antarctic'],
  ['आर्कटिक', 'Arctic'],
  ['हिमालय', 'Himalaya'],
  ['स्वालबार्ड', 'Svalbard'],
  ['चंद्रा', 'Chandra'],
  ['लद्दाख', 'Ladakh'],
  ['हिमनद', 'glacier'],
  ['ग्लेशियर', 'glacier'],
  ['बर्फ़', 'ice'],
  ['बर्फ', 'ice'],
  ['हिम', 'snow'],
  ['अभियान', 'expedition'],
  ['केंद्र', 'station'],
  ['स्टेशन', 'station'],
  ['मौसम', 'weather'],
  ['तापमान', 'temperature'],
  ['जलवायु', 'climate'],
  ['महासागर', 'ocean'],
  ['समुद्र', 'ocean'],
  ['पेंगुइन', 'penguin'],
  ['झील', 'lake'],
  ['रिपोर्ट', 'report'],
  ['प्रकाशन', 'publication'],
  ['डेटा', 'data'],
  ['आँकड़े', 'data'],
  ['तस्वीर', 'photo'],
  ['फ़ोटो', 'photo'],
  ['वीडियो', 'video'],
  ['कार्यक्रम', 'event'],
  ['संधि', 'treaty'],
  ['डाकघर', 'post office'],
  ['वैज्ञानिक', 'scientific'],
];

const DEVANAGARI = /[ऀ-ॿ]/;

/** English words for the Hindi terms in `query` (longest phrases first, each counted once). */
export function englishTerms(query: string): string[] {
  if (!DEVANAGARI.test(query)) return [];
  let rest = query;
  const found: string[] = [];
  for (const [hi, en] of GLOSSARY) {
    if (rest.includes(hi)) {
      rest = rest.split(hi).join(' ');
      if (!found.includes(en)) found.push(en);
    }
  }
  return found;
}

/**
 * A websearch query that matches either the original words or their English equivalents:
 * "मैत्री का मौसम" → `मैत्री का मौसम or Maitri weather` (Postgres reads "or" as OR).
 */
export function expandQuery(query: string): string {
  const en = englishTerms(query);
  return en.length ? `${query} or ${en.join(' ')}` : query;
}
