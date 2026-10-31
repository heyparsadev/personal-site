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
