import { test, expect, type Page } from '@playwright/test';

/** Presses Tab until `selector` has focus (keyboard only), failing after `max` presses. */
async function tabTo(page: Page, selector: string, max = 12): Promise<void> {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate((s) => document.activeElement?.matches(s) ?? false, selector)) return;
  }
  throw new Error(`Tab never reached ${selector}`);
}

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('skips the long intro and shows the title without blur', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#island')).toHaveAttribute('data-view', 'home', { timeout: 1500 });
    await expect(page.locator('h1')).toHaveCSS('opacity', '1');
    await expect(page.locator('h1')).toHaveCSS('filter', 'none');
    await expect(page.locator('h1')).toHaveCSS('transform', 'none');
  });

  test('crossfades only: scrolling fades the title in place, nothing slides or scales', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#island')).toHaveAttribute('data-view', 'home', { timeout: 1500 });
    await page.evaluate(() => scrollTo(0, innerHeight * 0.3));
    await expect.poll(() => page.locator('h1').evaluate((e) => Number(getComputedStyle(e).opacity))).toBeLessThan(0.9);
    await expect(page.locator('h1')).toHaveCSS('transform', 'none');
    await expect(page.locator('main [data-scroll-fade]')).toHaveCSS('transform', 'none');
    const scales = await page.locator('#island .iv').evaluateAll((els) => els.map((e) => new DOMMatrix(getComputedStyle(e).transform).a));
    expect(scales.every((a) => a === 1)).toBe(true);
  });

  test('a section label changes in place: it crossfades, it does not roll', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#island')).toHaveAttribute('data-view', 'home', { timeout: 1500 });
    await page.evaluate(() => scrollTo(0, innerHeight * 0.6));
    await expect(page.locator('#island')).toHaveAttribute('data-view', 'section');
    // Read both labels mid-change: the frame after the outgoing one is marked .out.
    const transforms = await page.evaluate(async () => {
      const roll = document.querySelector('#island [data-roll]')!;
      scrollTo(0, document.getElementById('playground')!.offsetTop);
      for (let i = 0; i < 60 && !roll.querySelector('.roll-item.out'); i++) await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => requestAnimationFrame(r));
      return [...roll.querySelectorAll('.roll-item')].map((el) => getComputedStyle(el).transform);
    });
    expect(transforms.length).toBeGreaterThanOrEqual(2);
    expect(transforms).toEqual(transforms.map(() => 'none'));
  });
});

test('keyboard: skip link first, then the island opens its menu on focus', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Safari skips links on Tab unless the user enables it');
  await page.addInitScript(() => sessionStorage.setItem('heyparsa-intro-seen', '1'));
  await page.goto('/');
  await expect(page.locator('#island')).toHaveAttribute('data-view', 'home');
  await page.keyboard.press('Tab');
  await expect(page.locator('a.skip-link')).toBeFocused();
  // Real controls keep global.css's ring.
  await expect(page.locator('a.skip-link')).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Tab');
  await expect(page.locator('#island nav.isl')).toBeFocused();
  await expect(page.locator('#island')).toHaveAttribute('data-view', 'menu-home');
  // One ring: the nav's own box-shadow, not global.css's :focus-visible outline on top of it.
  await expect(page.locator('#island nav.isl')).toHaveCSS('outline-style', 'none');
  // ...in the solid accent (5.39:1 on the page, 3.77:1 on the pill).
  await expect(page.locator('#island nav.isl')).toHaveCSS('box-shadow', 'rgb(0, 102, 204) 0px 0px 0px 3px');
  await page.keyboard.press('Escape');
  await expect(page.locator('#island')).toHaveAttribute('data-view', 'home');
});

