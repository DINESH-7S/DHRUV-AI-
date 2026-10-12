import { expect, test, type Page } from '@playwright/test';

// Smoke tests for the judges' demo path, in English and Hindi. Assumes the seeded demo data
// (npm run seed, npm run import-content, npm run learn-check -- --keep, npm run publish-demo-news).

async function useLocale(page: Page, locale: 'en' | 'hi') {
  const { hostname } = new URL(test.info().project.use.baseURL ?? 'http://localhost:3000');
  await page.context().addCookies([{ name: 'NEXT_LOCALE', value: locale, domain: hostname, path: '/' }]);
}

test.describe('English', () => {
  test.beforeEach(({ page }) => useLocale(page, 'en'));

  test('home shows real archive numbers and featured assets @mobile', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Polar Science Repository');
    await expect(page.getByText('Indian Antarctic Expeditions')).toBeVisible();
    await expect(page.locator('a[href^="/asset/"]').first()).toBeVisible();
    // No invented statistics.
    await expect(page.getByText('1,200+')).toHaveCount(0);
  });

  test('explore search finds the annual reports', async ({ page }) => {
    await page.goto('/explore');
    await page.getByRole('textbox').first().fill('annual report');
    await expect(page.locator('a[href^="/asset/"]', { hasText: 'Annual Report' }).first()).toBeVisible();
  });

  test('asset page shows summaries, metadata and a working download link', async ({ page }) => {
    await page.goto('/explore?q=annual%20report');
    await page.locator('a[href^="/asset/"]', { hasText: 'Annual Report 2024-25' }).first().click();
    await expect(page.getByRole('button', { name: 'Scientific summary' })).toBeVisible();
    await expect(page.getByText('Key findings')).toBeVisible();
    const download = page.getByRole('link', { name: /Download file/ });
    await expect(download).toHaveAttribute('href', /\/api\/assets\/.+\/download/);
    // Citations must not invent an NCPOR web address or NCPOR authors (truthful-content rule).
    await expect(page.locator('body')).not.toContainText('dhruv.ncpor.res.in');
    await expect(page.locator('body')).not.toContainText(/NCPOR Research (Division|Team)/);
  });

  test('lesson renders Markdown and a quiz', async ({ page }) => {
    await page.goto('/learn');
    await page.locator('a[href^="/learn/"]').first().click();
    // The listing also has h2 headings: wait for the lesson page itself before asserting.
    await expect(page).toHaveURL(/\/learn\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible();
    // Markdown must be rendered, not printed.
    await expect(page.locator('main')).not.toContainText('## ');
    await expect(page.getByRole('button', { name: /Submit answers/ })).toBeVisible();
  });

  test('news shows published posts, never mock content', async ({ page }) => {
    await page.goto('/news');
    await expect(page.locator('article').first()).toBeVisible();
    await expect(page.getByText('Scientists at Maitri Station measured glacier ice')).toHaveCount(0);
  });

  test('certificate verification rejects an unknown id', async ({ page }) => {
    await page.goto('/verify');
    await page.getByRole('textbox').fill('DHRUV-2026-0000000000');
    await page.getByRole('button', { name: /Check/ }).click();
    await expect(page).toHaveURL(/\/verify\/DHRUV-2026-0000000000/);
  });

  test('videos: NCPOR films play on demand from a chapter @mobile', async ({ page }) => {
    // Needs: npm run import-media
    await page.goto('/videos');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Videos from NCPOR');
    await page.locator('a[href^="/asset/"]', { hasText: 'South Pole' }).first().click();
    // Click-to-load: no YouTube iframe until the visitor presses play.
    await expect(page.locator('iframe[src*="youtube"]')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Chapters' })).toBeVisible();
    await page.getByRole('listitem').filter({ has: page.locator('button') }).nth(1).getByRole('button').click();
    await expect(page.locator('iframe[src*="youtube-nocookie.com/embed/pE1K3YQ43j8"]')).toHaveAttribute('src', /start=[1-9]/);
    await expect(page.getByText(/official YouTube channel/)).toBeVisible();
  });

  test('a citation link starts the video at the cited moment', async ({ page }) => {
    await page.goto('/videos');
    const href = await page.locator('a[href^="/asset/"]', { hasText: 'HIMANSH' }).first().getAttribute('href');
    await page.goto(`${href}?t=31`);
    await expect(page.getByRole('button', { name: 'Play from 0:31' })).toBeVisible();
  });

  test('activities are dated and link to their NCPOR or PIB source', async ({ page }) => {
    await page.goto('/events');
    await page.getByRole('heading', { name: /46th Antarctic Treaty Consultative Meeting/ }).click();
    await expect(page.getByText('20 May 2024 to 30 May 2024')).toBeVisible();
    await expect(page.locator('a[href*="pib.gov.in"]').first()).toBeVisible();
    // Every activity can go into a calendar.
    await expect(page.getByRole('link', { name: /Add to calendar/ })).toHaveAttribute('href', /\/events\/calendar\.ics\?id=/);
  });

  test('expedition page: sourced dates, timeline and schematic route @mobile', async ({ page }) => {
    await page.goto('/expeditions');
    await page.getByRole('link', { name: 'First Indian Scientific Expedition to the South Pole' }).click();
    await expect(page).toHaveURL(/\/expeditions\/SPE-2010$/);
    await expect(page.getByText('Reaches the South Pole after 2,300 km in 9 days')).toBeVisible();
    await expect(page.getByRole('img', { name: /Schematic route: Maitri → South Pole/ })).toBeVisible();
    await expect(page.locator('a[href*="ncpor.res.in"]').first()).toBeVisible();
    // Seed records without a source stay hidden.
    expect((await page.goto('/expeditions/ARCTIC-2024'))?.status()).toBe(404);
  });

  test('live polar window shows every active station with a credit @mobile', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: "Right now at India's stations" })).toBeVisible();
    for (const name of ['Maitri', 'Bharati', 'Himadri', 'Himansh']) {
      await expect(page.locator('li').filter({ has: page.getByRole('link', { name, exact: true }) }).first()).toBeVisible();
    }
    await expect(page.getByRole('link', { name: 'Open-Meteo.com' })).toBeVisible();
  });

  test('dataset page shows a chart and the first rows', async ({ page }) => {
    await page.goto('/explore?q=Dakshin%20Gangotri%20Maitri%20surface%20weather');
    await page.locator('a[href^="/asset/"]', { hasText: 'Surface weather at Dakshin Gangotri' }).first().click();
    await expect(page.getByRole('img', { name: /Monthly average: Temperature/ })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Obstime' })).toBeVisible();
  });

  test('trust pages, RSS and calendar feeds work', async ({ page, request }) => {
    for (const path of ['/about', '/privacy', '/accessibility', '/ai-policy']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
    const rss = await request.get('/news/rss.xml');
    expect(rss.headers()['content-type']).toContain('application/rss+xml');
    expect(await rss.text()).toContain('<item>');
    const ics = await request.get('/events/calendar.ics');
    expect(ics.headers()['content-type']).toContain('text/calendar');
    expect(await ics.text()).toContain('BEGIN:VEVENT');
  });

  test('imported items say they are not yet checked by staff', async ({ page }) => {
    await page.goto('/expeditions/SPE-2010');
    await page.locator('a[href^="/asset/"]').first().click();
    await expect(page.getByText(/not yet checked by DHRUV staff|approved by DHRUV staff/i).first()).toBeVisible();
  });

  test('accuracy scorecard shows every test question, failures included', async ({ page }) => {
    await page.goto('/accuracy');
    await expect(page.getByRole('heading', { level: 1, name: 'How accurate is Ask Dhruv?' })).toBeVisible();
    await expect(page.getByText('Correct, with the right source')).toBeVisible();
    await expect(page.getByText('Who led the first Indian expedition to Antarctica?')).toBeVisible();
    // Hindi questions keep their language on the English page.
    await expect(page.locator('[lang="hi"]', { hasText: 'मैत्री स्टेशन कहाँ स्थित है?' })).toBeVisible();
    await page.goto('/ask');
    await expect(page.getByRole('link', { name: /How accurate is Dhruv/ })).toHaveAttribute('href', '/accuracy');
  });

  test('a page citation opens the report at that page', async ({ page }) => {
    await page.goto('/explore?q=First%20Indian%20Expedition%20to%20Antarctica');
    const href = await page.locator('a[href^="/asset/"]', { hasText: 'First Indian Expedition' }).first().getAttribute('href');
    await page.goto(`${href}?page=3`);
    await expect(page.getByText('Ask Dhruv cited page 3 of this document.')).toBeVisible();
    await expect(page.locator('iframe[src*="#page=3"]')).toHaveCount(1);
  });

  test('a sample question gets its saved answer at once, labelled as saved', async ({ page }) => {
    await page.goto('/ask');
    await page.getByRole('button', { name: /What was Dakshin Gangotri/ }).click();
    await expect(page.getByText(/Saved answer · /)).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('a[href^="/asset/"]').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Ask the live AI/ })).toBeVisible();
  });

  test('a post QR code proves an approved post and flags unknown codes @mobile', async ({ page }) => {
    // 8CF4F1E3: the published English website article about the NCPOR Annual Report 2024-25.
    await page.goto('/verify');
    await page.getByRole('textbox').fill('8cf4f1e3');
    await page.getByRole('button', { name: /Check/ }).click();
    await expect(page).toHaveURL(/\/verify\/post\/8CF4F1E3$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Genuine' })).toBeVisible();
    await expect(page.getByText('The text as approved')).toBeVisible();
    await page.goto('/verify/post/FFFFFFFF');
    await expect(page.getByRole('heading', { level: 1, name: 'No match' })).toBeVisible();
  });

  test('Ask Dhruv answers from the archive with a citation @ai', async ({ page }) => {
    await page.goto('/ask');
    await page.getByRole('button', { name: /44th Antarctic expedition/ }).click();
    await expect(page.locator('a[href^="/asset/"]').first()).toBeVisible({ timeout: 60_000 });
  });
});

