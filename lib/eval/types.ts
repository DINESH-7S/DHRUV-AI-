export interface EvalQuestion {
  id: string;
  locale: 'en' | 'hi';
  /** 'fact': answerable from the archive. 'refuse': outside the archive, Dhruv should say so. */
  kind: 'fact' | 'refuse';
  q: string;
  /** The verified answer, shown next to Dhruv's. */
  truth: string;
  /** Where the answer was checked. */
  verified_at?: string;
  /** Each inner list: at least one of these must appear in the answer. */
  must?: string[][];
  /** Archive items (8-character id prefixes, or 'directory') that hold the fact. */
  sources?: string[];
  /** For 'refuse': outside answers that must not appear. */
  forbid?: string[];
  /** Why the answer key changed, if it did. */
  key_note?: string;
}

export interface EvalFile {
  about: string;
  questions: EvalQuestion[];
}

export interface EvalResult {
  id: string;
  pass: boolean;
  termsOk: boolean;
  sourceOk: boolean;
  refused: boolean;
  langOk: boolean;
  ms: number;
  answer: string;
  citations: { asset_id: string | null; title: string; href: string }[];
  model: string | null;
  error?: string;
}

export interface EvalRun {
  at: string;
  label: string | null;
  provider: string;
  /** Open-weight model on our own hardware (sovereign mode). */
  open: boolean;
  model: string;
  totals: {
    questions: number;
    passed: number;
    facts: number;
    factsPassed: number;
    refuse: number;
    refusePassed: number;
    langOk: number;
    medianMs: number;
  };
  results: EvalResult[];
}
