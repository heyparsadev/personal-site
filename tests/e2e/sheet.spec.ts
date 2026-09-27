import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('heyparsa-intro-seen', '1'));
});

test('the + button opens HelpFinity in a sheet and the island follows', async ({ page }) => {
  await page.goto('/');
  const btn = page.locator('[data-sheet-open="helpfinity"]');
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  const sheet = page.locator('#sheet-helpfinity');
  await expect(sheet).toBeVisible();
  await expect(sheet).toHaveAttribute('role', 'dialog');
  await expect(sheet).toContainText('Coda, 2026.');
  await expect(page).toHaveURL(/#helpfinity$/);
  await expect(page.locator('#island')).toHaveAttribute('data-view', 'sheet');
  await expect(page.locator('#island [data-slot="sheet-title"]')).toHaveText('HelpFinity');
  await expect(page.locator('main')).toHaveAttribute('inert', '');
});

test('Escape closes the sheet and returns focus to the + button', async ({ page }) => {
  await page.goto('/');
  const btn = page.locator('[data-sheet-open="helpfinity"]');
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  const sheet = page.locator('#sheet-helpfinity');
  await expect(sheet).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(btn).toBeFocused();
  await expect(page.locator('main')).not.toHaveAttribute('inert', '');
  expect(page.url()).not.toContain('#helpfinity');
});

test('Escape pressed mid-open reverses the sheet from its live position, not a snap to full size', async ({ page }) => {
  // Record every WAAPI .animate() call made on a .sheet element, so we can inspect the close
  // animation's actual starting keyframe instead of trying to sample a rendered box at a precise
  // (and inherently racy) instant. Installed as an init script so it wraps the method before any
  // page script (including sheet.ts) runs.
  await page.addInitScript(() => {
    const orig = Element.prototype.animate;
    (window as unknown as { __sheetAnimateCalls: unknown[][] }).__sheetAnimateCalls = [];
    Element.prototype.animate = function (this: Element, keyframes: Keyframe[] | PropertyIndexedKeyframes | null, options?: number | KeyframeAnimationOptions) {
      if (this.classList.contains('sheet')) {
        (window as unknown as { __sheetAnimateCalls: unknown[][] }).__sheetAnimateCalls.push(keyframes as unknown[]);
      }
      return orig.call(this, keyframes, options);
    };
  });
  await page.goto('/');
  const btn = page.locator('[data-sheet-open="helpfinity"]');
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  const sheet = page.locator('#sheet-helpfinity');
  await expect(sheet).toBeVisible();
  // The open animation (springEasing(0.5, 0.86)) runs ~700ms; press Escape well inside that
  // window so the close is guaranteed to interrupt it, not follow a settled sheet.
  await page.waitForTimeout(150);
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(btn).toBeFocused();
  await expect(page.locator('main')).not.toHaveAttribute('inert', '');

  const calls = await page.evaluate(() => (window as unknown as { __sheetAnimateCalls: { transform: string }[][] }).__sheetAnimateCalls);
  expect(calls).toHaveLength(2); // the interrupted open call, then the close call
  const [, closeKeyframes] = calls;
  // Before the fix this was hard-coded to 'none' (the sheet's fully-open resting transform),
  // which made an interrupted close always snap to full size first. It must now be whatever the
  // sheet's live, still-animating transform was at the moment Escape was pressed.
  expect(closeKeyframes[0].transform).not.toBe('none');
});

test.describe('engines without CSS linear() easing', () => {
  // Safari before 17.2: CSS.supports() says no, and Web Animations throws on a linear() easing.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __easings: string[] };
      w.__easings = [];
      const supports = CSS.supports.bind(CSS) as (...a: string[]) => boolean;
      CSS.supports = ((...a: string[]) => (a.some((s) => s.includes('linear(')) ? false : supports(...a))) as typeof CSS.supports;
      const animate = Element.prototype.animate;
      Element.prototype.animate = function (this: Element, keyframes: Keyframe[] | PropertyIndexedKeyframes | null, options?: number | KeyframeAnimationOptions) {
        const easing = typeof options === 'object' ? (options.easing ?? '') : '';
        if (this.classList.contains('sheet')) w.__easings.push(easing);
        if (easing.startsWith('linear(')) throw new TypeError('Invalid easing');
        return animate.call(this, keyframes, options);
      };
    });
  });

  test('the sheet animates on the fallback curve, then closes', async ({ page }) => {
    await page.goto('/');
    const btn = page.locator('[data-sheet-open="helpfinity"]');
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    const sheet = page.locator('#sheet-helpfinity');
    await expect(sheet).toHaveClass(/is-settled/);
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
    await expect(btn).toBeFocused();
    await expect(page.locator('main')).not.toHaveAttribute('inert', '');
    const easings = await page.evaluate(() => (window as unknown as { __easings: string[] }).__easings);
    expect(easings).toEqual(['cubic-bezier(.22, 1, .36, 1)', 'cubic-bezier(.22, 1, .36, 1)']);
  });
});

test('if Web Animations throws, the sheet opens and closes without animating and never locks the page', async ({ page }) => {
  await page.addInitScript(() => {
    Element.prototype.animate = () => { throw new TypeError('Web Animations unavailable'); };
  });
  await page.goto('/');
  const btn = page.locator('[data-sheet-open="helpfinity"]');
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  const sheet = page.locator('#sheet-helpfinity');
  await expect(sheet).toHaveClass(/is-settled/);
  await expect(sheet).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(btn).toBeFocused();
  await expect(page.locator('main')).not.toHaveAttribute('inert', '');
  await expect(page.locator('html')).not.toHaveClass(/sheet-lock/);
  expect(page.url()).not.toContain('#helpfinity');
});

test('the island closes the sheet', async ({ page }) => {
  await page.goto('/');
  const btn = page.locator('[data-sheet-open="iranspoti"]');
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  await expect(page.locator('#island')).toHaveAttribute('data-view', 'sheet');
  await page.locator('#island [data-action="close-sheet"]').click();
  await expect(page.locator('#sheet-iranspoti')).toBeHidden();
  await expect(page.locator('#island')).not.toHaveAttribute('data-view', 'sheet');
});

test('a #iranspoti link opens that sheet on load', async ({ page }) => {
  await page.goto('/#iranspoti');
  await expect(page.locator('#sheet-iranspoti')).toBeVisible();
  await expect(page.locator('#sheet-iranspoti')).toContainText('The first draft of Sibkade.');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('titles and sheet text are still readable', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#sheet-helpfinity')).toBeVisible();
    await expect(page.locator('#sheet-helpfinity')).toContainText('Mind Mirror');
  });
});
