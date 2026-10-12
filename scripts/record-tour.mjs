import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const RECORDINGS_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\3e511325-390e-4104-bdc5-1cc00b288d6e\\recordings';
const BASE_URL = 'http://localhost:3000';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function smoothScroll(page, targetY, durationMs = 1800) {
  await page.evaluate(async ({ targetY, durationMs }) => {
    const startY = window.scrollY;
    const diff = targetY - startY;
    const startTime = performance.now();

    return new Promise(resolve => {
      function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / durationMs, 1);
        // Smooth cubic ease-in-out
        const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        window.scrollTo(0, startY + diff * ease);
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      }
      requestAnimationFrame(step);
    });
  }, { targetY, durationMs });
  await page.waitForTimeout(durationMs + 100);
}

async function smoothMouseMove(page, startX, startY, endX, endY, steps = 30) {
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const x = startX + (endX - startX) * ease;
    const y = startY + (endY - startY) * ease;
    await page.mouse.move(x, y);
    await page.waitForTimeout(16);
  }
}

async function injectPresenterCursor(page) {
  await page.evaluate(() => {
    if (document.getElementById('dhruv-presenter-cursor')) return;
    const cursor = document.createElement('div');
    cursor.id = 'dhruv-presenter-cursor';
    cursor.style.position = 'fixed';
    cursor.style.width = '24px';
    cursor.style.height = '24px';
    cursor.style.borderRadius = '50%';
    cursor.style.backgroundColor = 'rgba(79, 195, 247, 0.5)';
    cursor.style.border = '2.5px solid #4FC3F7';
    cursor.style.boxShadow = '0 0 15px rgba(79, 195, 247, 0.9), 0 0 30px rgba(124, 245, 200, 0.6)';
    cursor.style.pointerEvents = 'none';
    cursor.style.zIndex = '9999999';
    cursor.style.transform = 'translate(-50%, -50%)';
    cursor.style.transition = 'transform 0.08s ease-out, background-color 0.15s ease';
    cursor.style.left = '960px';
    cursor.style.top = '540px';
    document.body.appendChild(cursor);

    window.addEventListener('mousemove', (e) => {
      cursor.style.left = `${e.clientX}px`;
      cursor.style.top = `${e.clientY}px`;
    });

    window.addEventListener('mousedown', () => {
      cursor.style.transform = 'translate(-50%, -50%) scale(0.65)';
      cursor.style.backgroundColor = 'rgba(124, 245, 200, 0.9)';
    });

    window.addEventListener('mouseup', () => {
      cursor.style.transform = 'translate(-50%, -50%) scale(1)';
      cursor.style.backgroundColor = 'rgba(79, 195, 247, 0.5)';
    });
  });
}

