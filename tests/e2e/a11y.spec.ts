import { test, expect } from '@playwright/test';

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('skips the long intro and shows the title without blur', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#island')).toHaveAttribute('data-view', 'home', { timeout: 1500 });
    await expect(page.locator('h1')).toHaveCSS('opacity', '1');
    await expect(page.locator('h1')).toHaveCSS('filter', 'none');
  });
});

test('keyboard: skip link first, then the island opens its menu on focus', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Safari skips links on Tab unless the user enables it');
  await page.addInitScript(() => sessionStorage.setItem('heyparsa-intro-seen', '1'));
  await page.goto('/');
  await expect(page.locator('#island')).toHaveAttribute('data-view', 'home');
  await page.keyboard.press('Tab');
  await expect(page.locator('a.skip-link')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#island nav.isl')).toBeFocused();
  await expect(page.locator('#island')).toHaveAttribute('data-view', 'menu-home');
  // One ring: the nav's own box-shadow, not global.css's :focus-visible outline on top of it.
  await expect(page.locator('#island nav.isl')).toHaveCSS('outline-style', 'none');
  await page.keyboard.press('Escape');
  await expect(page.locator('#island')).toHaveAttribute('data-view', 'home');
});

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('tap opens the menu; a live word previews on the first tap and opens on the second', async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem('heyparsa-intro-seen', '1'));
    await page.goto('/');
    await expect(page.locator('#island')).toHaveAttribute('data-view', 'home');
    await page.locator('#island nav.isl').tap();
    await expect(page.locator('#island')).toHaveAttribute('data-view', 'menu-home');
    await page.locator('h1').tap();
    await expect(page.locator('#island')).toHaveAttribute('data-view', 'home');
    await page.locator('a[data-word="sibkade"]').tap();
    await expect(page.locator('#island')).toHaveAttribute('data-view', 'd-sibkade');
    await expect(page).toHaveURL(/\/$/);
    await page.locator('a[data-word="sibkade"]').tap();
    await expect(page).toHaveURL(/\/sibkade$/);
  });

  test('nothing overflows the screen horizontally', async ({ page }) => {
    for (const path of ['/', '/sibkade', '/barayand']) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    }
  });
});
