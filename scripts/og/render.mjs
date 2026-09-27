// Renders the link preview (card.html) to public/og.png at 1200×630. Run with: npm run og
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const card = new URL('./card.html', import.meta.url);
const out = fileURLToPath(new URL('../../public/og.png', import.meta.url));

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto(card.href);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out });
  console.log(`wrote ${out}`);
} finally {
  await browser.close();
}
