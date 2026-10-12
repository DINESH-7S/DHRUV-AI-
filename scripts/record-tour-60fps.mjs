import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const RECORDINGS_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\d936a580-7302-4132-ae83-44d9f971b895\\recordings';
const BASE_URL = 'http://localhost:3000';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}

// Glowing presenter cursor injected into every page automatically
const CURSOR_SCRIPT = `
  (() => {
    // Force dark polar theme background to prevent any white flashing
    document.documentElement.style.backgroundColor = '#06121e';
    document.body.style.backgroundColor = '#06121e';

    const renderCursor = () => {
      if (document.getElementById('dhruv-presenter-cursor')) return;
      const c = document.createElement('div');
      c.id = 'dhruv-presenter-cursor';
      c.style.cssText = 'position:fixed;left:0;top:0;width:24px;height:24px;margin:-12px 0 0 -12px;border-radius:50%;' +
        'background:rgba(79,195,247,0.45);border:2.5px solid #4FC3F7;' +
        'box-shadow:0 0 16px rgba(79,195,247,0.95),0 0 32px rgba(124,245,200,0.65);' +
        'pointer-events:none;z-index:2147483647;transition:transform .08s ease-out;transform:translate(960px,540px)';
      document.body.appendChild(c);

      const xy = JSON.parse(sessionStorage.getItem('dhruv_cur') || '[960,540]');
      c.style.transform = 'translate(' + xy[0] + 'px,' + xy[1] + 'px)';

      window.addEventListener('mousemove', (e) => {
        c.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)';
        sessionStorage.setItem('dhruv_cur', JSON.stringify([e.clientX, e.clientY]));
      }, true);

      window.addEventListener('mousedown', () => {
        c.style.transform += ' scale(0.65)';
        c.style.backgroundColor = 'rgba(124, 245, 200, 0.9)';
      }, true);

      window.addEventListener('mouseup', () => {
        c.style.transform = c.style.transform.replace(' scale(0.65)', '');
        c.style.backgroundColor = 'rgba(79, 195, 247, 0.45)';
      }, true);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', renderCursor);
    } else {
      renderCursor();
    }
  })();
`;