test.describe('keyboard: island actions keep focus', () => {
  test.beforeEach(async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Safari skips links on Tab unless the user enables it');
    await page.addInitScript(() => sessionStorage.setItem('heyparsa-intro-seen', '1'));
    await page.goto('/');
    await expect(page.locator('#island')).toHaveAttribute('data-view', 'home');
  });

  test('Enter on Contact focuses its first row; Escape hands focus back to the nav', async ({ page }) => {
    await tabTo(page, '#island [data-view="menu-home"] [data-action="contact"]');
    await page.keyboard.press('Enter');
    await expect(page.locator('#island')).toHaveAttribute('data-view', 'contact');
    await expect(page.locator('#island [data-view="contact"] .row').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#island')).toHaveAttribute('data-view', 'home');
    await expect(page.locator('#island nav.isl')).toBeFocused();
    await page.waitForTimeout(300);
    await expect(page.locator('#island')).toHaveAttribute('data-view', 'home');
  });

  test('a jump to About moves focus there, so Tab continues after it, not from the top', async ({ page }) => {
    await tabTo(page, '#island .menu [data-nav="about"]');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#about$/);
    await expect(page.locator('#about')).toBeFocused();
    await expect(page.locator('#about')).toHaveCSS('outline-style', 'none');
    await page.keyboard.press('Tab');
    // #about holds no controls of its own, so the next Tab lands on the first one after it.
    await expect(page.locator('#contact .links a').first()).toBeFocused();
  });

  test('a jump to Playground, then Tab: focus is inside #playground', async ({ page }) => {
    await tabTo(page, '#island .menu [data-nav="playground"]');
    await page.keyboard.press('Enter');
    await expect(page.locator('#playground')).toBeFocused();
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement !== document.getElementById('playground') && document.getElementById('playground')!.contains(document.activeElement))).toBe(true);
  });

  test('a blocked copy says "Copy blocked" on the pill and to screen readers alike', async ({ page }) => {
    await page.evaluate(() => { navigator.clipboard.writeText = () => Promise.reject(new DOMException('Denied', 'NotAllowedError')); });
    await tabTo(page, '#island [data-view="menu-home"] [data-action="contact"]');
    await page.keyboard.press('Enter');
    await tabTo(page, '#island [data-view="contact"] [data-copy]', 6);
    await page.keyboard.press('Enter');
    await expect(page.locator('#island')).toHaveAttribute('data-view', 'copied');
    await expect(page.locator('#island [data-slot="copied"]')).toHaveText('Copy blocked');
    await expect(page.locator('#island [aria-live="polite"]')).toHaveText('Copy blocked');
  });

  test('copying the email announces it and hands focus back to the nav, menu closed', async ({ page, context, browserName }) => {
    if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await tabTo(page, '#island [data-view="menu-home"] [data-action="contact"]');
    await page.keyboard.press('Enter');
    await tabTo(page, '#island [data-view="contact"] [data-copy]', 6);
    await page.keyboard.press('Enter');
    await expect(page.locator('#island')).toHaveAttribute('data-view', 'copied');
    await expect(page.locator('#island [aria-live="polite"]')).toHaveText('Email copied');
    await expect(page.locator('#island nav.isl')).toBeFocused();
    // After the 1.5 s notice the island rests; returning focus must not have reopened the menu.
    await expect(page.locator('#island')).toHaveAttribute('data-view', 'home', { timeout: 3000 });
    await expect(page.locator('#island nav.isl')).toBeFocused();
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the island is hidden and a project page links home', async ({ page }) => {
    await page.goto('/sibkade');
    await expect(page.locator('#island')).toBeHidden();
    const home = page.locator('main a[href="/"]');
    await expect(home).toBeVisible();
    await expect(home).toHaveText('← Home');
  });

  test('the home page shows no "+" buttons; the sheets are plain sections after main', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#island')).toBeHidden();
    const plus = page.locator('[data-sheet-open]');
    await expect(plus).toHaveCount(2);
    for (const b of await plus.all()) await expect(b).toBeHidden();
    for (const id of ['#sheet-helpfinity', '#sheet-iranspoti']) {
      await expect(page.locator(id)).toBeVisible();
      expect(await page.locator(id).evaluate((s) => !!(document.querySelector('main')!.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    }
  });
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
