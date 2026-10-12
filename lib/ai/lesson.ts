import 'server-only';
import * as z from 'zod/v4';
import type { Asset, GradeBand, QuizQuestion } from '../types/database';
import { isAiMock } from '../env';
import { mockDelay } from './fixtures';
import { addUsage, AIOutputError, generateStructured, modelName, type TokenUsage } from './llm';
import { LESSON_SYSTEM } from './prompts';

const OPTIONS_PER_QUESTION = 4;
const MIN_QUESTIONS = 5;
/** Enough source text to ground a lesson without sending a whole annual report. */
export const LESSON_SOURCE_CHARS = 40_000;

const GRADE_GUIDE: Record<GradeBand, string> = {
  '6-8': 'Classes 6-8 (ages 11-14): short sentences, everyday comparisons, define every technical word, 350-500 words.',
  '9-10': 'Classes 9-10 (ages 14-16): connect to NCERT science and geography topics, introduce scientific terms with definitions, 450-650 words.',
  '11-12': 'Classes 11-12 (ages 16-18): explain mechanisms and methods, link to physics/chemistry/geography concepts and careers in polar science, 600-800 words.',
};

const LessonSchema = z.object({
  title: z.string().describe('Engaging lesson title for students.'),
  learning_objectives: z.array(z.string()).describe('3-4 objectives, each starting with "Students will be able to...".'),
  content_md: z
    .string()
    .describe('The lesson in Markdown with these "## " sections: What is this about?, Key ideas, Did you know?, Glossary (bulleted "**term**: meaning"), Think about it (2 discussion questions).'),
  questions: z
    .array(
      z.object({
        q: z.string().describe('Question text.'),
        options: z.array(z.string()).describe(`Exactly ${OPTIONS_PER_QUESTION} answer options.`),
        answer_index: z.number().int().describe('Index (0-based) of the single correct option.'),
        explanation: z.string().describe('One or two sentences explaining why that answer is correct, referring to the lesson.'),
      }),
    )
    .describe('6-8 multiple-choice questions answerable from the lesson.'),
});

export interface GeneratedLesson {
  title: string;
  learning_objectives: string[];
  content_md: string;
  questions: QuizQuestion[];
  model: string;
  mock: boolean;
}

function isValidQuestion(q: QuizQuestion): boolean {
  return (
    !!q.q.trim() &&
    q.options.length === OPTIONS_PER_QUESTION &&
    q.options.every((o) => o.trim()) &&
    new Set(q.options.map((o) => o.trim().toLowerCase())).size === OPTIONS_PER_QUESTION &&
    Number.isInteger(q.answer_index) &&
    q.answer_index >= 0 &&
    q.answer_index < OPTIONS_PER_QUESTION
  );
}

/** Correct answers cluster on one letter in LLM output; shuffle options so the key is not guessable. */
function shuffleOptions(q: QuizQuestion): QuizQuestion {
  const order = q.options.map((_, i) => i).sort(() => Math.random() - 0.5);
  return { ...q, options: order.map((i) => q.options[i]), answer_index: order.indexOf(q.answer_index) };
}

/** Share of letters that are Devanagari decides the language: Hindi lessons keep English terms in brackets. */
function inLanguage(text: string, language: 'en' | 'hi'): boolean {
  const letters = text.match(/[A-Za-zऀ-ॿ]/g) ?? [];
  if (letters.length === 0) return true;
  const devanagari = letters.filter((c) => /[ऀ-ॿ]/.test(c)).length / letters.length;
  return language === 'hi' ? devanagari > 0.5 : devanagari < 0.1;
}

export async function generateLesson(
  asset: Asset,
  sourceText: string,
  gradeBand: GradeBand,
  language: 'en' | 'hi',
  usage: TokenUsage,
): Promise<GeneratedLesson> {
  if (isAiMock()) {
    await mockDelay();
    return mockLesson(asset, gradeBand);
  }

  const source = [
    `Title: ${asset.title}`,
    `Type: ${asset.type} | Region: ${asset.region} | Year: ${asset.year}`,
    `Summary: ${asset.ai_summary || asset.description}`,
    asset.ai_metadata?.key_findings?.length ? `Key findings:\n- ${asset.ai_metadata.key_findings.join('\n- ')}` : null,
    sourceText ? `Source text:\n${sourceText.slice(0, LESSON_SOURCE_CHARS)}` : null,
  ]
    .filter(Boolean)
    .join('\n\n');

  const instruction =
    language === 'hi'
      ? 'OUTPUT LANGUAGE: Hindi. Write the whole lesson and quiz in Hindi (Devanagari), with the English scientific term in brackets the first time it appears, even if the source is in English.\n'
      : 'OUTPUT LANGUAGE: English. Write the whole lesson, title and quiz in English, even if the source is in Hindi.\n';
  const ask = (reminder = '') =>
    generateStructured({
      tier: 'smart',
      system: LESSON_SYSTEM,
      schema: LessonSchema,
      content: `<source>\n${source}\n</source>\n\nAudience: ${GRADE_GUIDE[gradeBand]}\n${instruction}${reminder}Write the lesson and its quiz.`,
    });

  // Models sometimes drift into the source's language; check the output and retry once.
  let result = await ask();
  addUsage(usage, result.usage);
  if (!inLanguage(`${result.data.title} ${result.data.content_md}`, language)) {
    result = await ask(
      `Your previous attempt was not in ${language === 'hi' ? 'Hindi' : 'English'}. Every heading, sentence, question and option must be in ${language === 'hi' ? 'Hindi (Devanagari)' : 'English'}.\n`,
    );
    addUsage(usage, result.usage);
    if (!inLanguage(`${result.data.title} ${result.data.content_md}`, language)) {
      throw new AIOutputError(`The lesson came back in the wrong language. Try again.`);
    }
  }

  const questions = result.data.questions.filter(isValidQuestion).map(shuffleOptions);
  if (questions.length < MIN_QUESTIONS) {
    throw new AIOutputError(`Only ${questions.length} usable quiz questions were generated. Try again.`);
  }
  return {
    title: result.data.title.trim(),
    learning_objectives: result.data.learning_objectives,
    content_md: result.data.content_md.trim(),
    questions,
    model: result.model || modelName('smart'),
    mock: false,
  };
}

function mockLesson(asset: Asset, gradeBand: GradeBand): GeneratedLesson {
  const summary = asset.ai_summary_simple || asset.description || asset.title;
  const questions: QuizQuestion[] = Array.from({ length: MIN_QUESTIONS }, (_, i) => ({
    q: `[Demo] Question ${i + 1}: which region is "${asset.title}" about?`,
    options: ['Antarctica', 'The Arctic', 'The Himalaya', 'The Southern Ocean'],
    answer_index: ['antarctic', 'arctic', 'himalaya', 'southern_ocean'].indexOf(asset.region),
    explanation: `The item is catalogued under the ${asset.region} region.`,
  }));
  return {
    title: `[Demo] ${asset.title} (Classes ${gradeBand})`,
    learning_objectives: ['Students will be able to describe what this research item is about.'],
    content_md: `## What is this about?\n\n${summary}\n\n## Key ideas\n\n- Demo mode: this lesson was not written by AI.\n`,
    questions,
    model: 'mock',
    mock: true,
  };
}
