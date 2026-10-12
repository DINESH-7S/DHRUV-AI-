/**
 * Loading performance on a budget phone: Largest Contentful Paint, layout shift, main-thread
 * blocking and bytes, per page, with the CPU slowed 4x and a 4G-like network (Chrome DevTools
 * Protocol throttling, like Lighthouse's mobile preset).
 *   E2E_BASE_URL=http://localhost:3100 node scripts/vitals.mjs [/,/ask,...]
 * Run against a production build (next build && next start); dev builds are not representative.
 */
import { chromium } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const PAGES = (process.argv[2] ?? '/,/explore,/expeditions,/ask,/learn,/gallery,/asset/74ffaeff-2404-44de-b3c3-82786304040d').split(',');

const browser = await chromium.launch();
const rows = [];
for (const path of PAGES) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  let jsBytes = 0;
  let allBytes = 0;
  cdp.on('Network.loadingFinished', (e) => (allBytes += e.encodedDataLength));
  const jsIds = new Set();
  cdp.on('Network.responseReceived', (e) => e.type === 'Script' && jsIds.add(e.requestId));
  cdp.on('Network.loadingFinished', (e) => jsIds.has(e.requestId) && (jsBytes += e.encodedDataLength));

  await page.addInitScript(() => {
    window.__v = { lcp: 0, cls: 0, tbt: 0 };
    new PerformanceObserver((l) => l.getEntries().forEach((e) => (window.__v.lcp = e.startTime))).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => l.getEntries().forEach((e) => !e.hadRecentInput && (window.__v.cls += e.value))).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((l) => l.getEntries().forEach((e) => (window.__v.tbt += Math.max(0, e.duration - 50)))).observe({ type: 'longtask', buffered: true });
  });
  const t0 = Date.now();
  await page.goto(BASE + path, { waitUntil: 'load', timeout: 120_000 });
  const loadMs = Date.now() - t0;
  await page.waitForTimeout(5000);
  const v = await page.evaluate(() => window.__v);
  rows.push({ page: path.slice(0, 28), 'LCP s': (v.lcp / 1000).toFixed(2), CLS: v.cls.toFixed(3), 'TBT ms': Math.round(v.tbt), 'load s': (loadMs / 1000).toFixed(1), 'JS KB': Math.round(jsBytes / 1024), 'total KB': Math.round(allBytes / 1024) });
  await ctx.close();
}
await browser.close();
console.table(rows);
console.log('Targets (Google "good"): LCP ≤ 2.5 s, CLS ≤ 0.1, TBT ≤ 200 ms.');
