import { fetchContentPosts } from '@/lib/db/supabase';
import { newsRss } from '@/lib/feeds';

export const revalidate = 300;

/** GET /news/rss.xml (?lang=hi for Hindi stories) → RSS 2.0 of published website news. */
export async function GET(req: Request) {
  const hi = new URL(req.url).searchParams.get('lang') === 'hi';
  const posts = (await fetchContentPosts()).filter(
    (p) => (p.channel === 'blog' || p.channel === 'press_release') && p.language === (hi ? 'hi' : 'en'),
  );
  return new Response(newsRss(posts, hi), {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
}
