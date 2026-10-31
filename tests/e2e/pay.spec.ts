import { test, expect } from '@playwright/test';

test('the payment page shows each way to pay, exactly', async ({ page }) => {
  await page.goto('/pay');
  await expect(page.locator('h1')).toHaveText('Payment details.');
  await expect(page.locator('[data-method]')).toHaveCount(3);
  await expect(page.locator('[data-method]').locator('h2')).toHaveText(['Bank transfer', 'PayPal', 'Bitcoin']);
  for (const text of ['Parsa Kharazmian', 'MT98 CFTE 2800 4000 0000 0000 5059 076', 'CFTEMTM1', 'kzn.parsa@gmail.com', 'bc1q77j8tjzjx80ex7suuvgg6rc8uxtwj6dljukzj7']) {
    await expect(page.locator('[data-method]').getByText(text, { exact: true })).toBeVisible();
  }
});

test('copy buttons copy the raw value, and say so', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  // Tests in other files write to the same clipboard in parallel (the island copies the email), so record what this
  // page hands to the clipboard instead of reading the shared clipboard back.
  await page.addInitScript(() => {
    const w = window as unknown as { __copied: string[] };
    w.__copied = [];
    const write = navigator.clipboard.writeText.bind(navigator.clipboard);
    navigator.clipboard.writeText = (text: string) => {
      w.__copied.push(text);
      return write(text);
    };
  });
  await page.goto('/pay');
  const copied = () => page.evaluate(() => (window as unknown as { __copied: string[] }).__copied.at(-1));
  await page.getByRole('button', { name: 'Copy IBAN' }).click();
  await expect.poll(copied).toBe('MT98CFTE28004000000000005059076');
  await expect(page.locator('[data-field="IBAN"] [role="status"]')).toHaveText('Copied');
  await page.getByRole('button', { name: 'Copy Bitcoin address' }).click();
  await expect.poll(copied).toBe('bc1q77j8tjzjx80ex7suuvgg6rc8uxtwj6dljukzj7');
  await page.getByRole('button', { name: 'Copy all bank transfer details' }).click();
  await expect.poll(copied).toBe('Beneficiary: Parsa Kharazmian\nIBAN: MT98CFTE28004000000000005059076\nBIC / SWIFT: CFTEMTM1');
});

test('the payment page stays out of search and off the site’s own links', async ({ page, request }) => {
  await page.goto('/pay');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  expect(await (await request.get('/sitemap.xml')).text()).not.toContain('/pay');
  await page.goto('/');
  await expect(page.locator('a[href$="/pay"]')).toHaveCount(0);
});

test('the island names the page', async ({ page }) => {
  await page.goto('/pay');
  await expect(page.locator('#island [data-view="page"] [data-slot="title"]')).toHaveText('Payment details');
});

test('each way to pay sits on a Monoglyph stage, its main value in pixel type', async ({ page }) => {
  await page.goto('/pay');
  const methods = page.locator('[data-method]');
  await expect(methods).toHaveCount(3);
  for (let i = 0; i < 3; i++) {
    await expect(methods.nth(i)).toHaveCSS('background-color', 'rgb(0, 0, 0)');
    await expect(methods.nth(i).locator('.pay-main')).toHaveCSS('font-family', /Geist Pixel/);
  }
  await expect(methods.locator('.pay-main')).toHaveText(['MT98 CFTE 2800 4000 0000 0000 5059 076', 'kzn.parsa@gmail.com', 'bc1q77j8tjzjx80ex7suuvgg6rc8uxtwj6dljukzj7']);
});
