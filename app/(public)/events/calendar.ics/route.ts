import { fetchAssets } from '@/lib/db/supabase';
import { eventsIcs } from '@/lib/feeds';

export const revalidate = 300;

/**
 * GET /events/calendar.ics → every institutional activity as an all-day calendar event.
 * ?id=<asset id> → just that one (the "Add to calendar" link on an event page).
 */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id');
  const events = (await fetchAssets({ type: 'event' })).filter((a) => !id || a.id === id);
  if (id && events.length === 0) return new Response('Event not found', { status: 404 });
  const body = eventsIcs(events, id ? events[0].title : 'DHRUV: NCPOR activities');
  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${id ? 'dhruv-event' : 'dhruv-activities'}.ics"`,
      'Cache-Control': 'public, max-age=300',
    },
  });
}
