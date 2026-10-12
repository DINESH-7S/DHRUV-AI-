/**
 * Smoke test for the configured AI provider and embedding model (no database needed).
 *   npm run ai-check
 * Prints the provider, model, a bilingual structured answer, embedding size and timings.
 */
import * as z from 'zod/v4';
import { aiProvider, generateStructured, modelName } from '../lib/ai/llm';
import { embeddingMode, embedQuery } from '../lib/ai/embed';

const Answer = z.object({
  summary_en: z.string().describe('One sentence in English.'),
  summary_hi: z.string().describe('The same sentence in Hindi (Devanagari).'),
  keywords: z.array(z.string()).min(2).max(5),
});

async function main() {
  console.log(`Provider: ${aiProvider()} (${modelName('smart')}) · embeddings: ${embeddingMode()}`);

  let t = Date.now();
  const result = await generateStructured({
    tier: 'smart',
    system: 'You write short, factual catalogue text about polar research. Use only the facts given.',
    schema: Answer,
    content: 'Maitri is India\'s second permanent research station in Antarctica, commissioned in 1989 in the Schirmacher Oasis. Summarise this.',
    maxTokens: 400,
  });
  console.log(`Structured output in ${((Date.now() - t) / 1000).toFixed(1)} s (${result.usage.input} in / ${result.usage.output} out tokens):`);
  console.log(JSON.stringify(result.data, null, 2));

  t = Date.now();
  const vector = await embedQuery('मैत्री स्टेशन कब स्थापित हुआ?');
  console.log(`Query embedding: ${vector ? `${vector.length} dimensions` : 'FAILED (keyword fallback)'} in ${((Date.now() - t) / 1000).toFixed(1)} s`);
}

main().catch(err => {
  console.error('AI check failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
