import { test, expect, type Page } from '@playwright/test';

const island = (page: Page) => page.locator('#island');
const skipIntro = (page: Page) => page.addInitScript(() => sessionStorage.setItem('heyparsa-intro-seen', '1'));

test('first visit: hello, the name drops out, two previews, then rest', async ({ page }) => {
  await page.goto('/');
  await expect(island(page)).toHaveAttribute('data-view', 'hello', { timeout: 2000 });
  await expect(page.locator('main')).toHaveClass(/landed/, { timeout: 4000 });
  await expect(page.locator('h1')).toHaveCSS('opacity', '1', { timeout: 4000 });
  await expect(island(page)).toHaveAttribute('data-view', 'd-sibkade', { timeout: 5000 });
  await expect(island(page)).toHaveAttribute('data-view', 'home', { timeout: 6000 });
});

test('the full intro runs once per session', async ({ page }) => {
  await page.goto('/');
  await expect(island(page)).toHaveAttribute('data-view', 'hello');
  await page.reload();
  await expect(island(page)).toHaveAttribute('data-view', 'home', { timeout: 1500 });
  await expect(page.locator('h1')).toHaveCSS('opacity', '1', { timeout: 3000 });
});

test('hovering the island opens the menu, leaving closes it', async ({ page }) => {
  await skipIntro(page);
  await page.goto('/');
  await expect(island(page)).toHaveAttribute('data-view', 'home');
  await page.locator('#island nav.isl').hover();
  await expect(island(page)).toHaveAttribute('data-view', 'menu-home');
  await page.mouse.move(12, 600);
  await expect(island(page)).toHaveAttribute('data-view', 'home');
});

test('scrolling absorbs the title into the island and back out', async ({ page }) => {
  await skipIntro(page);
  await page.goto('/');
  await expect(page.locator('h1')).toHaveCSS('opacity', '1');
  await page.evaluate(() => scrollTo(0, innerHeight * 0.6));
  await expect(island(page)).toHaveAttribute('data-view', 'section');
  await expect(page.locator('h1')).toHaveCSS('opacity', '0');
  await page.evaluate(() => scrollTo(0, 0));
  await expect(island(page)).toHaveAttribute('data-view', 'home');
  await expect(page.locator('h1')).toHaveCSS('opacity', '1');
});

test('landing on a project page drops its title out of the island', async ({ page }) => {
  await page.goto('/sibkade');
  await expect(island(page)).toHaveAttribute('data-view', 'page');
  await expect(page.locator('#island [data-slot="title"]')).toHaveText('Sibkade');
  await expect(page.locator('h1')).toHaveCSS('opacity', '1');
  await expect(page.locator('html')).toHaveClass(/island-ready/);
});