test.describe('Hindi', () => {
  test('language toggle switches the site to Hindi', async ({ page }) => {
    await useLocale(page, 'en');
    await page.goto('/');
    await page.getByRole('button', { name: /हिन्दी/ }).first().click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('ध्रुवीय विज्ञान भंडार', { timeout: 30_000 });
    await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
  });

  test('home, learn and stations are in Hindi @mobile', async ({ page }) => {
    await useLocale(page, 'hi');
    await page.goto('/');
    await expect(page.getByText('भारतीय अंटार्कटिक अभियान', { exact: true }).first()).toBeVisible();
    await page.goto('/learn');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('ध्रुवीय विज्ञान');
    await page.goto('/expeditions');
    await expect(page.getByText('अंटार्कटिका के लिए पहला भारतीय अभियान')).toBeVisible();
  });

  test('asset page opens on the Hindi summary', async ({ page }) => {
    await useLocale(page, 'hi');
    await page.goto('/explore?q=annual%20report');
    await page.locator('a[href^="/asset/"]').first().click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/[ऀ-ॿ]/);
  });

  test('a Hindi search finds English-catalogued items', async ({ page }) => {
    await useLocale(page, 'hi');
    await page.goto(`/explore?q=${encodeURIComponent('मैत्री का मौसम')}`);
    await expect(page.locator('a[href^="/asset/"]').filter({ hasText: /Maitri|मैत्री/ }).first()).toBeVisible();
  });
});

test.describe('Phase 0 integrity', () => {
  test('no false official attributions on public pages', async ({ page }) => {
    for (const path of ['/news', '/expeditions', '/gallery', '/asset/cf1a3665-da5a-4bd4-9186-726161c05cfb']) {
      await page.goto(path);
      const text = await page.locator('main').innerText();
      expect(text, path).not.toMatch(/Reviewed by NCPOR|PIB Press Release|NCPOR Media Cell|published directly by|NCPOR Verified|\{\{site\}\}/i);
      // Links inside generated posts must point at this deployment, whatever its address.
      const origin = new URL(page.url()).origin;
      for (const url of text.match(/https?:\/\/[^\s\])]+\/asset\/[0-9a-f-]{36}/g) ?? []) {
        expect(url.startsWith(origin), `${path}: ${url}`).toBe(true);
      }
    }
  });

  test('unknown pages get the branded 404 and every page has a skip link', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
    await page.goto('/explore');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  });

  test('security headers are sent', async ({ request }) => {
    const response = await request.get('/');
    const headers = response.headers();
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-powered-by']).toBeUndefined();
  });
});
