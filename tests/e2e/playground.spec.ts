import { test, expect } from '@playwright/test';

const ORDER = ['Bargasht', 'ApplyBot', 'Apsis', 'The Descent', 'Delta', 'Sisyphus', 'Persian LLM Eval', 'Claude Code plugins'];

test('the playground is a black band in both themes', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#playground')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await page.addInitScript(() => localStorage.setItem('heyparsa-theme', 'dark'));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('#playground')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
});

test("it keeps the list's hooks, in content order", async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h2#playground-title')).toHaveText('Playground');
  await expect(page.locator('#playground li.pitem')).toHaveCount(8);
  await expect(page.locator('#playground li.pitem .pg-stage canvas[aria-hidden="true"]')).toHaveCount(8);
  const titles = (await page.locator('#playground .pitem-title').allTextContents()).map((t) => t.replace('↗', '').trim());
  expect(titles).toEqual(ORDER);
});

test('fonts come from the site, never from Google', async ({ page }) => {
  const urls: string[] = [];
  page.on('request', (r) => urls.push(r.url()));
  await page.goto('/');
  await page.locator('#playground').scrollIntoViewIfNeeded();
  await expect.poll(() => urls.some((u) => u.endsWith('/fonts/geist-mono-latin.woff2'))).toBe(true);
  expect(urls.filter((u) => /fonts\.(googleapis|gstatic)\.com/.test(u))).toEqual([]);
});

test('focus rings are white on the band', async ({ page }) => {
  await page.goto('/');
  const link = page.locator('#playground .pitem-title a').first();
  await link.focus();
  await expect(link).toBeFocused();
  // Keyboard focus, not a programmatic one: Tab away and back so :focus-visible applies.
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(link).toHaveCSS('outline-color', 'rgb(255, 255, 255)');
});

/** True once a canvas has painted anything: any pixel with alpha. */
const drawn = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d');
  if (!ctx || !canvas.width || !canvas.height) return false;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 3; i < data.length; i += 4) if (data[i] > 0) return true;
  return false;
};

/** Scrolls each stage into view and waits until its canvas has drawn. */
async function expectEveryStageDraws(page: import('@playwright/test').Page, timeout = 5000) {
  const stages = page.locator('#playground .pg-stage');
  await expect(stages).toHaveCount(8);
  for (let i = 0; i < 8; i++) {
    const stage = stages.nth(i);
    await stage.scrollIntoViewIfNeeded();
    await expect.poll(() => stage.locator('canvas').evaluate(drawn), { timeout, message: `stage ${i + 1}` }).toBe(true);
  }
}

test('every stage draws once it scrolls into view', async ({ page }) => {
  await page.goto('/');
  await expectEveryStageDraws(page);
});

test('stages draw a still frame under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expectEveryStageDraws(page);
});

test('stages still draw when the fonts never arrive', async ({ page }) => {
  await page.route('**/fonts/*.woff2', (route) => route.abort());
  await page.goto('/');
  await expectEveryStageDraws(page, 8000);
});

test('a resized stage redraws at its new size', async ({ page }) => {
  await page.goto('/');
  await page.setViewportSize({ width: 390, height: 844 });
  const canvas = page.locator('#playground .pg-stage canvas').first();
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.width === Math.round(c.clientWidth * Math.min(2, devicePixelRatio)))).toBe(true);
  await expect.poll(() => canvas.evaluate(drawn)).toBe(true);
});
