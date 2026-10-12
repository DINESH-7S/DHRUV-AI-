// Records the demo as a silent 1080p screen video, timed to the team's narration (about 2:10).
//   npm run demo   (in one window)   then   node scripts/record-demo.mjs
// Output: demo-video/dhruv-demo.mp4. Add the voice-over in any editor.
import { chromium } from '@playwright/test';
import { execFileSync } from 'child_process';
import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync } from 'fs';

const BASE = 'http://localhost:3000';
const OUT = 'demo-video-final';
const SIZE = { width: 1920, height: 1080 };
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// A visible pointer: headless recordings have none.
const CURSOR = `
  addEventListener('DOMContentLoaded', () => {
    const c = document.createElement('div');
    c.style.cssText = 'position:fixed;left:0;top:0;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;' +
      'background:rgba(255,255,255,.9);box-shadow:0 0 0 3px rgba(91,191,230,.55),0 4px 14px rgba(0,0,0,.5);' +
      'pointer-events:none;z-index:2147483647;transition:transform .12s;transform:translate(960px,540px)';
    document.body.appendChild(c);
    const xy = JSON.parse(sessionStorage.getItem('cur') || '[960,540]');
    c.style.transform = 'translate(' + xy[0] + 'px,' + xy[1] + 'px)';
    addEventListener('mousemove', (e) => { c.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)'; sessionStorage.setItem('cur', JSON.stringify([e.clientX, e.clientY])); }, true);
    addEventListener('mousedown', () => { c.style.transform += ' scale(.7)'; }, true);
    addEventListener('mouseup', () => { c.style.transform = c.style.transform.replace(' scale(.7)', ''); }, true);
  });`;

// A visible browser: the hidden one cannot show PDFs, and it draws the globe faster with the GPU.
const browser = await chromium.launch({ headless: false, args: ['--window-size=1920,1080', '--window-position=0,0'] });

// 1. Sign in and warm every page off camera (seeded test account, localhost only).
const pw = /const DEMO_PASSWORD = '([^']+)'/.exec(readFileSync('scripts/seed.ts', 'utf8'))[1];
const warm = await browser.newContext({ viewport: SIZE });
const lp = await warm.newPage();
// With LOCAL_DEMO_USER set, /login goes straight to /admin; otherwise sign in.
await lp.goto(BASE + '/login?next=/admin');
if (new URL(lp.url()).pathname === '/login') {
  await lp.locator('input[type="email"]').fill('reviewer@dhruv.dev');
  await lp.locator('input[type="password"]').fill(pw);
  await lp.locator('form button[type="submit"]').click();
  await lp.waitForURL((u) => u.pathname.startsWith('/admin'), { timeout: 60000 });
}
for (const p of ['/asset/cf1a3665-da5a-4bd4-9186-726161c05cfb?page=3', '/', '/ask', '/accuracy', '/admin/pack', '/admin/studio', '/verify/post/8CF4F1E3']) {
  await lp.goto(BASE + p, { waitUntil: 'networkidle' }).catch(() => {});
}
const state = await warm.storageState();
await warm.close();

