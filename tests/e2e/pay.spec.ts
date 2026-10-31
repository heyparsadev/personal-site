import { test, expect, type Page } from '@playwright/test';

const island = (page: Page) => page.locator('#island');

/** Tests in other files write to the same clipboard in parallel (the island copies the email), so record what the
 *  page hands to the clipboard instead of reading the shared clipboard back. */
async function recordCopies(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __copied: string[] };
    w.__copied = [];
    const write = navigator.clipboard.writeText.bind(navigator.clipboard);
    navigator.clipboard.writeText = (text: string) => {
      w.__copied.push(text);
      return write(text);
    };
  });
  return () => page.evaluate(() => (window as unknown as { __copied: string[] }).__copied.at(-1));
}

test('the payment page shows each way to pay, exactly, with its own logo', async ({ page }) => {
  await page.goto('/pay');
  await expect(page.locator('h1')).toHaveText('Payment details.');
  const methods = page.locator('[data-method]');
  await expect(methods).toHaveCount(3);
  await expect(methods.locator('h2')).toHaveText(['Bank transfer', 'PayPal', 'Bitcoin']);
  for (const [i, brand] of ['SEPA', 'PayPal', 'Bitcoin'].entries()) {
    const logo = methods.nth(i).locator('.pi-logo');
    await expect(logo).toHaveAttribute('role', 'img');
    await expect(logo).toHaveAttribute('aria-label', brand);
    await expect(logo.locator('path')).not.toHaveCount(0);
  }
  for (const text of ['Parsa Kharazmian', 'MT98 CFTE 2800 4000 0000 0000 5059 076', 'CFTEMTM1', 'kzn.parsa@gmail.com', 'bc1q77j8tjzjx80ex7suuvgg6rc8uxtwj6dljukzj7']) {
    await expect(methods.getByText(text, { exact: true })).toBeVisible();
  }
});

test('copying a detail copies the raw value and says so in the island', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const copied = await recordCopies(page);
  await page.goto('/pay');
  await page.getByRole('button', { name: 'Copy IBAN' }).click();
  await expect.poll(copied).toBe('MT98CFTE28004000000000005059076');
  await expect(island(page)).toHaveAttribute('data-view', 'copied');
  await expect(page.locator('#island [data-slot="copied"]')).toHaveText('IBAN copied');
  await page.getByRole('button', { name: 'Copy Bitcoin address' }).click();
  await expect.poll(copied).toBe('bc1q77j8tjzjx80ex7suuvgg6rc8uxtwj6dljukzj7');
  await expect(page.locator('#island [data-slot="copied"]')).toHaveText('Bitcoin address copied');
  await page.getByRole('button', { name: 'Copy all bank transfer details' }).click();
  await expect.poll(copied).toBe('Beneficiary: Parsa Kharazmian\nIBAN: MT98CFTE28004000000000005059076\nBIC / SWIFT: CFTEMTM1');
  await expect(page.locator('#island [data-slot="copied"]')).toHaveText('Bank details copied');
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
