import { chromium } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
// Usage: npm run a11y (site running; E2E_BASE_URL defaults to http://localhost:3000). WCAG 2.1 AA via axe-core, EN and HI.
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const pages = ['/', '/explore', '/expeditions', '/expeditions/SPE-2010', '/events', '/gallery', '/videos', '/learn', '/news', '/ask', '/accuracy', '/about', '/verify', '/stations/601ccc7e-be07-4c1a-822a-da2db5cdb765', '/asset/74ffaeff-2404-44de-b3c3-82786304040d'];
const browser = await chromium.launch();
let total = 0;
for (const locale of ['en', 'hi']) {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  await ctx.addCookies([{ name: 'NEXT_LOCALE', value: locale, domain: 'localhost', path: '/' }]);
  const page = await ctx.newPage();
  for (const p of pages) {
    await page.goto(BASE + p, { waitUntil: 'networkidle' });
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    total += r.violations.length;
    for (const v of r.violations) console.log(`${locale} ${p}: ${v.id} (${v.impact}) ×${v.nodes.length} · ${v.nodes[0].target.join(' ')} · ${v.nodes[0].failureSummary?.split('\n')[1]?.trim().slice(0, 140)}`);
  }
  await ctx.close();
}
console.log('violations:', total);
await browser.close();
if (total) process.exit(1);
