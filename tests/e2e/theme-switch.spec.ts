import { test, expect, type Page } from '@playwright/test';

declare global {
  interface Window {
    __vt: number;
    __views: string[];
    __frames: { t: number; clip: string; vt: boolean; bg: string; wave: string; waveOpacity: number }[];
    __held: string[];
    __sampled: boolean;
  }
}

const skipIntro = (page: Page) => page.addInitScript(() => sessionStorage.setItem('heyparsa-intro-seen', '1'));

/** Counts the view transitions the page starts (window.__vt). */
const countTransitions = (page: Page) =>
  page.addInitScript(() => {
    window.__vt = 0;
    const start = document.startViewTransition?.bind(document);
    if (!start) return;
    document.startViewTransition = ((...args: Parameters<typeof start>) => {
      window.__vt++;
      return start(...args);
    }) as typeof document.startViewTransition;
  });

/** Opens the home menu and returns its theme button. */
const menuButton = async (page: Page) => {
  await page.locator('#island nav.isl').hover();
  await expect(page.locator('#island')).toHaveAttribute('data-view', 'menu-home');
  return page.locator('#island [data-view="menu-home"] [data-action="theme"]');
};

const switched = async (page: Page, theme: 'light' | 'dark') => {
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('html')).not.toHaveClass(/\btheme-vt\b/);
};

test.beforeEach(async ({ page }) => {
  await skipIntro(page);
});

test('the button is a gold sun in light mode and a silver crescent with a star in dark, and says whether dark is on', async ({ page }) => {
  await page.goto('/');
  const button = await menuButton(page);
  const icon = button.locator('svg');
  const rays = button.locator('.ti-rays');
  const disc = button.locator('.ti-core');
  const star = button.locator('.ti-star');
  const bite = page.locator('#island .ti-bite');
  await expect(button).toHaveAttribute('aria-label', 'Dark appearance');
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  await expect(icon).toHaveCSS('color', 'rgb(255, 214, 10)');
  await expect(rays).toHaveCSS('opacity', '1');
  await expect(disc).toHaveCSS('transform', 'none');
  await expect(bite).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 8, -8)');
  await expect(star).toHaveCSS('opacity', '0');

  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect(icon).toHaveCSS('color', 'rgb(238, 240, 248)');
  await expect(rays).toHaveCSS('opacity', '0');
  await expect(disc).toHaveCSS('transform', 'matrix(1.78, 0, 0, 1.78, 0, 0)');
  await expect(bite).toHaveCSS('transform', 'none');
  await expect(star).toHaveCSS('opacity', '1');

  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  await expect(icon).toHaveCSS('color', 'rgb(255, 214, 10)');
  await expect(rays).toHaveCSS('opacity', '1');
  await expect(disc).toHaveCSS('transform', 'none');
  await expect(star).toHaveCSS('opacity', '0');
});

