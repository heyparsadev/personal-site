import { test, expect } from '@playwright/test';

const ctxOf = async (page: import('@playwright/test').Page) => JSON.parse((await page.locator('main #page-ctx').textContent()) ?? 'null');

test('every page has the island and a page context', async ({ page }) => {
  for (const [path, kind, key] of [['/', 'home', 'home'], ['/sibkade', 'project', 'sibkade'], ['/nope', 'notfound', 'notfound']] as const) {
    await page.goto(path);
    await expect(page.locator('#island nav.isl')).toHaveCount(1);
    const ctx = await ctxOf(page);
    expect(ctx.kind).toBe(kind);
    expect(ctx.key).toBe(key);
  }
});

test('project context lists chapters and the next project', async ({ page }) => {
  await page.goto('/barayand');
  const ctx = await ctxOf(page);
  expect(ctx.sections.map((s: { id: string }) => s.id)).toEqual(['the-idea', 'what-shipped', 'the-benchmark']);
  expect(ctx.next.href).toBe('/sibkade');
  expect(ctx.statusLabel).toBe('Now');
});

test('site map covers home and the project pages', async ({ page }) => {
  await page.goto('/');
  const map = JSON.parse((await page.locator('#site-map').textContent())!);
  expect(Object.keys(map).sort()).toEqual(['/', '/barayand', '/sibkade']);
});

test('island renders every view', async ({ page }) => {
  await page.goto('/');
  const views = await page.locator('#island [data-view]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.view));
  expect(views).toEqual(expect.arrayContaining([
    'hello', 'home', 'page', 'notfound', 'section', 'menu-home', 'menu-page', 'contact', 'copied', 'jump',
    'opening', 'next', 'sheet', 'd-sibkade', 'd-barayand', 'd-startup', 'd-tech', 'd-psychology',
  ]));
});
