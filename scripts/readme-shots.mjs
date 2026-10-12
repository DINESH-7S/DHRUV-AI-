// Takes the README screenshots into docs/screenshots (app running on :3000).
import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';
const BASE = 'http://localhost:3000';
const DIR = 'docs/screenshots';
mkdirSync(DIR, { recursive: true });
const browser = await chromium.launch();

async function shot(name, path, { locale = 'en', mobile = false, before } = {}) {
  const ctx = await browser.newContext(
    mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } },
  );
  await ctx.addCookies([{ name: 'NEXT_LOCALE', value: locale, domain: 'localhost', path: '/' }]);
  const page = await ctx.newPage();
  await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 120000 });
  if (before) await before(page);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${DIR}/${name}.jpg`, type: 'jpeg', quality: 82 });
  console.log('shot', name);
  await ctx.close();
}

const shotSafe = (...a) => shot(...a).catch((e) => console.log('FAILED', a[0], e.message.split('\n')[0]));
await shotSafe('01-home', '/');
await shotSafe('02-stations', '/', { before: async (p) => { await p.evaluate(() => { const c = [...document.querySelectorAll('canvas, img[src*=poster]')][0]; c?.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(4000); } });
await shotSafe('03-explore', '/explore');
await shotSafe('04-ask', '/ask', {
  before: async (p) => {
    await p.getByRole('button', { name: /What was Dakshin Gangotri/ }).first().click();
    await p.getByText(/Saved answer · /).waitFor({ timeout: 30000 });
    await p.waitForTimeout(3000);
    await p.evaluate(() => window.scrollTo(0, 0));
  },
});
await shotSafe('05-cited-page', '/asset/f97f533d-7865-42de-b653-e7b443e76cbb?page=3').catch(() => {});
await shotSafe('06-accuracy', '/accuracy');
await shotSafe('07-expedition', '/expeditions/SPE-2010');
await shotSafe('08-pack', '/admin/pack');
await shotSafe('09-dashboard', '/admin');
await shotSafe('10-verify', '/verify/post/8CF4F1E3');
await shotSafe('11-hindi', '/', { locale: 'hi' });
await shotSafe('12-mobile', '/ask', { mobile: true });
await browser.close();
