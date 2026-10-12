import 'server-only';
import * as z from 'zod/v4';
import type { Asset, SocialChannel } from '../types/database';
import { isAiMock } from '../env';
import { addUsage, AIOutputError, generateStructured, modelName, type TokenUsage } from './llm';
import { mockDelay } from './fixtures';
import { CAMPAIGN_SYSTEM } from './prompts';

export const CHANNELS = ['x', 'instagram', 'linkedin', 'facebook', 'blog', 'press_release', 'newsletter'] as const satisfies readonly SocialChannel[];
export type CampaignLanguage = 'en' | 'hi';

/** X counts every URL as 23 characters; we count the raw text, which is stricter. */
export const X_CHAR_LIMIT = 280;

const CHANNEL_GUIDE: Record<SocialChannel, string> = {
  x: `X (Twitter): one post. body + a space + hashtags must total at most ${X_CHAR_LIMIT - 10} characters. One clear hook, one fact, then the link. 1-2 hashtags. At most one emoji.`,
  instagram: 'Instagram caption: 100-150 words. Open with a vivid first line, short paragraphs, 1-3 emojis. End with "Link in bio." (no URL). 8-12 hashtags.',
  linkedin: 'LinkedIn post: 150-250 words, professional. What was studied, why it matters for India and for climate science, and the link at the end. 3-5 hashtags.',
  facebook: 'Facebook post: 80-150 words, friendly and accessible to families and students. Include the link. 2-4 hashtags.',
  blog: 'Blog article for the DHRUV portal: 400-600 words in Markdown. Start with "# " headline, then an intro paragraph, 2-3 "## " subheadings, and a closing paragraph pointing to the full record at the link. No hashtags (empty list).',
  press_release: 'Draft press release for a communications officer to review before issuing: headline line, one-sentence sub-headline, 3-5 factual paragraphs using only facts from the brief, then a one-line "Source:" credit to NCPOR and the link. No dateline, no release date, no quotes, no contact details: the officer adds those. No hashtags (empty list).',
  newsletter: 'Email newsletter blurb: 80-120 words with a one-line title, then the summary, ending with "Read more: <link>". No hashtags (empty list).',
};

const LANGUAGE_GUIDE: Record<CampaignLanguage, string> = {
  en: 'Write every post in English.',
  hi: 'Write every post in Hindi (Devanagari), as used by Indian government science communication. Keep proper nouns and the link unchanged. Hashtags may mix Hindi and English (e.g. #NCPOR #अंटार्कटिका).',
};

const CampaignSchema = z.object({
  posts: z
    .array(
      z.object({
        channel: z.enum(CHANNELS),
        body: z.string().describe('The post exactly as it will be published, WITHOUT the hashtags.'),
        hashtags: z.array(z.string()).describe('Hashtags, each starting with #. Empty for blog, press_release and newsletter.'),
      }),
    )
    .describe('Exactly one entry per requested channel.'),
});

export interface GeneratedPost {
  channel: SocialChannel;
  language: CampaignLanguage;
  body: string;
  hashtags: string[];
}

export interface CampaignResult {
  posts: GeneratedPost[];
  model: string;
  mock: boolean;
}

/** Full text as it would appear on the platform. */
export function renderPost(post: Pick<GeneratedPost, 'body' | 'hashtags'>): string {
  return post.hashtags.length ? `${post.body}\n\n${post.hashtags.join(' ')}` : post.body;
}

/** Returns a problem description, or null if the post is acceptable for its channel. */
export function validatePost(post: Pick<GeneratedPost, 'channel' | 'body' | 'hashtags'>): string | null {
  if (!post.body.trim()) return 'is empty';
  if (post.channel === 'x') {
    const length = `${post.body} ${post.hashtags.join(' ')}`.trim().length;
    if (length > X_CHAR_LIMIT) return `is ${length} characters; X allows ${X_CHAR_LIMIT}`;
  }
  return null;
}

function normalizeHashtags(tags: string[]): string[] {
  const clean = tags
    .map((t) => t.trim().replace(/\s+/g, ''))
    .filter(Boolean)
    .map((t) => (t.startsWith('#') ? t : `#${t}`));
  return [...new Set(clean)];
}

function brief(asset: Asset, language: CampaignLanguage, link: string): string {
  const meta = asset.ai_metadata ?? {};
  const lines = [
    `Title: ${asset.title}`,
    asset.title_hi ? `Hindi title: ${asset.title_hi}` : null,
    `Type: ${asset.type} | Region: ${asset.region} | Year: ${asset.year}`,
    asset.authors?.length ? `Authors: ${asset.authors.join(', ')}` : null,
    `Summary: ${asset.ai_summary || asset.description}`,
    asset.ai_summary_simple ? `Plain-language summary: ${asset.ai_summary_simple}` : null,
    language === 'hi' && asset.ai_summary_hi ? `Hindi summary: ${asset.ai_summary_hi}` : null,
    meta.key_findings?.length ? `Key findings:\n- ${meta.key_findings.join('\n- ')}` : null,
    asset.ai_keywords?.length ? `Keywords: ${asset.ai_keywords.join(', ')}` : null,
    asset.ai_caption ? `Photo caption: ${asset.ai_caption}` : null,
    `Link to the full record: ${link}`,
  ];
  return `<brief>\n${lines.filter(Boolean).join('\n')}\n</brief>`;
}

