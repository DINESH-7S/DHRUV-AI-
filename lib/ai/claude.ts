import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type * as z from 'zod/v4';
import { requireEnv } from '../env';
import { addUsage, AIOutputError, type LLMContent, type ModelTier, type StructuredRequest, type StructuredResult, type TokenUsage } from './types';

export const CLAUDE_MODELS: Record<ModelTier, string> = {
  smart: 'claude-sonnet-5',
  fast: 'claude-haiku-4-5',
};

let client: Anthropic | null = null;

function anthropic(): Anthropic {
  if (!client) {
    // SDK retries 408/409/429/5xx and connection errors with backoff.
    client = new Anthropic({ apiKey: requireEnv('ANTHROPIC_API_KEY'), maxRetries: 3, timeout: 180_000 });
  }
  return client;
}

function toAnthropicContent(content: LLMContent): Anthropic.MessageParam['content'] {
  if (typeof content === 'string') return content;
  return content.map((part): Anthropic.ContentBlockParam => {
    switch (part.type) {
      case 'text':
        return { type: 'text', text: part.text };
      case 'image':
        return { type: 'image', source: { type: 'base64', media_type: part.mediaType, data: part.data } };
      case 'pdf':
        return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: part.data } };
      case 'youtube':
        return { type: 'text', text: `Video link (not watchable by this model; use the metadata only): ${part.url}` };
    }
  });
}

/**
 * One Claude call whose response is constrained to `schema` (structured outputs) and
 * validated with Zod. Retries once if the output fails validation.
 */
export async function claudeStructured<S extends z.ZodType>(request: StructuredRequest<S>): Promise<StructuredResult<z.infer<S>>> {
  const model = CLAUDE_MODELS[request.tier];
  const usage: TokenUsage = { input: 0, output: 0 };
  let lastProblem = '';

  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await anthropic().messages.parse({
      model,
      max_tokens: request.maxTokens ?? 16000,
      system: request.system,
      messages: [{ role: 'user', content: toAnthropicContent(request.content) }],
      output_config: {
        format: zodOutputFormat(request.schema),
        // Effort is not supported on Haiku 4.5.
        ...(request.tier === 'smart' ? { effort: 'medium' as const } : {}),
      },
    }, request.timeoutMs ? { timeout: request.timeoutMs } : undefined);
    addUsage(usage, { input: response.usage.input_tokens, output: response.usage.output_tokens });

    if (response.stop_reason === 'refusal') {
      throw new AIOutputError(
        `Claude declined this request${response.stop_details?.explanation ? `: ${response.stop_details.explanation}` : '.'}`,
      );
    }
    if (response.stop_reason === 'max_tokens') {
      lastProblem = 'the response hit the max_tokens limit';
      continue;
    }
    if (response.parsed_output != null) {
      return { data: response.parsed_output as z.infer<S>, usage, model };
    }
    lastProblem = 'the response did not match the expected schema';
  }

  throw new AIOutputError(`Claude output was unusable: ${lastProblem}.`);
}
