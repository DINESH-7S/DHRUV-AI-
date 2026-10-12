import * as z from 'zod/v4';
import { addUsage, generateStructured, type TokenUsage } from './llm';
import { BRIEF_SYSTEM } from './prompts';

/** Official places to look. The model may only choose from these, so it never invents a URL. */
export const BRIEF_SOURCES = [
  { name: 'NCPOR website', url: 'https://ncpor.res.in' },
  { name: 'National Polar Data Center (NPDC)', url: 'https://npdc.ncpor.res.in' },
  { name: 'NCPOR live station data', url: 'https://data.ncpor.res.in' },
  { name: 'Press Information Bureau (Ministry of Earth Sciences releases)', url: 'https://pib.gov.in' },
  { name: 'Ministry of Earth Sciences', url: 'https://moes.gov.in' },
  { name: 'NCPOR official YouTube channel', url: 'https://www.youtube.com/@NCPORGoaVasco' },
  { name: 'NCPOR annual reports (already in the DHRUV archive)', url: '/explore?type=report' },
] as const;

const BriefSchema = z.object({
  title: z.string().describe('Suggested English title for the explainer'),
  title_hi: z.string().describe('Suggested Hindi title in Devanagari'),
  why: z.string().describe('One sentence: what people want to know, in plain words'),
  must_answer: z.array(z.string()).min(2).max(6).describe('Questions the explainer must answer. Do not answer them.'),
  sources: z.array(z.number().int().min(0).max(BRIEF_SOURCES.length - 1)).min(1).max(4).describe('Indexes into the source list'),
  formats: z.array(z.enum(['article', 'video', 'infographic', 'lesson', 'faq'])).min(1).max(3),
});

export type ContentBrief = Omit<z.infer<typeof BriefSchema>, 'sources'> & { sources: { name: string; url: string }[] };

/** A plan for an explainer that would answer questions the archive could not. States no facts. */
export async function draftBrief(questions: string[], usage: TokenUsage): Promise<ContentBrief> {
  const list = BRIEF_SOURCES.map((s, i) => `${i}. ${s.name} (${s.url})`).join('\n');
  const result = await generateStructured({
    tier: 'fast',
    system: BRIEF_SYSTEM,
    schema: BriefSchema,
    content:
      `Questions people asked (the archive had no answer):\n${questions.map((q) => `- ${q}`).join('\n')}\n\n` +
      `Official sources you may point to:\n${list}\n\nWrite the content brief.`,
  });
  addUsage(usage, result.usage);
  const { sources, ...rest } = result.data;
  return { ...rest, sources: [...new Set(sources)].map((i) => ({ ...BRIEF_SOURCES[i] })) };
}
