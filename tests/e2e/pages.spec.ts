import { test, expect } from '@playwright/test';

test('Sibkade page: title, tagline, chapters, pull quote, next', async ({ page }) => {
  await page.goto('/sibkade');
  await expect(page).toHaveTitle('Sibkade · Parsa Kharazmian');
  await expect(page.locator('h1')).toHaveText('Sibkade');
  await expect(page.locator('.p-tagline')).toHaveText('Building a gift-card business around customer experience.');
  await expect(page.locator('.prose h2')).toHaveText([
    'Getting the business started',
    'Making the experience worth recommending',
    'Staying close to the product',
    'Giving the team better support tools',
    'Understanding the business as it grows',
  ]);
  await expect(page.locator('.prose h2').first()).toHaveAttribute('id', 'getting-the-business-started');
  await expect(page.locator('.prose blockquote')).toHaveCount(1);
  await expect(page.locator('[data-next] a')).toHaveAttribute('href', '/barayand');
  // The plain home link is the no-JS fallback; with JavaScript the island is the way home.
  await expect(page.locator('main a.p-home')).toBeHidden();
});

test('Barayand page: three chapters, link out, next is Sibkade', async ({ page }) => {
  await page.goto('/barayand');
  await expect(page.locator('.prose h2')).toHaveText(['The idea', 'What shipped', 'The benchmark']);
  await expect(page.locator('.p-meta a')).toHaveAttribute('href', 'https://barayand.io');
  await expect(page.locator('[data-next] a')).toHaveAttribute('href', '/sibkade');
});

test.describe('island styles stay inside the island', () => {
  test.use({ colorScheme: 'light' });

  test('the Next project title is legible in the light theme', async ({ page }) => {
    await page.goto('/sibkade');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    const color = await page.locator('[data-next] .next-title').evaluate((el) => getComputedStyle(el).color);
    const bg = await page.locator('[data-next] .next-link').evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(color).not.toBe('rgb(245, 245, 247)');
    expect(color).not.toBe(bg);
  });

  test("About's stack keeps its own layout", async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#about .stack')).toHaveCSS('display', 'block');
  });
});

test('canonical and og:url match the internal links; the 404 page is noindex', async ({ page }) => {
  for (const [path, url] of [['/', 'https://heyparsa.com/'], ['/sibkade', 'https://heyparsa.com/sibkade'], ['/barayand', 'https://heyparsa.com/barayand']]) {
    await page.goto(path);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', url);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', url);
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  }
  await page.goto('/nope');
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(page.locator('meta[property="og:url"]')).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
});

test('HelpFinity and IranSpoti have no pages', async ({ page }) => {
  for (const path of ['/helpfinity', '/iranspoti']) {
    const res = await page.goto(path);
    expect(res?.status()).toBe(404);
    await expect(page.locator('h1')).toHaveText('Page not found.');
  }
});