// 2. Record.
const ctx = await browser.newContext({ viewport: SIZE, storageState: state, recordVideo: { dir: OUT, size: SIZE } });
await ctx.addCookies([{ name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' }]);
await ctx.addInitScript(CURSOR);
const page = await ctx.newPage();
const start = Date.now();
const now = () => (Date.now() - start) / 1000;
/** Wait until the video clock reaches `t` seconds (keeps every scene on the narration). */
const until = async (t) => { const ms = (t - now()) * 1000; if (ms > 0) await page.waitForTimeout(ms); };
const mark = (label) => console.log(`${now().toFixed(1).padStart(6)} s  ${label}`);
let mouse = { x: 960, y: 540 };
const moveTo = async (x, y, ms = 600) => {
  await page.mouse.move(x, y, { steps: Math.max(6, Math.round(ms / 50)) });
  mouse = { x, y };
};
const clickOn = async (locator) => {
  await locator.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
  const b = await locator.boundingBox();
  if (!b) return false;
  await moveTo(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(350);
  await page.mouse.down(); await page.mouse.up();
  return true;
};
const glide = (px, seconds) =>
  // One smooth scroll animated inside the page (wheel events are too slow while recording).
  page.evaluate(([px, ms]) => new Promise((done) => {
    const lenis = window.lenis; if (lenis) lenis.stop?.();
    const from = window.scrollY, t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms), e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      window.scrollTo(0, from + px * e);
      if (k < 1) requestAnimationFrame(step); else { lenis?.start?.(); done(); }
    };
    requestAnimationFrame(step);
  }), [px, seconds * 1000]);
const go = async (path) => { await page.goto(BASE + path, { waitUntil: 'networkidle' }).catch(() => {}); await page.mouse.move(mouse.x, mouse.y); };

// 0:00 "Hi everyone, we're presenting DHRUV…" — home hero
await go('/');
mark('home');
await until(9);
await glide(1000, 7);                       // "…scattered across PDFs, videos…"
await until(20);

// 0:20 "India's major research stations…" — globe and stations
const maitri = page.locator('button:not(.globe-marker)', { hasText: /^Maitri/ }).first();
if (await maitri.count()) {
  await maitri.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(600);
  await clickOn(maitri);
}
mark('stations');
await until(28);
await glide(1500, 5);                        // "…complete expedition timeline"
mark('timeline');
await until(36);

// 0:36 "Now, this is Ask DHRUV…"
await go('/ask');
mark('ask');
await until(43);
await clickOn(page.getByRole('button', { name: /What was Dakshin Gangotri/ }).first());
await page.getByText(/Saved answer · /).waitFor({ timeout: 20000 }).catch(() => {});
await moveTo(1300, 620, 900);
await until(55);
// "By clicking the source, we can open the exact page…"
const src = page.locator('a[href*="?page="]').first();
await src.scrollIntoViewIfNeeded().catch(() => {});
await page.waitForTimeout(800);
await clickOn(src);
await page.waitForLoadState('networkidle').catch(() => {});
mark('cited page');
await until(68);

// 1:08 "We also tested DHRUV using 32 manually verified questions…"
await go('/accuracy');
mark('accuracy');
await until(72);
await glide(800, 5);
await until(81);

// 1:21 "On the staff side…" — upload once, get everything
await go('/admin/pack');
mark('pack');
await until(88);
await glide(750, 6);
await until(98);
await glide(500, 4);
await until(104);

// 1:44 "Every generated post goes through a human review… each post gets its own QR code"
await go('/admin/studio');
const qr = page.getByRole('button', { name: /QR check · 8CF4F1E3/ });
await qr.scrollIntoViewIfNeeded().catch(() => {});
await page.waitForTimeout(700);
await clickOn(qr);
mark('qr');
await until(114);

// 1:54 "Anyone can scan that QR code and verify…"
await go('/verify/post/8CF4F1E3');
mark('genuine');
await until(120);
await glide(450, 3);
await until(125);

// 2:05 "Finally, DHRUV works in Hindi…"
await go('/');
await page.waitForTimeout(700);
await clickOn(page.getByRole('button', { name: /हिन्दी/ }).first());
await page.waitForLoadState('networkidle').catch(() => {});
mark('hindi');
await until(134);
mark('end');

await ctx.close();
await browser.close();

// 3. WebM → MP4.
const webm = readdirSync(OUT).find((f) => f.endsWith('.webm'));
renameSync(`${OUT}/${webm}`, `${OUT}/raw.webm`);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', `${OUT}/raw.webm`, '-c:v', 'libx264', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-crf', '18', '-r', '30', `${OUT}/dhruv-demo.mp4`]);
console.log(`Saved ${OUT}/dhruv-demo.mp4`);
