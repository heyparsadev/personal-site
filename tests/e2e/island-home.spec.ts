import { test, expect, type Page } from '@playwright/test';

const island = (page: Page) => page.locator('#island');
const label = (page: Page) => page.locator('#island [data-roll] .roll-item:not(.out)');
const skipIntro = (page: Page) => page.addInitScript(() => sessionStorage.setItem('heyparsa-intro-seen', '1'));

test.beforeEach(async ({ page }) => {
  await skipIntro(page);
  await page.goto('/');
  await expect(island(page)).toHaveAttribute('data-view', 'home');
});

test('hovering a live word previews it and lights the word', async ({ page }) => {
  await page.locator('[data-word="tech"]').hover();
  await expect(island(page)).toHaveAttribute('data-view', 'd-tech');
  await expect(page.locator('[data-word="tech"]')).toHaveClass(/is-lit/);
  await page.mouse.move(12, 700);
  await expect(island(page)).toHaveAttribute('data-view', 'home');
  await expect(page.locator('[data-word="tech"]')).not.toHaveClass(/is-lit/);
});

test('Contact opens inside the island and the email copies', async ({ page, context, browserName }) => {
  if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.locator('#island nav.isl').hover();
  await expect(island(page)).toHaveAttribute('data-view', 'menu-home');
  await page.locator('#island [data-view="menu-home"] [data-action="contact"]').click();
  await expect(island(page)).toHaveAttribute('data-view', 'contact');
  await page.locator('#island [data-copy]').click();
  await expect(island(page)).toHaveAttribute('data-view', 'copied');
  if (browserName === 'chromium') {
    await expect(page.locator('#island [data-slot="copied"]')).toHaveText('Email copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('me@heyparsa.com');
  }
});

test('the theme toggle switches and remembers the appearance', async ({ page }) => {
  await page.locator('#island nav.isl').hover();
  await expect(island(page)).toHaveAttribute('data-view', 'menu-home');
  await page.locator('#island [data-view="menu-home"] [data-action="theme"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('scrolling names the current section and fills the progress dot', async ({ page }) => {
  await page.evaluate(() => scrollTo(0, innerHeight * 0.5));
  await expect(island(page)).toHaveAttribute('data-view', 'section');
  await expect(label(page)).toHaveText('Parsa Kharazmian');
  await page.evaluate(() => scrollTo(0, document.getElementById('playground')!.offsetTop));
  await expect(label(page)).toHaveText('Playground');
  await expect(page.locator('#island [data-dot]')).toHaveCSS('opacity', '1');
});

test('menu links scroll to their section on the home page', async ({ page }) => {
  await page.locator('#island nav.isl').hover();
  await page.locator('#island .menu [data-nav="about"]').click();
  await expect(page).toHaveURL(/#about$/);
  await expect
    .poll(() => page.evaluate(() => Math.abs(document.getElementById('about')!.getBoundingClientRect().top)))
    .toBeLessThan(40);
  await expect(label(page)).toHaveText('About');
});
