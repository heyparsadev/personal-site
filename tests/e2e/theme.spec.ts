import { test, expect } from '@playwright/test';

test('uses the light theme by default', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('html')).toHaveClass(/\bjs\b/);
});

test.describe('dark system setting', () => {
  test.use({ colorScheme: 'dark' });
  test('follows it when nothing is stored', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('filled hovers use the AA fill (#0071e3) under white text', async ({ page }) => {
    await page.goto('/');
    const link = page.locator('#contact .links a').first();
    await link.scrollIntoViewIfNeeded();
    await link.hover();
    await expect(link).toHaveCSS('background-color', 'rgb(0, 113, 227)');
    await expect(link).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(link.locator('.l-handle')).toHaveCSS('color', 'rgb(255, 255, 255)');
    await page.goto('/nope');
    const home = page.locator('.nf-link');
    await home.hover();
    await expect(home).toHaveCSS('background-color', 'rgb(0, 113, 227)');
    await expect(home).toHaveCSS('color', 'rgb(255, 255, 255)');
  });
});

test('a stored choice wins over the system setting', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('heyparsa-theme', 'dark'));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('the light Now pill uses its AA green (4.67:1 on the page, 4.81:1 on a card)', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('#work .now').first()).toHaveCSS('color', 'rgb(31, 122, 54)');
});

test('skip link targets the main content', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('a.skip-link')).toHaveAttribute('href', '#content');
  await expect(page.locator('main#content')).toHaveCount(1);
});
