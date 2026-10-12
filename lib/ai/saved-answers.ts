import file from '@/content/ask/saved.json';
import type { ChatAnswer, Citation } from './chat';

/**
 * Saved answers for the sample questions on the Ask page: real answers made ahead of time by
 * `npm run save-answers` through the same code path as the live page. Serving them keeps the
 * samples instant and working even when the free AI allowance runs out during a demo. The page
 * labels them as saved, with the date and the model that wrote them.
 */
export interface SavedAnswer {
  question: string;
  locale: 'en' | 'hi';
  answer: string;
  citations: Citation[];
  engine: { model: string; open: boolean };
  /** ISO time the answer was made. */
  at: string;
}

/** Case, spacing and a trailing "?", "।" or "." don't change the question. */
export function normalizeQuestion(text: string): string {
  return text.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').replace(/[\s?？।.!]+$/u, '').trim();
}

const saved = new Map(
  (file.answers as SavedAnswer[]).map((a) => [`${a.locale}|${normalizeQuestion(a.question)}`, a]),
);

export function findSavedAnswer(question: string, locale: 'en' | 'hi'): (ChatAnswer & { saved: { at: string } }) | null {
  const hit = saved.get(`${locale}|${normalizeQuestion(question)}`);
  if (!hit) return null;
  return { answer: hit.answer, citations: hit.citations, engine: hit.engine, saved: { at: hit.at } };
}