// Ultra-smooth 60fps scrolling using requestAnimationFrame and cubic bezier easing
async function smoothScroll(page, targetY, durationMs = 1800) {
  await page.evaluate(async ({ targetY, durationMs }) => {
    const startY = window.scrollY;
    const diff = targetY - startY;
    const startTime = performance.now();

    return new Promise(resolve => {
      function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / durationMs, 1);
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
  await page.waitForTimeout(100);
}

// Smooth cursor movement at 60fps (16ms per step)
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

async function run() {
  console.log('1. Launching Google Chrome with hardware GPU acceleration flags...');

  const browser = await chromium.launch({
    headless: false,
    executablePath: CHROME_PATH,
    args: [
      '--window-size=1920,1080',
      '--window-position=0,0',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--enable-gpu',
      '--use-gl=angle',
      '--use-angle=d3d11',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--enable-features=Vulkan,DefaultANGLEVulkan,CanvasOopRasterization',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--force-device-scale-factor=1',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });

  // -------------------------------------------------------------------------
  // STEP 1: PRE-WARM ALL CLIENT BUNDLES OFF-CAMERA
  // -------------------------------------------------------------------------
  console.log('2. Pre-warming all client bundles in browser off-camera...');
  const warmContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await warmContext.addCookies([
    { name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' },
  ]);
  const warmPage = await warmContext.newPage();

  const TOUR_PAGES = [
    '/',
    '/stations/bharati',
    '/expeditions',
    '/expeditions/SPE-2010',
    '/explore',
    '/asset/cf1a3665-da5a-4bd4-9186-726161c05cfb',
    '/learn',
    '/ask',
    '/admin',
    '/admin/studio',
    '/admin/review',
  ];

  for (const p of TOUR_PAGES) {
    const t = Date.now();
    await warmPage.goto(BASE_URL + p, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await warmPage.waitForTimeout(500);
    console.log(`   Warmed ${p} (${Date.now() - t} ms)`);
  }
  await warmPage.close();
  await warmContext.close();
  console.log('   All pages pre-warmed and compiled.');

  // -------------------------------------------------------------------------
  // STEP 2: RECORD HIGH-DEFINITION 60 FPS TOUR
  // -------------------------------------------------------------------------
  console.log('3. Starting video recording context (1920x1080)...');
  const recordContext = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: RECORDINGS_DIR,
      size: { width: 1920, height: 1080 },
    },
  });

  await recordContext.addCookies([
    { name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' },
  ]);
  await recordContext.addInitScript(CURSOR_SCRIPT);

  const page = await recordContext.newPage();
  const contextStartTime = performance.now();

  async function visit(url, waitForSelector = null) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch((e) => console.log(`Nav warning on ${url}:`, e.message));
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: 10000 }).catch(() => {});
    }
    await page.waitForTimeout(400);
  }

  // Pre-load Home and wait for 3D Globe to stabilize
  console.log('4. Stabilizing Home Page and 3D Polar Globe...');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000); // Allow globe shader compilation and entrance motion to settle

  const timelineStart = performance.now();
  const startOffsetSec = (timelineStart - contextStartTime) / 1000;
  console.log(`=== 120s 60FPS TOUR CLOCK STARTED (Offset: ${startOffsetSec.toFixed(2)}s) ===`);

  const now = () => (performance.now() - timelineStart) / 1000;
  async function at(targetSec) {
    const remainingMs = (targetSec - now()) * 1000;
    if (remainingMs > 0) {
      await page.waitForTimeout(remainingMs);
    }
  }

  // -------------------------------------------------------------------------
  // SCENE 1: HOME & 3D POLAR GLOBE (0:00 - 0:18 | 18s)
  // -------------------------------------------------------------------------
  console.log('[0:00 - 0:18] Scene 1: Home Page & 3D Polar Globe');
  await page.mouse.move(960, 540);
  await page.waitForTimeout(1000);

  // Smooth orbit hover over globe
  await smoothMouseMove(page, 960, 540, 1240, 450, 35);
  await page.waitForTimeout(1400);
  await smoothMouseMove(page, 1240, 450, 760, 500, 35);
  await page.waitForTimeout(1400);

  // Scroll smoothly to PolarNow live telemetry (Y = 940: header doesn't overlap text)
  await smoothScroll(page, 940, 2200);
  await page.waitForTimeout(1800);

  // Hover over station telemetry
  await smoothMouseMove(page, 760, 500, 960, 680, 28);
  await page.waitForTimeout(1800);

  // Scroll down to Four Decades of Polar Expeditions
  await smoothScroll(page, 2220, 2200);
  await at(18.0);

  // -------------------------------------------------------------------------
  // SCENE 2: RESEARCH STATIONS SHOWCASE (0:18 - 0:34 | 16s)
  // -------------------------------------------------------------------------
  console.log('[0:18 - 0:34] Scene 2: Research Stations Showcase (Bharati)');
  await visit(`${BASE_URL}/stations/bharati`, 'h1');
  await smoothMouseMove(page, 960, 500, 420, 260, 28);
  await page.waitForTimeout(2000);

  // Scroll down through live weather, solar position and station facilities
  await smoothScroll(page, 520, 2000);
  await page.waitForTimeout(2500);
  await smoothScroll(page, 1050, 2000);
  await at(34.0);

  // -------------------------------------------------------------------------
  // SCENE 3: EXPEDITIONS TIMELINE (0:34 - 0:50 | 16s)
  // -------------------------------------------------------------------------
  console.log('[0:34 - 0:50] Scene 3: Polar Expeditions Timeline (1981 - Present)');
  await visit(`${BASE_URL}/expeditions`, 'h1');
  await smoothMouseMove(page, 500, 300, 960, 360, 28);
  await smoothScroll(page, 480, 2000);
  await page.waitForTimeout(2000);

  // Open the landmark South Pole Expedition dossier
  await visit(`${BASE_URL}/expeditions/SPE-2010`, 'h1');
  await smoothScroll(page, 560, 2000);
  await smoothMouseMove(page, 960, 540, 680, 480, 28);
  await at(50.0);

  // -------------------------------------------------------------------------
  // SCENE 4: KNOWLEDGE REPOSITORY & AI INGESTION (0:50 - 1:10 | 20s)
  // -------------------------------------------------------------------------
  console.log('[0:50 - 1:10] Scene 4: Explore & Knowledge Repository + AI Summary');
  await visit(`${BASE_URL}/explore`, 'h1');
  await smoothMouseMove(page, 320, 240, 680, 240, 28);
  await smoothScroll(page, 460, 2000);
  await page.waitForTimeout(2000);

  // Open scientific asset detail with AI Summary and verified metadata
  await visit(`${BASE_URL}/asset/cf1a3665-da5a-4bd4-9186-726161c05cfb`, 'h1');
  await smoothMouseMove(page, 450, 280, 750, 340, 28);
  await smoothScroll(page, 460, 2000);
  await page.waitForTimeout(3000);
  await smoothScroll(page, 980, 2000);
  await at(70.0);

  // -------------------------------------------------------------------------
  // SCENE 5: SMART EDUCATION ZONE & QUIZZES (1:10 - 1:26 | 16s)
  // -------------------------------------------------------------------------
  console.log('[1:10 - 1:26] Scene 5: Smart Education Zone (Zero Skeletons)');
  await visit(`${BASE_URL}/learn`, 'text=Middle School');
  await smoothMouseMove(page, 380, 320, 820, 320, 28);
  await page.waitForTimeout(2000);
  await smoothScroll(page, 540, 2000);
  await page.waitForTimeout(3000);
  await smoothScroll(page, 1080, 2000);
  await at(86.0);

  // -------------------------------------------------------------------------
  // SCENE 6: ASK DHRUV - GROUNDED POLAR RAG AI (1:26 - 1:42 | 16s)
  // -------------------------------------------------------------------------
  console.log('[1:26 - 1:42] Scene 6: Ask Dhruv Grounded Polar RAG AI');
  await visit(`${BASE_URL}/ask`, 'button');
  await page.waitForTimeout(800);

  // Click the suggested question button
  const qBtn = page.getByRole('button', { name: /What was Dakshin Gangotri/ }).first();
  if (await qBtn.count()) {
    const box = await qBtn.boundingBox();
    if (box) {
      await smoothMouseMove(page, 960, 540, box.x + box.width / 2, box.y + box.height / 2, 25);
      await page.waitForTimeout(300);
      await qBtn.click();
    }
  }

  // Wait for the complete grounded answer and citation links to render
  await page.waitForSelector('a[href*="?page="], text=Saved answer', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3500);

  // Hover over the verified citation pill
  const citation = page.locator('a[href*="?page="]').first();
  if (await citation.count()) {
    const cBox = await citation.boundingBox();
    if (cBox) {
      await smoothMouseMove(page, 960, 600, cBox.x + cBox.width / 2, cBox.y + cBox.height / 2, 25);
    }
  }
  await at(102.0);

  // -------------------------------------------------------------------------
  // SCENE 7: DISSEMINATION STUDIO & BACKOFFICE (1:42 - 1:56 | 14s)
  // -------------------------------------------------------------------------
  console.log('[1:42 - 1:56] Scene 7: Staff Dissemination Studio & Review Queue');
  await visit(`${BASE_URL}/admin`, 'text=Overview');
  await smoothMouseMove(page, 400, 300, 700, 300, 25);
  await smoothScroll(page, 420, 1600);
  await page.waitForTimeout(1800);

  // Visit Content Studio
  await visit(`${BASE_URL}/admin/studio`, 'text=Campaign');
  await smoothScroll(page, 380, 1600);
  await page.waitForTimeout(1800);

  // Visit Editorial Review Queue (wait for real content, no loading spinner)
  await visit(`${BASE_URL}/admin/review`, 'text=Review queue');
  await page.waitForFunction(() => !document.body.innerText.includes('Loading review queue'), { timeout: 10000 }).catch(() => {});
  await smoothScroll(page, 380, 1600);
  await at(116.0);

  // -------------------------------------------------------------------------
  // SCENE 8: CLOSING RETURN TO HOME (1:56 - 2:00 | 4s)
  // -------------------------------------------------------------------------
  console.log('[1:56 - 2:00] Scene 8: Closing Return to Home');
  await visit(BASE_URL, 'canvas');
  await page.mouse.move(960, 540);
  await at(120.0);

  console.log('120 seconds tour finished! Closing browser and flushing video...');
  await recordContext.close();
  await browser.close();

  // Find generated WebM
  const files = fs.readdirSync(RECORDINGS_DIR).filter(f => f.endsWith('.webm'));
  if (files.length === 0) {
    throw new Error('No recorded video found in ' + RECORDINGS_DIR);
  }

  const latestWebm = files.map(f => ({
    name: f,
    time: fs.statSync(path.join(RECORDINGS_DIR, f)).mtime.getTime()
  })).sort((a, b) => b.time - a.time)[0].name;

  const rawPath = path.join(RECORDINGS_DIR, latestWebm);
  const out60fpsMp4 = path.join(RECORDINGS_DIR, 'dhruv_app_tour_2min_60fps.mp4');
  const rootMp4 = 'e:\\PS 63\\dhruv_app_tour_2min.mp4';
  const artifactDir = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\d936a580-7302-4132-ae83-44d9f971b895';
  const artifactMp4 = path.join(artifactDir, 'dhruv_app_tour_2min.mp4');
  const artifact60fpsMp4 = path.join(artifactDir, 'dhruv_app_tour_2min_60fps.mp4');

  console.log(`Raw WebM recorded: ${rawPath}`);
  console.log(`Encoding true 60 FPS MP4 with FFmpeg (-ss ${startOffsetSec.toFixed(3)} -t 120.0 -vf "fps=fps=60:round=near")...`);

  const ffmpegCmd = `ffmpeg -y -i "${rawPath}" -ss ${startOffsetSec.toFixed(3)} -t 120.0 -vf "fps=fps=60:round=near" -r 60 -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart "${out60fpsMp4}"`;
  execSync(ffmpegCmd, { stdio: 'inherit' });

  // Copy to root workspace and artifacts
  fs.copyFileSync(out60fpsMp4, rootMp4);
  fs.copyFileSync(out60fpsMp4, artifactMp4);
  fs.copyFileSync(out60fpsMp4, artifact60fpsMp4);

  console.log(`SUCCESS! Created 60 FPS 2-Minute Video at:`);
  console.log(`  - Root: ${rootMp4}`);
  console.log(`  - Artifacts: ${artifactMp4}`);
}

run().catch((err) => {
  console.error('Recording error:', err);
  process.exit(1);
});
