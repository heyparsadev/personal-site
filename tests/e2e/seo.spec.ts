import { test, expect } from '@playwright/test';

test('the home page description names Parsa, so name searches can use it as the snippet', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    'Parsa Kharazmian, founder & CEO of Sibkade, now building Barayand. Startup × Tech × Psychology.',
  );
});

test('robots.txt allows crawling and points to the sitemap', async ({ request }) => {
  const res = await request.get('/robots.txt');
  expect(res.ok()).toBe(true);
  const body = await res.text();
  expect(body).toContain('User-agent: *');
  expect(body).toContain('Allow: /');
  expect(body).toContain('Sitemap: https://heyparsa.com/sitemap.xml');
});

test('the sitemap lists home and every project page, exactly as their canonical URLs', async ({ request, page }) => {
  const res = await request.get('/sitemap.xml');
  expect(res.ok()).toBe(true);
  expect(res.headers()['content-type']).toContain('xml');
  const xml = await res.text();
  expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  expect(locs).toEqual(['https://heyparsa.com/', 'https://heyparsa.com/barayand', 'https://heyparsa.com/sibkade']);
  for (const loc of locs) {
    await page.goto(new URL(loc).pathname);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', loc);
  }
});
