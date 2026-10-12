import 'server-only';

/**
 * Live dissemination through a Telegram channel (free Bot API, no app review).
 * Set TELEGRAM_BOT_TOKEN (from @BotFather) and TELEGRAM_CHANNEL_ID (@channel_name, or the numeric
 * -100… id) in .env.local, and add the bot to the channel as an admin. Posting to X, LinkedIn or
 * Instagram needs NCPOR's own accounts and OAuth, so in the prototype an approved social post goes
 * live on DHRUV's Telegram channel instead.
 */

const CAPTION_LIMIT = 1024;
const MESSAGE_LIMIT = 4096;

export function telegramConfigured(): boolean {
  return !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHANNEL_ID);
}

export interface TelegramResult {
  ok: boolean;
  url?: string;
  error?: string;
}

function clip(text: string, limit: number): string {
  return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`;
}

export async function postToTelegram({ text, imageUrl }: { text: string; imageUrl?: string | null }): Promise<TelegramResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHANNEL_ID;
  if (!token || !chat) return { ok: false, error: 'Telegram is not configured.' };

  const method = imageUrl ? 'sendPhoto' : 'sendMessage';
  const payload = imageUrl
    ? { chat_id: chat, photo: imageUrl, caption: clip(text, CAPTION_LIMIT) }
    : { chat_id: chat, text: clip(text, MESSAGE_LIMIT), link_preview_options: { is_disabled: false } };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await res.json()) as { ok: boolean; description?: string; result?: { message_id: number; chat?: { username?: string } } };
    if (!body.ok || !body.result) return { ok: false, error: body.description ?? `Telegram error ${res.status}` };
    const username = body.result.chat?.username ?? (chat.startsWith('@') ? chat.slice(1) : null);
    return { ok: true, url: username ? `https://t.me/${username}/${body.result.message_id}` : undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not reach Telegram.' };
  }
}