test('the new appearance spreads in a circle from the button and uncovers the final colours', async ({ page }) => {
  await countTransitions(page);
  await page.goto('/');
  const button = await menuButton(page);
  await button.click({ trial: true }); // waits until the opening menu has stopped moving
  const box = (await button.boundingBox())!;
  // Every frame until the switch has come and gone: the clip on the new page's snapshot, whether the switch
  // is under way, the colours, and the ring that draws the circle's edge inside the island.
  await page.evaluate(() => {
    window.__frames = [];
    window.__sampled = false;
    const html = document.documentElement;
    const wave = document.querySelector('#island [data-slot="wave"]')!;
    const t0 = performance.now();
    let seen = false;
    const tick = () => {
      const vt = html.classList.contains('theme-vt');
      seen ||= vt;
      window.__frames.push({
        t: performance.now() - t0,
        clip: getComputedStyle(html, '::view-transition-new(root)').clipPath,
        vt,
        bg: getComputedStyle(document.body).backgroundColor,
        wave: getComputedStyle(wave).transform,
        waveOpacity: Number(getComputedStyle(wave).opacity),
      });
      if ((seen && !vt) || performance.now() - t0 > 5000) window.__sampled = true;
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await button.click();
  await switched(page, 'dark');
  await expect.poll(() => page.evaluate(() => window.__sampled)).toBe(true);
  const frames = await page.evaluate(() => window.__frames);
  const ring = await page.evaluate(() => {
    const wave = document.querySelector('#island [data-slot="wave"]')!;
    const nav = document.querySelector('#island nav.isl')!.getBoundingClientRect();
    return { x: nav.left + Number(wave.getAttribute('cx')), y: nav.top + Number(wave.getAttribute('cy')) };
  });

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const { width, height } = page.viewportSize()!;
  const cover = Math.hypot(Math.max(cx, width - cx), Math.max(cy, height - cy));
  const circles = frames.flatMap((f) => {
    const m = f.clip.match(/^circle\(([\d.]+)px at ([\d.]+)px ([\d.]+)px\)$/);
    return m ? [{ ...f, r: Number(m[1]), x: Number(m[2]), y: Number(m[3]) }] : [];
  });
  // The new page shows through a circle centred on the button, for most of the 650 ms...
  expect(circles.length).toBeGreaterThan(5);
  expect(circles.at(-1)!.t - circles[0].t).toBeGreaterThan(400);
  for (const c of circles) {
    expect(Math.abs(c.x - cx)).toBeLessThan(8);
    expect(Math.abs(c.y - cy)).toBeLessThan(8);
    expect(c.vt).toBe(true);
    // ...and already in its new colours, not a half-second fade towards them.
    expect(c.bg).toBe('rgb(0, 0, 0)');
  }
  // It grows from the button until it covers the viewport.
  expect(circles.some((c) => c.r > 0.2 * cover && c.r < 0.8 * cover)).toBe(true);
  expect(Math.max(...circles.map((c) => c.r))).toBeGreaterThan(0.9 * cover);
  // Inside the black island, where the circle can't be seen, a ring draws its edge: same centre, same size.
  expect(Math.abs(ring.x - cx)).toBeLessThan(8);
  expect(Math.abs(ring.y - cy)).toBeLessThan(8);
  const early = circles.filter((c) => c.r > 4 && c.r < 300);
  expect(early.length).toBeGreaterThan(0);
  for (const c of early) {
    expect(c.waveOpacity).toBeGreaterThan(0);
    expect(Math.abs(Number(c.wave.match(/^matrix\(([\d.]+),/)![1]) - c.r)).toBeLessThan(3);
  }
  expect(frames.at(-1)!.waveOpacity).toBe(0);
  expect(frames.at(-1)!.vt).toBe(false);
  expect(await page.evaluate(() => window.__vt)).toBe(1);
});

test('the menu stays open under the pointer while the circle spreads, and the button keeps its highlight', async ({ page }) => {
  await page.goto('/');
  const button = await menuButton(page);
  await page.evaluate(() => {
    window.__views = [];
    window.__held = [];
    window.__sampled = false;
    const island = document.getElementById('island')!;
    new MutationObserver(() => window.__views.push(island.dataset.view ?? '')).observe(island, { attributeFilter: ['data-view'] });
    // The button's background on every frame of the switch.
    const btn = island.querySelector('[data-view="menu-home"] [data-action="theme"]')!;
    const t0 = performance.now();
    let seen = false;
    const tick = () => {
      const vt = document.documentElement.classList.contains('theme-vt');
      seen ||= vt;
      if (vt) window.__held.push(getComputedStyle(btn).backgroundColor);
      if ((seen && !vt) || performance.now() - t0 > 5000) window.__sampled = true;
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await button.click();
  // A hand is never quite still: nudge the pointer around inside the button while the circle spreads.
  const box = (await button.boundingBox())!;
  for (let i = 0; i < 8; i++) {
    await page.mouse.move(box.x + box.width / 2 + (i % 2 ? 2 : -2), box.y + box.height / 2);
    await page.waitForTimeout(50);
  }
  await switched(page, 'dark');
  // Past the menu's close delay (380 ms): a pointerleave during the switch would have closed it by now.
  await page.waitForTimeout(450);
  expect(await page.evaluate(() => window.__views)).toEqual([]);
  await expect.poll(() => page.evaluate(() => window.__sampled)).toBe(true);
  const held = await page.evaluate(() => window.__held);
  expect(held.length).toBeGreaterThan(5);
  expect(new Set(held)).toEqual(new Set(['rgba(255, 255, 255, 0.14)']));
  await expect(button).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.14)'); // and :hover has it again
});

test('a pointer that leaves during the switch closes the menu once the switch is over', async ({ page }) => {
  await page.goto('/');
  await (await menuButton(page)).click();
  await expect(page.locator('html')).toHaveClass(/\btheme-vt\b/);
  await page.mouse.move(12, 700);
  await switched(page, 'dark');
  await expect(page.locator('#island')).toHaveAttribute('data-view', 'home');
});

test('a keyboard switch leaves the menu open while focus stays in it, wherever the mouse is', async ({ page }) => {
  await page.goto('/');
  await page.mouse.move(12, 700);
  await page.locator('#island nav.isl').focus();
  await expect(page.locator('#island')).toHaveAttribute('data-view', 'menu-home');
  const button = page.locator('#island [data-view="menu-home"] [data-action="theme"]');
  await button.focus();
  await page.keyboard.press('Enter');
  await switched(page, 'dark');
  await page.waitForTimeout(450); // past the menu's close delay
  await expect(page.locator('#island')).toHaveAttribute('data-view', 'menu-home');
  await expect(button).toBeFocused();
});

test('after a switch, links still navigate and the project page menu shows the same state', async ({ page }) => {
  await page.goto('/');
  await (await menuButton(page)).click();
  await switched(page, 'dark');
  await page.mouse.move(12, 700);
  await page.locator('#work a.card-link[href="/sibkade"]').click();
  await expect(page).toHaveURL(/\/sibkade$/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  // Focus, not hover: hover-open waits out the navigation (core.navLock), focus opens at once.
  await page.locator('#island nav.isl').focus();
  await expect(page.locator('#island')).toHaveAttribute('data-view', 'menu-page');
  const button = page.locator('#island [data-view="menu-page"] [data-action="theme"]');
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect(button.locator('.ti-rays')).toHaveCSS('opacity', '0');
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the switch uses the soft colour fade, without the circle', async ({ page }) => {
    await countTransitions(page);
    await page.goto('/');
    const button = await menuButton(page);
    await button.click();
    await switched(page, 'dark');
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => window.__vt)).toBe(0);
    await expect(page.locator('body')).toHaveCSS('transition-duration', '0.5s, 0.5s');
  });
});
