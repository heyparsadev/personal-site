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
});

test('Barayand page: three chapters, link out, next is Sibkade', async ({ page }) => {
  await page.goto('/barayand');
  await expect(page.locator('.prose h2')).toHaveText(['The idea', 'What shipped', 'The benchmark']);
  await expect(page.locator('.p-meta a')).toHaveAttribute('href', 'https://barayand.io');
  await expect(page.locator('[data-next] a')).toHaveAttribute('href', '/sibkade');
});

test('HelpFinity and IranSpoti have no pages', async ({ page }) => {
  for (const path of ['/helpfinity', '/iranspoti']) {
    const res = await page.goto(path);
    expect(res?.status()).toBe(404);
    await expect(page.locator('h1')).toHaveText('Page not found.');
  }
});
