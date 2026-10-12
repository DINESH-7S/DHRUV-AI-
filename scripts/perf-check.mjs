/**
 * Frame-rate check for the public pages: measures requestAnimationFrame frame times while idle
 * and during a scripted scroll.  Run (with the app on :3000):
 *   node scripts/perf-check.mjs              real GPU (opens a browser window) — use this number
 *   HEADLESS=1 node scripts/perf-check.mjs   headless (software WebGL, much slower; CI only)
 * FPS is capped by the display refresh rate (60 on a 60 Hz screen, 120 on 120 Hz).
 * "jank" = frames slower than 1/30 s.
 */
import { chromium } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const PAGES = (process.argv[2] ?? '/,/learn,/ask,/explore').split(',');

const measure = (page, mode) =>
  page.evaluate(async (mode) => {
    const frames = [];
    let last = performance.now();
    let running = true;
    const tick = (t) => { frames.push(t - last); last = t; if (running) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    if (mode === 'scroll') {
      const max = document.documentElement.scrollHeight - innerHeight;
      for (let y = 0; y <= max; y += 40) { window.scrollTo(0, y); await new Promise(r => requestAnimationFrame(r)); }
      window.scrollTo(0, 0);
    } else {
      await new Promise(r => setTimeout(r, 2000));
    }
    running = false;
    const sorted = [...frames].sort((a, b) => a - b);
    const avg = frames.reduce((s, f) => s + f, 0) / frames.length;
    return {
      fps: Math.round(1000 / avg),
      p95ms: Math.round(sorted[Math.floor(sorted.length * 0.95)]),
      jank: frames.filter(f => f > 33.4).length,
      frames: frames.length,
    };
  }, mode);

const browser = await chromium.launch({ headless: !!process.env.HEADLESS, args: ['--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
for (const path of PAGES) {
  await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(6000); // let textures load and entrance animations finish
  const idle = await measure(page, 'idle');
  const scroll = await measure(page, 'scroll');
  console.log(`${path.padEnd(10)} idle ${String(idle.fps).padStart(3)} fps (p95 ${idle.p95ms} ms, jank ${idle.jank})   scroll ${String(scroll.fps).padStart(3)} fps (p95 ${scroll.p95ms} ms, jank ${scroll.jank}/${scroll.frames})`);
}
await browser.close();
