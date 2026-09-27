import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('heyparsa-intro-seen', '1'));
});

test('the + button opens HelpFinity in a sheet and the island follows', async ({ page }) => {
  await page.goto('/');
  const btn = page.locator('[data-sheet-open="helpfinity"]');
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  const sheet = page.locator('#sheet-helpfinity');
  await expect(sheet).toBeVisible();
  await expect(sheet).toHaveAttribute('role', 'dialog');
  await expect(sheet).toContainText('Coda, 2026.');
  await expect(page).toHaveURL(/#helpfinity$/);
  await expect(page.locator('#island')).toHaveAttribute('data-view', 'sheet');
  await expect(page.locator('#island [data-slot="sheet-title"]')).toHaveText('HelpFinity');
  await expect(page.locator('main')).toHaveAttribute('inert', '');
});

test('Escape closes the sheet and returns focus to the + button', async ({ page }) => {
  await page.goto('/');
  const btn = page.locator('[data-sheet-open="helpfinity"]');
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  const sheet = page.locator('#sheet-helpfinity');
  await expect(sheet).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(btn).toBeFocused();
  await expect(page.locator('main')).not.toHaveAttribute('inert', '');
  expect(page.url()).not.toContain('#helpfinity');
});

test('the island closes the sheet', async ({ page }) => {
  await page.goto('/');
  const btn = page.locator('[data-sheet-open="iranspoti"]');
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  await expect(page.locator('#island')).toHaveAttribute('data-view', 'sheet');
  await page.locator('#island [data-action="close-sheet"]').click();
  await expect(page.locator('#sheet-iranspoti')).toBeHidden();
  await expect(page.locator('#island')).not.toHaveAttribute('data-view', 'sheet');
});

test('a #iranspoti link opens that sheet on load', async ({ page }) => {
  await page.goto('/#iranspoti');
  await expect(page.locator('#sheet-iranspoti')).toBeVisible();
  await expect(page.locator('#sheet-iranspoti')).toContainText('The first draft of Sibkade.');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('titles and sheet text are still readable', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#sheet-helpfinity')).toBeVisible();
    await expect(page.locator('#sheet-helpfinity')).toContainText('Mind Mirror');
  });
});
