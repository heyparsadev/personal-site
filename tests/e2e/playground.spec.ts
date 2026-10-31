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

const pause = (page: import('@playwright/test').Page) => page.locator('#playground button.pg-pause');
const pixels = (page: import('@playwright/test').Page) =>
  page.locator('#playground .pg-stage canvas').first().evaluate((c: HTMLCanvasElement) => c.toDataURL());

test('the pause toggle stops the stages and starts them again', async ({ page }) => {
  await page.goto('/');
  const first = page.locator('#playground .pg-stage').first();
  await first.scrollIntoViewIfNeeded();
  await expect.poll(() => first.locator('canvas').evaluate(drawn)).toBe(true);
  await expect(pause(page)).toHaveAccessibleName('Pause motion');
  await expect(pause(page)).toHaveAttribute('aria-pressed', 'false');
  await pause(page).click();
  await expect(pause(page)).toHaveAttribute('aria-pressed', 'true');
  await first.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const held = await pixels(page);
  await page.waitForTimeout(1200);
  expect(await pixels(page)).toBe(held);
  await pause(page).click();
  await expect(pause(page)).toHaveAttribute('aria-pressed', 'false');
  await first.scrollIntoViewIfNeeded();
  await expect.poll(() => pixels(page), { timeout: 3000 }).not.toBe(held);
});

test('the pause is remembered', async ({ page }) => {
  await page.goto('/');
  await pause(page).click();
  await expect(pause(page)).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(pause(page)).toHaveAttribute('aria-pressed', 'true');
});

test('reduced motion starts the band paused', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(pause(page)).toHaveAttribute('aria-pressed', 'true');
});

test('the toggle still works when storage throws', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('storage blocked'); };
    Storage.prototype.setItem = () => { throw new Error('storage blocked'); };
  });
  await page.goto('/');
  await pause(page).click();
  await expect(pause(page)).toHaveAttribute('aria-pressed', 'true');
  await pause(page).click();
  await expect(pause(page)).toHaveAttribute('aria-pressed', 'false');
  expect(errors).toEqual([]);
});

test('the island takes its light edge only over the band', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).not.toHaveClass(/island-on-stage/);
  await page.evaluate(() => scrollTo(0, document.getElementById('playground')!.offsetTop + 200));
  await expect(html).toHaveClass(/island-on-stage/);
  await page.evaluate(() => scrollTo(0, document.getElementById('about')!.offsetTop + 100));
  await expect(html).not.toHaveClass(/island-on-stage/);
});

test('leaving home and coming back remounts the stages', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => scrollTo(0, document.getElementById('playground')!.offsetTop + 200));
  await expect(page.locator('html')).toHaveClass(/island-on-stage/);
  await page.locator('#work a.card-link[href="/barayand"]').click();
  await expect(page).toHaveURL(/\/barayand$/);
  await expect(page.locator('html')).not.toHaveClass(/island-on-stage/);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('#playground .pg-stage canvas')).toHaveCount(8);
  await expectEveryStageDraws(page);
});
