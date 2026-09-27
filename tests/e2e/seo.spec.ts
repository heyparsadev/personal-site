import { test, expect } from '@playwright/test';

test('the home page description names Parsa, so name searches can use it as the snippet', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    'Parsa Kharazmian, founder & CEO of Sibkade, now building Barayand. Startup × Tech × Psychology.',
  );
});

// A shared link shows this image as its card (LinkedIn, X, Telegram, iMessage). Platforms fetch it by
// absolute URL, trust the declared size, and drop previews that are too small or too heavy.
test('every page offers a link preview image that exists, fits a 1.91:1 card and matches its declared size', async ({ page, request }) => {
  for (const path of ['/', '/barayand', '/sibkade']) {
    await page.goto(path);
    const url = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(url, path).toMatch(/^https:\/\/heyparsa\.com\/.+\.png$/);
    const res = await request.get(new URL(url!).pathname);
    expect(res.ok(), url!).toBe(true);
    expect(res.headers()['content-type']).toBe('image/png');
    const png = await res.body();
    const [width, height] = [png.readUInt32BE(16), png.readUInt32BE(20)]; // the PNG IHDR chunk
    expect(width).toBeGreaterThanOrEqual(1200); // LinkedIn shows the large card only from 1200 px wide
    expect(width / height).toBeCloseTo(1.91, 1);
    expect(png.length).toBeLessThan(300_000); // WhatsApp skips images above ~300 KB
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', String(width));
    await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute('content', String(height));
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute('content', /Parsa Kharazmian/);
  }
});

test('shared links render as a large card, not a thumbnail', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website');
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
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
