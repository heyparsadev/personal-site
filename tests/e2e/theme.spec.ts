import { test, expect } from '@playwright/test';

test('uses the light theme by default', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('html')).toHaveClass(/\bjs\b/);
});

test.describe('dark system setting', () => {
  test.use({ colorScheme: 'dark' });
  test('is ignored: the site stays light until the visitor picks dark', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('meta[name="theme-color"]')).toHaveCount(1);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#fbfbfd');
  });
});

test.describe('dark theme, chosen by the visitor', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('heyparsa-theme', 'dark'));
  });

  test('the keyboard-focused nav has a solid accent ring (6.96:1 on black)', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Safari skips links on Tab unless the user enables it');
    await page.addInitScript(() => sessionStorage.setItem('heyparsa-intro-seen', '1'));
    await page.goto('/');
    await expect(page.locator('#island')).toHaveAttribute('data-view', 'home');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page.locator('#island nav.isl')).toBeFocused();
    await expect(page.locator('#island nav.isl')).toHaveCSS('box-shadow', 'rgb(41, 151, 255) 0px 0px 0px 3px');
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

test('a stored choice wins, and the browser chrome colour follows it across navigation', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('heyparsa-theme', 'dark'));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#000000');
  await page.locator('#work a.card-link[href="/sibkade"]').click();
  await expect(page).toHaveURL(/\/sibkade$/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('meta[name="theme-color"]')).toHaveCount(1);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#000000');
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