async function run() {
  console.log('Starting high-definition recording with Google Chrome...');
  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1920,1080',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--use-gl=angle',
      '--use-angle=default',
      '--disable-infobars',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: RECORDINGS_DIR,
      size: { width: 1920, height: 1080 },
    },
  });

  const page = await context.newPage();

  async function visit(url) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await injectPresenterCursor(page);
    await page.waitForTimeout(400);
  }

  const startTime = Date.now();
  console.log('=== RECORDING STARTED (Target: ~120s) ===');

  // -------------------------------------------------------------------------
  // 1. HOME & 3D POLAR GLOBE (0:00 - 0:18 | 18s)
  // -------------------------------------------------------------------------
  console.log('[0:00 - 0:18] Scene 1: Home Page & 3D Polar Globe');
  await visit(BASE_URL);
  await page.mouse.move(960, 540);
  await page.waitForTimeout(3000);

  // Hover over globe
  await smoothMouseMove(page, 960, 540, 1180, 480, 25);
  await page.waitForTimeout(1200);
  await smoothMouseMove(page, 1180, 480, 800, 500, 25);
  await page.waitForTimeout(1500);

  // Scroll down to live station telemetry (StationTicker / PolarNow)
  await smoothScroll(page, 650, 1800);
  await page.waitForTimeout(2500);

  // Scroll down to bento features
  await smoothScroll(page, 1350, 1800);
  await page.waitForTimeout(2500);

  // Scroll back up to top nav
  await smoothScroll(page, 0, 1400);
  await page.waitForTimeout(800);

  // -------------------------------------------------------------------------
  // 2. RESEARCH STATIONS SHOWCASE (0:18 - 0:34 | 16s)
  // -------------------------------------------------------------------------
  console.log('[0:18 - 0:34] Scene 2: Research Stations Showcase (Bharati)');
  await visit(`${BASE_URL}/stations/bharati`);
  await page.waitForTimeout(2000);

  // Point to station name and coordinates
  await smoothMouseMove(page, 960, 500, 450, 280, 25);
  await page.waitForTimeout(2000);

  // Scroll through live telemetry and facilities
  await smoothScroll(page, 580, 1800);
  await page.waitForTimeout(3000);
  await smoothScroll(page, 1150, 1800);
  await page.waitForTimeout(3000);

  // -------------------------------------------------------------------------
  // 3. EXPEDITIONS TIMELINE (0:34 - 0:50 | 16s)
  // -------------------------------------------------------------------------
  console.log('[0:34 - 0:50] Scene 3: Polar Expeditions Timeline');
  await visit(`${BASE_URL}/expeditions`);
  await page.waitForTimeout(2000);

  // Scroll down through timeline
  await smoothMouseMove(page, 600, 300, 960, 350, 25);
  await smoothScroll(page, 480, 1800);
  await page.waitForTimeout(2000);

  // Open the historic South Pole Expedition dossier
  await visit(`${BASE_URL}/expeditions/SPE-2010`);
  await page.waitForTimeout(2000);
  await smoothScroll(page, 550, 1800);
  await page.waitForTimeout(3200);

  // -------------------------------------------------------------------------
  // 4. KNOWLEDGE REPOSITORY & AI INGESTION (0:50 - 1:10 | 20s)
  // -------------------------------------------------------------------------
  console.log('[0:50 - 1:10] Scene 4: Explore & Knowledge Repository');
  await visit(`${BASE_URL}/explore`);
  await page.waitForTimeout(2000);

  // Hover over faceted filters
  await smoothMouseMove(page, 300, 220, 650, 220, 25);
  await page.waitForTimeout(1500);
  await smoothScroll(page, 450, 1800);
  await page.waitForTimeout(2000);

  // View Asset Details with AI Summary & bilingual translation
  await visit(`${BASE_URL}/asset/cf1a3665-da5a-4bd4-9186-726161c05cfb`);
  await page.waitForTimeout(2500);
  await smoothMouseMove(page, 500, 300, 800, 350, 25);
  await smoothScroll(page, 480, 1800);
  await page.waitForTimeout(3000);
  await smoothScroll(page, 950, 1800);
  await page.waitForTimeout(3000);

  // -------------------------------------------------------------------------
  // 5. SMART EDUCATION ZONE & QUIZZES (1:10 - 1:26 | 16s)
  // -------------------------------------------------------------------------
  console.log('[1:10 - 1:26] Scene 5: Smart Education Zone');
  await visit(`${BASE_URL}/learn`);
  await page.waitForTimeout(2000);

  // Showcase curriculum and interactive modules
  await smoothMouseMove(page, 400, 350, 850, 350, 25);
  await page.waitForTimeout(1500);
  await smoothScroll(page, 600, 1800);
  await page.waitForTimeout(3500);
  await smoothScroll(page, 1100, 1800);
  await page.waitForTimeout(3500);

  // -------------------------------------------------------------------------
  // 6. ASK DHRUV - GROUNDED POLAR RAG AI (1:26 - 1:42 | 16s)
  // -------------------------------------------------------------------------
  console.log('[1:26 - 1:42] Scene 6: Ask Dhruv Polar RAG AI');
  await visit(`${BASE_URL}/ask`);
  await page.waitForTimeout(2000);

  // Click the first suggested question
  const questionBtn = await page.$('button:has-text("Dakshin Gangotri")') || await page.$('ul.divide-y button');
  if (questionBtn) {
    const box = await questionBtn.boundingBox();
    if (box) {
      await smoothMouseMove(page, 960, 540, box.x + box.width / 2, box.y + box.height / 2, 20);
      await page.waitForTimeout(400);
      await questionBtn.click();
    }
  }

  // Watch response with thinking stages and citation cards
  await page.waitForTimeout(6000);
  await smoothScroll(page, 320, 1500);
  await page.waitForTimeout(2500);

  // -------------------------------------------------------------------------
  // 7. DISSEMINATION STUDIO & BACKOFFICE (1:42 - 1:58 | 16s)
  // -------------------------------------------------------------------------
  console.log('[1:42 - 1:58] Scene 7: Admin Backoffice & Dissemination Studio');
  await visit(`${BASE_URL}/admin`);
  await page.waitForTimeout(2000);
  await smoothScroll(page, 400, 1500);
  await page.waitForTimeout(2000);

  // Visit Content Studio
  await visit(`${BASE_URL}/admin/studio`);
  await page.waitForTimeout(2500);
  await smoothScroll(page, 400, 1500);
  await page.waitForTimeout(2500);

  // Visit Editorial Review Queue
  await visit(`${BASE_URL}/admin/review`);
  await page.waitForTimeout(2000);

  // -------------------------------------------------------------------------
  // 8. CLOSING SCENE (1:58 - 2:02 | 4s)
  // -------------------------------------------------------------------------
  console.log('[1:58 - 2:02] Scene 8: Closing Return to Home');
  await visit(BASE_URL);
  await page.waitForTimeout(3000);

  const totalDurationSec = (Date.now() - startTime) / 1000;
  console.log(`Tour complete! Total elapsed time: ${totalDurationSec.toFixed(1)} seconds`);

  // Close context to flush video
  await context.close();
  await browser.close();

  // Find generated video
  const files = fs.readdirSync(RECORDINGS_DIR).filter(f => f.endsWith('.webm'));
  if (files.length === 0) {
    console.error('No video files recorded!');
    return;
  }

  const latestWebm = files.map(f => ({
    name: f,
    time: fs.statSync(path.join(RECORDINGS_DIR, f)).mtime.getTime()
  })).sort((a, b) => b.time - a.time)[0].name;

  const rawPath = path.join(RECORDINGS_DIR, latestWebm);
  const outWebm = path.join(RECORDINGS_DIR, 'dhruv_app_tour_2min.webm');
  const outMp4 = path.join(RECORDINGS_DIR, 'dhruv_app_tour_2min.mp4');

  fs.copyFileSync(rawPath, outWebm);
  console.log(`Final WebM video saved: ${outWebm}`);

  console.log('Encoding MP4 (H.264 / AAC) with FFmpeg for maximum compatibility...');
  try {
    execSync(`ffmpeg -y -i "${rawPath}" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p "${outMp4}"`, { stdio: 'inherit' });
    console.log(`Final MP4 video saved: ${outMp4}`);
  } catch (err) {
    console.error('FFmpeg MP4 conversion error:', err.message);
  }

  console.log('SUCCESS: Video files ready!');
}

run().catch(console.error);