async function generateForLanguage(
  asset: Asset,
  channels: SocialChannel[],
  language: CampaignLanguage,
  link: string,
  usage: TokenUsage,
): Promise<GeneratedPost[]> {
  const request = (wanted: SocialChannel[], note = '') =>
    `${brief(asset, language, link)}\n\n${LANGUAGE_GUIDE[language]}\n\n` +
    `Write one post for each of these channels:\n${wanted.map((c) => `- ${c}: ${CHANNEL_GUIDE[c]}`).join('\n')}` +
    (note ? `\n\n${note}` : '');

  const result = await generateStructured({ tier: 'smart', system: CAMPAIGN_SYSTEM, schema: CampaignSchema, content: request(channels) });
  addUsage(usage, result.usage);

  const byChannel = new Map<SocialChannel, GeneratedPost>();
  for (const p of result.data.posts) {
    if (channels.includes(p.channel) && !byChannel.has(p.channel)) {
      byChannel.set(p.channel, { channel: p.channel, language, body: p.body.trim(), hashtags: normalizeHashtags(p.hashtags) });
    }
  }

  // One repair pass for channels that were missing or broke their limits.
  const problems = channels
    .map((c) => ({ channel: c, problem: byChannel.has(c) ? validatePost(byChannel.get(c)!) : 'was missing' }))
    .filter((p): p is { channel: SocialChannel; problem: string } => p.problem !== null);

  if (problems.length > 0) {
    const repair = await generateStructured({
      tier: 'smart',
      system: CAMPAIGN_SYSTEM,
      schema: CampaignSchema,
      content: request(
        problems.map((p) => p.channel),
        `Previous attempt problems: ${problems.map((p) => `${p.channel} ${p.problem}`).join('; ')}. Fix them.`,
      ),
    });
    addUsage(usage, repair.usage);
    for (const p of repair.data.posts) {
      if (problems.some((x) => x.channel === p.channel)) {
        byChannel.set(p.channel, { channel: p.channel, language, body: p.body.trim(), hashtags: normalizeHashtags(p.hashtags) });
      }
    }
  }

  return channels.map((channel) => {
    const post = byChannel.get(channel);
    if (!post) throw new AIOutputError(`The AI did not produce a ${channel} post.`);
    // Last resort for X: drop hashtags before giving up.
    while (post.channel === 'x' && validatePost(post) && post.hashtags.length > 0) post.hashtags.pop();
    const problem = validatePost(post);
    if (problem) throw new AIOutputError(`The ${channel} post ${problem}. Try generating again.`);
    return post;
  });
}

export async function generateCampaign(
  asset: Asset,
  channels: SocialChannel[],
  languages: CampaignLanguage[],
  link: string,
  usage: TokenUsage,
): Promise<CampaignResult> {
  if (isAiMock()) {
    await mockDelay();
    return { posts: languages.flatMap((lang) => channels.map((c) => mockPost(asset, c, lang, link))), model: 'mock', mock: true };
  }
  const perLanguage = await Promise.all(languages.map((lang) => generateForLanguage(asset, channels, lang, link, usage)));
  return { posts: perLanguage.flat(), model: modelName('smart'), mock: false };
}

// ---------------------------------------------------------------------------
// AI_MOCK=true templates
// ---------------------------------------------------------------------------

function mockPost(asset: Asset, channel: SocialChannel, language: CampaignLanguage, link: string): GeneratedPost {
  const summary = asset.ai_summary_simple || asset.description || asset.title;
  const hi = language === 'hi';
  const title = hi && asset.title_hi ? asset.title_hi : asset.title;
  const lead = hi ? `NCPOR के संग्रह से: ${title}` : `From NCPOR's archive: ${title}`;
  const tags = hi ? ['#NCPOR', '#ध्रुवीय_विज्ञान'] : ['#NCPOR', '#PolarScience'];

  const bodies: Record<SocialChannel, string> = {
    x: `${lead.slice(0, 150)} ${link}`,
    instagram: `${lead}\n\n${summary}\n\nLink in bio.`,
    linkedin: `${lead}\n\n${summary}\n\n${link}`,
    facebook: `${lead}\n\n${summary}\n\n${link}`,
    blog: `# ${title}\n\n${summary}\n\n## ${hi ? 'और जानें' : 'Learn more'}\n\n${link}`,
    press_release: `${title}\n\n${summary}\n\nSource: NCPOR archive.\n\n${link}`,
    newsletter: `${title}\n\n${summary}\n\nRead more: ${link}`,
  };
  const noTags = channel === 'blog' || channel === 'press_release' || channel === 'newsletter';
  return { channel, language, body: `[Demo] ${bodies[channel]}`, hashtags: noTags ? [] : tags };
}
