/**
 * Captures a still of the home-page globe (the default view, not rotating) as
 * public/globe/poster.webp with a transparent background. The site shows it until three.js
 * has loaded, so phones see the globe at once. Re-run after changing the globe's look.
 *
 * Run with the site running:  node scripts/globe-poster.mjs [http://localhost:3000]
 */
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const base = process.argv[2] ?? 'http://localhost:3000';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 860 }, deviceScaleFactor: 1.5, reducedMotion: 'reduce' });
await page.goto(base + '/', { waitUntil: 'networkidle', timeout: 120000 });
const canvas = page.locator('canvas').first();
await canvas.waitFor({ timeout: 60000 });
await page.waitForTimeout(5000); // fly-in and texture decode
// Transparent surroundings so the poster sits on any background.
// Only the globe itself: hide the station buttons, hint text and page effects around it.
await page.addStyleTag({
  content:
    'html,body{background:transparent!important} html::before,html::after,body::before,body::after{display:none!important}' +
    ' body *{visibility:hidden!important} canvas{visibility:visible!important}',
});
const png = await canvas.screenshot({ omitBackground: true });
const info = await sharp(png).resize({ width: 720 }).webp({ quality: 60, alphaQuality: 90 }).toFile('public/globe/poster.webp');
console.log('poster', `${info.width}x${info.height}`, `${Math.round(info.size / 1024)} KB`);
await browser.close();
