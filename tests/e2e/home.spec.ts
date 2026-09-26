import { test, expect } from '@playwright/test';

test('hero shows the name and live words', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText(/Parsa\s*Kharazmian\./);
  await expect(page.locator('[data-word]')).toHaveCount(5);
  await expect(page.locator('a[data-word="sibkade"]')).toHaveAttribute('href', '/sibkade');
  await expect(page.locator('a[data-word="barayand"]')).toHaveAttribute('href', '/barayand');
  await expect(page.locator('button[data-word="psychology"]')).toHaveCount(1);
});

test('work lists four projects in order, as pages or sheets', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#work .card-title')).toHaveText(['Barayand', 'Sibkade', 'HelpFinity', 'IranSpoti']);
  await expect(page.locator('#work a.card-link[href="/barayand"]')).toHaveCount(1);
  await expect(page.locator('#work a.card-link[href="/sibkade"]')).toHaveCount(1);
  await expect(page.locator('#work [data-sheet-open]')).toHaveCount(2);
});

test('playground, about and contact render', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#playground .pitem')).toHaveCount(7);
  await expect(page.locator('#about .belief')).toHaveCount(3);
  await expect(page.locator('#about')).toContainText('Reads Camus.');
  await expect(page.locator('#contact a[href="mailto:me@heyparsa.com"]')).toHaveCount(1);
});

test('home has no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(errors).toEqual([]);
});
