import { test, expect, type Page } from '@playwright/test';

const island = (page: Page) => page.locator('#island');
const label = (page: Page) => page.locator('#island [data-roll] .roll-item:not(.out)');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('heyparsa-intro-seen', '1'));
});

test('opening a project card: the island shows it, then the page takes over', async ({ page }) => {
  await page.goto('/');
  await expect(island(page)).toHaveAttribute('data-view', 'home');
  await page.locator('#work a.card-link[href="/sibkade"]').click();
  await expect(page).toHaveURL(/\/sibkade$/);
  await expect(island(page)).toHaveAttribute('data-view', 'page');
  await expect(page.locator('#island [data-slot="title"]')).toHaveText('Sibkade');
  await expect(page.locator('h1')).toHaveText('Sibkade');
  await expect(page.locator('h1')).toHaveCSS('opacity', '1');
});

test('the island element persists across navigation', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { (document.getElementById('island') as HTMLElement & { marker?: number }).marker = 42; });
  await page.locator('#work a.card-link[href="/barayand"]').click();
  await expect(page).toHaveURL(/\/barayand$/);
  expect(await page.evaluate(() => (document.getElementById('island') as HTMLElement & { marker?: number }).marker)).toBe(42);
});

test('the named island keeps a real box and stays the same node across navigation', async ({ page }) => {
  await page.goto('/');
  await expect(island(page)).toHaveAttribute('data-view', 'home');
  // The wrapper is its own view-transition group, and a group is sized to its element's box:
  // with a 0x0 box the island painted nothing for the whole navigation.
  expect(await island(page).evaluate((el) => getComputedStyle(el).viewTransitionName)).toBe('island');
  const box = (await island(page).boundingBox())!;
  expect(box.width).toBeGreaterThan(0);
  expect(box.height).toBeGreaterThan(0);
  const before = await island(page).elementHandle();
  await page.locator('#work a.card-link[href="/sibkade"]').click();
  await expect(page).toHaveURL(/\/sibkade$/);
  await expect(island(page)).toHaveAttribute('data-view', 'page');
  expect(await page.evaluate((el) => el === document.getElementById('island') && el.isConnected, before)).toBe(true);
  const after = (await island(page).boundingBox())!;
  expect([after.width, after.height]).toEqual([box.width, box.height]);
});

test('a click inside the island wrapper but outside the pill reaches the page', async ({ page }) => {
  await page.goto('/');
  await expect(island(page)).toHaveAttribute('data-view', 'home');
  const wrap = (await island(page).boundingBox())!;
  const pill = (await page.locator('#island nav.isl').boundingBox())!;
  const x = wrap.x + 60;
  const y = pill.y + pill.height + 80;
  expect(x).toBeLessThan(pill.x);
  expect(y).toBeLessThan(wrap.y + wrap.height);
  // Put the Barayand card under that point; its stretched link must get the click, not the wrapper.
  await page.evaluate((py) => {
    const card = document.querySelector('[data-card="barayand"]')!;
    scrollTo(0, card.getBoundingClientRect().top + scrollY - (py - 40));
  }, y);
  await expect
    .poll(() => page.evaluate(([px, py]) => !!document.elementFromPoint(px, py)?.closest('[data-card="barayand"]'), [x, y]))
    .toBe(true);
  await page.mouse.click(x, y);
  await expect(page).toHaveURL(/\/barayand$/);
});

test('the progress dot is clickable once it splits off', async ({ page }) => {
  await page.goto('/');
  await expect(island(page)).toHaveAttribute('data-view', 'home');
  await page.evaluate(() => scrollTo(0, document.getElementById('playground')!.offsetTop));
  await expect(page.locator('#island [data-dot]')).toHaveCSS('opacity', '1');
  await page.locator('#island [data-dot]').click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(2);
  // Focus goes to the top of the page too, so Tab continues from there.
  await expect(page.locator('main#content')).toBeFocused();
});

test('a project page names its chapters and offers the next project at the end', async ({ page }) => {
  await page.goto('/sibkade');
  await expect(island(page)).toHaveAttribute('data-view', 'page');
  await page.evaluate(() => {
    const h = document.getElementById('staying-close-to-the-product')!;
    scrollTo(0, h.getBoundingClientRect().top + scrollY - 100);
  });
  await expect(island(page)).toHaveAttribute('data-view', 'section');
  await expect(label(page)).toHaveText('Staying close to the product');
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await expect(island(page)).toHaveAttribute('data-view', 'next');
  await expect(page.locator('#island [data-slot="next-title"]')).toHaveText('Barayand');
  await page.locator('#island [data-slot="next-link"]').click();
  await expect(page).toHaveURL(/\/barayand$/);
  await expect(island(page)).toHaveAttribute('data-view', 'page');
});

test('the project menu lists chapters and jumps to them', async ({ page }) => {
  await page.goto('/barayand');
  await expect(island(page)).toHaveAttribute('data-view', 'page');
  await page.locator('#island nav.isl').hover();
  await expect(island(page)).toHaveAttribute('data-view', 'menu-page');
  await expect(page.locator('#island .mp-list a')).toHaveText(['The idea', 'What shipped', 'The benchmark']);
  await page.locator('#island .mp-list a[data-nav="the-benchmark"]').click();
  await expect(page).toHaveURL(/#the-benchmark$/);
  await expect(label(page)).toHaveText('The benchmark');
});

test('back returns the island to the home page state', async ({ page }) => {
  await page.goto('/');
  await page.locator('#work a.card-link[href="/sibkade"]').click();
  await expect(island(page)).toHaveAttribute('data-view', 'page');
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(island(page)).toHaveAttribute('data-view', /^(home|section)$/);
  await expect(page.locator('#island [data-slot="title"]')).toHaveText('Parsa Kharazmian');
});

test('the chosen theme survives navigation', async ({ page }) => {
  await page.goto('/');
  await page.locator('#island nav.isl').hover();
  await page.locator('#island [data-view="menu-home"] [data-action="theme"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.mouse.move(12, 700);
  await page.locator('#work a.card-link[href="/sibkade"]').click();
  await expect(page).toHaveURL(/\/sibkade$/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('a keyboard user can open the menu right after a client-side navigation', async ({ page }) => {
  await page.goto('/');
  await page.locator('#work a.card-link[href="/sibkade"]').click();
  await expect(page).toHaveURL(/\/sibkade$/);
  await page.locator('#island nav.isl').focus();
  await expect(island(page)).toHaveAttribute('data-view', 'menu-page');
});
