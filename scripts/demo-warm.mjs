// Opens every page of the demo once, so nothing is slow while recording.
//   npm run demo:warm      (with `npm run demo` already running)
const BASE = process.env.DEMO_URL ?? 'http://localhost:3000';
const PAGES = [
  '/', '/explore', '/expeditions', '/expeditions/SPE-2010', '/videos', '/gallery', '/events', '/news', '/learn',
  '/ask', '/accuracy', '/verify', '/verify/post/8CF4F1E3', '/login', '/about',
  '/asset/cf1a3665-da5a-4bd4-9186-726161c05cfb', '/asset/cf1a3665-da5a-4bd4-9186-726161c05cfb?page=3',
  '/api/explore?facets=1', '/api/explore?search=&type=all&region=all&station_id=all&expedition_id=all',
];
for (const locale of ['en', 'hi']) {
  for (const p of PAGES) {
    const t = Date.now();
    const res = await fetch(BASE + p, { headers: { cookie: `NEXT_LOCALE=${locale}` } }).catch((e) => ({ status: e.message }));
    await res.arrayBuffer?.();
    console.log(`${res.status}  ${String(Date.now() - t).padStart(5)} ms  ${locale}  ${p}`);
  }
}
// The sample question answers instantly (saved), but open it once too.
const t = Date.now();
await fetch(BASE + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: 'What was Dakshin Gangotri?', locale: 'en' }) });
console.log(`Ask Dhruv sample: ${Date.now() - t} ms\nReady to record.`);
