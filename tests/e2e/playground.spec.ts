import { test, expect } from '@playwright/test';

const ORDER = ['Bargasht', 'ApplyBot', 'Apsis', 'The Descent', 'Delta', 'Sisyphus', 'Persian LLM Eval', 'Claude Code plugins'];

test('the playground is a black band in both themes', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#playground')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await page.addInitScript(() => localStorage.setItem('heyparsa-theme', 'dark'));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('#playground')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
});

test('it holds a card per project, in content order', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h2#playground-title')).toHaveText('Playground');
  await expect(page.locator('#playground li.pg-card')).toHaveCount(8);
  await expect(page.locator('#playground li.pg-card .pg-stage canvas[aria-hidden="true"]')).toHaveCount(8);
  expect(await page.locator('#playground .pg-card h3').allTextContents()).toEqual(ORDER);
});

test('fonts come from the site, never from Google', async ({ page }) => {
  const urls: string[] = [];
  page.on('request', (r) => urls.push(r.url()));
  await page.goto('/');
  await page.locator('#playground').scrollIntoViewIfNeeded();
  await expect.poll(() => urls.some((u) => u.endsWith('/fonts/geist-mono-latin.woff2'))).toBe(true);
  expect(urls.filter((u) => /fonts\.(googleapis|gstatic)\.com/.test(u))).toEqual([]);
});

test('focus rings are white on the band', async ({ page }) => {
  await page.goto('/');
  const open = page.locator('#playground [data-sheet-open]').first();
  await open.focus();
  await expect(open).toBeFocused();
  // Keyboard focus, not a programmatic one: Tab away and back so :focus-visible applies.
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(open).toBeFocused();
  // The ring goes round the whole card, as on the Work cards.
  await expect(page.locator('#playground .pg-card').first()).toHaveCSS('outline-color', 'rgb(255, 255, 255)');
  await expect(page.locator('#playground .pg-card').first()).toHaveCSS('outline-style', 'solid');
});

/** True once a canvas has painted anything: any pixel with alpha. */
const drawn = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d');
  if (!ctx || !canvas.width || !canvas.height) return false;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 3; i < data.length; i += 4) if (data[i] > 0) return true;
  return false;
};

/** Scrolls each stage into view and waits until its canvas has drawn. */
async function expectEveryStageDraws(page: import('@playwright/test').Page, timeout = 5000) {
  const stages = page.locator('#playground .pg-stage');
  await expect(stages).toHaveCount(8);
  for (let i = 0; i < 8; i++) {
    const stage = stages.nth(i);
    await stage.scrollIntoViewIfNeeded();
    await expect.poll(() => stage.locator('canvas').evaluate(drawn), { timeout, message: `stage ${i + 1}` }).toBe(true);
  }
}

test('every stage draws once it scrolls into view', async ({ page }) => {
  await page.goto('/');
  await expectEveryStageDraws(page);
});

test('stages draw a still frame under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expectEveryStageDraws(page);
});

test('stages still draw when the fonts never arrive', async ({ page }) => {
  await page.route('**/fonts/*.woff2', (route) => route.abort());
  await page.goto('/');
  await expectEveryStageDraws(page, 8000);
});

test('a resized stage redraws at its new size', async ({ page }) => {
  await page.goto('/');
  await page.setViewportSize({ width: 390, height: 844 });
  const canvas = page.locator('#playground .pg-stage canvas').first();
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.width === Math.round(c.clientWidth * Math.min(2, devicePixelRatio)))).toBe(true);
  await expect.poll(() => canvas.evaluate(drawn)).toBe(true);
});

const pause = (page: import('@playwright/test').Page) => page.locator('#playground button.pg-pause');
const pixels = (page: import('@playwright/test').Page) =>
  page.locator('#playground .pg-stage canvas').first().evaluate((c: HTMLCanvasElement) => c.toDataURL());

test('the pause toggle stops the stages and starts them again', async ({ page }) => {
  await page.goto('/');
  const first = page.locator('#playground .pg-stage').first();
  await first.scrollIntoViewIfNeeded();
  await expect.poll(() => first.locator('canvas').evaluate(drawn)).toBe(true);
  await expect(pause(page)).toHaveAccessibleName('Pause motion');
  await expect(pause(page)).toHaveAttribute('aria-pressed', 'false');
  await pause(page).click();
  await expect(pause(page)).toHaveAttribute('aria-pressed', 'true');
  await first.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const held = await pixels(page);
  await page.waitForTimeout(1200);
  expect(await pixels(page)).toBe(held);
  await pause(page).click();
  await expect(pause(page)).toHaveAttribute('aria-pressed', 'false');
  await first.scrollIntoViewIfNeeded();
  await expect.poll(() => pixels(page), { timeout: 3000 }).not.toBe(held);
});

test('the pause is remembered', async ({ page }) => {
  await page.goto('/');
  await pause(page).click();
  await expect(pause(page)).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(pause(page)).toHaveAttribute('aria-pressed', 'true');
});

test('reduced motion starts the band paused', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(pause(page)).toHaveAttribute('aria-pressed', 'true');
});

test('the toggle still works when storage throws', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('storage blocked'); };
    Storage.prototype.setItem = () => { throw new Error('storage blocked'); };
  });
  await page.goto('/');
  await pause(page).click();
  await expect(pause(page)).toHaveAttribute('aria-pressed', 'true');
  await pause(page).click();
  await expect(pause(page)).toHaveAttribute('aria-pressed', 'false');
  expect(errors).toEqual([]);
});

test('the island takes its light edge only over the band', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).not.toHaveClass(/island-on-stage/);
  await page.evaluate(() => scrollTo(0, document.getElementById('playground')!.offsetTop + 200));
  await expect(html).toHaveClass(/island-on-stage/);
  await page.evaluate(() => scrollTo(0, document.getElementById('about')!.offsetTop + 100));
  await expect(html).not.toHaveClass(/island-on-stage/);
});

test('leaving home and coming back remounts the stages', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => scrollTo(0, document.getElementById('playground')!.offsetTop + 200));
  await expect(page.locator('html')).toHaveClass(/island-on-stage/);
  await page.locator('#work a.card-link[href="/barayand"]').click();
  await expect(page).toHaveURL(/\/barayand$/);
  await expect(page.locator('html')).not.toHaveClass(/island-on-stage/);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('#playground .pg-stage canvas')).toHaveCount(8);
  await expectEveryStageDraws(page);
});

const seconds = (text: string) => { const [m, s] = text.split(':').map(Number); return m * 60 + s; };
const sisyphus = (page: import('@playwright/test').Page) => page.locator('#playground .pg-card').nth(5);
/** The countdown's settled value, kept in Sisyphus's sheet: decode keeps its target in data-text while the digits flicker. */
async function secondsLeft(page: import('@playwright/test').Page) {
  const stat = page.locator('#sheet-sisyphus [data-stat-value]');
  await expect.poll(() => stat.getAttribute('data-text')).not.toBeNull();
  return seconds((await stat.getAttribute('data-text'))!);
}

test('a stage below the fold stays dark until it prints in', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1500);
  const last = page.locator('#playground .pg-stage canvas').last();
  expect(await last.evaluate(drawn)).toBe(false);
});

test('a push starts when its stage is first seen', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(3500);
  await sisyphus(page).locator('.pg-stage').scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  const left = await secondsLeft(page);
  expect(left).toBeGreaterThanOrEqual(57);
});

test('pressing play on a band that started paused starts each push from the top', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await sisyphus(page).locator('.pg-stage').scrollIntoViewIfNeeded();
  await page.waitForTimeout(3000);
  await pause(page).click();
  await expect(pause(page)).toHaveAttribute('aria-pressed', 'false');
  await sisyphus(page).locator('.pg-stage').scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  const left = await secondsLeft(page);
  expect(left).toBeGreaterThanOrEqual(57);
});

test.describe('cards and their sheets', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem('heyparsa-intro-seen', '1'));
  });

  test('a card shows one line, and its sheet holds the rest', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('#playground .pg-card').nth(4);
    await expect(card.locator('.pg-line')).toHaveText('My career as a river, seen from a satellite.');
    await expect(card).not.toContainText('Plain HTML, CSS and WebGL');
    await expect(page.locator('#playground .pg-card').nth(6).locator('.pg-line')).toHaveText('A benchmark for how well language models actually handle Persian.');
    await expect(page.locator('#playground .pg-card').nth(5).locator('.pg-line em')).toHaveText('The Myth of Sisyphus');
  });

  test('a card opens its project in a black sheet, with the whole story, the number and the links', async ({ page }) => {
    await page.goto('/');
    const open = page.locator('[data-sheet-open="delta"]');
    await open.scrollIntoViewIfNeeded();
    // On its "+": the drawing covers the middle of the card's button.
    await open.locator('.pg-plus').click();
    const sheet = page.locator('#sheet-delta');
    await expect(sheet).toBeVisible();
    await expect(sheet).toHaveAttribute('role', 'dialog');
    await expect(sheet).toHaveCSS('background-color', 'rgb(0, 0, 0)');
    await expect(sheet.locator('h2')).toHaveText('Delta');
    await expect(sheet).toContainText('Plain HTML, CSS and WebGL, no dependencies.');
    await expect(sheet.locator('[data-stat-label]')).toHaveText('Channels in the river');
    await expect(sheet.locator('[data-stat-value]')).toHaveText('4');
    await expect(sheet.locator('a[href="https://delta.heyparsa.com"]')).toBeVisible();
    await expect(sheet.locator('a[href="https://github.com/heyparsadev/delta"]')).toBeVisible();
    await expect(page).toHaveURL(/#delta$/);
    await expect(page.locator('#island')).toHaveAttribute('data-view', 'sheet');
    await expect(page.locator('#island [data-slot="sheet-title"]')).toHaveText('Delta');
  });

  test('clicking the drawing opens the sheet too', async ({ page }) => {
    await page.goto('/');
    const stage = page.locator('#playground .pg-card').nth(2).locator('.pg-stage');
    await stage.scrollIntoViewIfNeeded();
    await stage.click();
    await expect(page.locator('#sheet-apsis')).toBeVisible();
  });

  test('the drawing still answers the pointer: the leaderboard reads out the run under it', async ({ page }) => {
    await page.goto('/');
    const stage = page.locator('#playground .pg-card').nth(6).locator('.pg-stage');
    await stage.scrollIntoViewIfNeeded();
    await expect.poll(() => stage.locator('canvas').evaluate(drawn)).toBe(true);
    const box = (await stage.boundingBox())!;
    // The readout only shows once the drawing has printed in, so keep nudging the pointer until it does.
    let x = 0.2;
    await expect.poll(async () => {
      x = x === 0.2 ? 0.22 : 0.2;
      await page.mouse.move(box.x + box.width * x, box.y + box.height / 2);
      return stage.locator('.mg-readout').isVisible();
    }).toBe(true);
    await expect(stage.locator('.mg-readout')).toContainText('rank');
  });

  test('Escape closes the sheet and hands focus back to its card', async ({ page }) => {
    await page.goto('/');
    const open = page.locator('[data-sheet-open="bargasht"]');
    await open.scrollIntoViewIfNeeded();
    await open.locator('.pg-plus').click();
    await expect(page.locator('#sheet-bargasht')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#sheet-bargasht')).toBeHidden();
    await expect(open).toBeFocused();
    await expect(page.locator('main')).not.toHaveAttribute('inert', '');
  });

  test('a #apsis link opens that sheet on load', async ({ page }) => {
    await page.goto('/#apsis');
    await expect(page.locator('#sheet-apsis')).toBeVisible();
    await expect(page.locator('#sheet-apsis')).toContainText('Time, kept at a distance.');
  });

  test("a #sisyphus link opens a sheet whose countdown runs, though the card is far down the page", async ({ page }) => {
    await page.goto('/#sisyphus');
    await expect(page.locator('#sheet-sisyphus')).toBeVisible();
    const stat = page.locator('#sheet-sisyphus [data-stat-value]');
    await expect.poll(async () => { const t = await stat.getAttribute('data-text'); return t ? seconds(t) : 60; }, { timeout: 6000 }).toBeLessThan(60);
  });

  test("a sheet's links keep their square corners under the keyboard's focus ring", async ({ page }) => {
    await page.goto('/');
    const open = page.locator('[data-sheet-open="delta"]');
    await open.scrollIntoViewIfNeeded();
    await open.locator('.pg-plus').click();
    await expect(page.locator('#sheet-delta')).toHaveClass(/is-settled/);
    const link = page.locator('#sheet-delta a[href="https://delta.heyparsa.com"]');
    for (let i = 0; i < 4 && !(await link.evaluate((a) => a === document.activeElement)); i++) await page.keyboard.press('Tab');
    await expect(link).toBeFocused();
    await expect(link).toHaveCSS('outline-style', 'solid');
    await expect(link).toHaveCSS('border-top-left-radius', '0px');
  });

  test('a sheet grows out of its square card and stays square, while a Work sheet keeps its round corners', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __radii: string[][] };
      w.__radii = [];
      const animate = Element.prototype.animate;
      Element.prototype.animate = function (this: Element, keyframes: Keyframe[] | PropertyIndexedKeyframes | null, options?: number | KeyframeAnimationOptions) {
        if (this.classList.contains('sheet')) w.__radii.push((keyframes as Keyframe[]).map((k) => String(k.borderRadius)));
        return animate.call(this, keyframes, options);
      };
    });
    await page.goto('/');
    // A Playground card opens on its "+", a Work card anywhere on its button.
    for (const [id, open] of [['apsis', page.locator('[data-sheet-open="apsis"] .pg-plus')], ['helpfinity', page.locator('[data-sheet-open="helpfinity"]')]] as const) {
      await open.scrollIntoViewIfNeeded();
      await open.click();
      await expect(page.locator(`#sheet-${id}`)).toHaveClass(/is-settled/);
      await page.keyboard.press('Escape');
      await expect(page.locator(`#sheet-${id}`)).toBeHidden();
    }
    // Opening and closing each: Apsis's card and sheet are square, HelpFinity's card is 28 px and its sheet 32 px.
    expect(await page.evaluate(() => (window as unknown as { __radii: string[][] }).__radii)).toEqual([
      ['0px', '0px'], ['0px', '0px'], ['28px', '32px'], ['32px', '28px'],
    ]);
  });

  test('the band stays short on a desktop: under 2.6 screens', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const height = await page.locator('#playground').evaluate((el) => el.getBoundingClientRect().height);
    expect(height).toBeLessThan(2.6 * 900);
  });

  test('every drawing has room for its six rows between its HUDs, from a small phone to a desktop', async ({ page }) => {
    for (const [width, height] of [[320, 640], [390, 844], [700, 900], [768, 1024], [834, 1112], [1024, 768], [1440, 900]]) {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      // Stage.measure's rows: the plot starts on the first 15 px line below the top HUD and ends above the bottom
      // one, and a stage always draws at least six, so fewer than six here means the drawing prints over its legend.
      const rows = await page.locator('#playground .pg-card .pg-stage').evaluateAll((stages) => stages.map((s) => {
        const top = (s.querySelector('.mg-hud-top') as HTMLElement).offsetHeight;
        const bottom = (s.querySelector('.mg-hud-bottom') as HTMLElement).offsetHeight;
        return Math.floor((s.clientHeight - bottom - 2) / 15) - 1 - Math.ceil((top + 4) / 15) + 1;
      }));
      for (const [i, n] of rows.entries()) expect(n, `${width}px, card ${i + 1}`).toBeGreaterThanOrEqual(6);
    }
  });

  test("at 320 px nothing in a card's HUD runs past its stage", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('/');
    const over = await page.locator('#playground .pg-card .mg-hud').evaluateAll((huds) => huds.filter((h) => h.scrollWidth > h.clientWidth).map((h) => h.textContent?.trim()));
    expect(over).toEqual([]);
  });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('the cards are one swipe row: the next card peeks in and the counter follows', async ({ page }) => {
    await page.goto('/');
    const row = page.locator('#playground .pg-cards');
    await row.scrollIntoViewIfNeeded();
    await expect(row).toHaveCSS('scroll-snap-type', 'x mandatory');
    expect(await row.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    const [first, second] = await row.locator('.pg-card').evaluateAll((cards) => cards.slice(0, 2).map((c) => c.getBoundingClientRect()));
    expect(first.left).toBeGreaterThanOrEqual(16);
    expect(second.left).toBeGreaterThan(first.right);
    expect(second.left).toBeLessThan(390 - 24);
    const count = page.locator('#playground .pg-count');
    await expect(count).toHaveText('01 / 08');
    await row.evaluate((el) => el.scrollTo({ left: 2 * ((el.firstElementChild as HTMLElement).offsetWidth + parseFloat(getComputedStyle(el).columnGap)) }));
    await expect(count).toHaveText('03 / 08');
    await row.evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
    await expect(count).toHaveText('08 / 08');
  });

  test('the band is about one screen tall', async ({ page }) => {
    await page.goto('/');
    const height = await page.locator('#playground').evaluate((el) => el.getBoundingClientRect().height);
    expect(height).toBeLessThan(1.4 * 844);
  });

  test('a swipe that starts on a drawing moves the row', async ({ page }) => {
    await page.goto('/');
    const row = page.locator('#playground .pg-cards');
    const canvas = row.locator('.pg-card canvas').first();
    await canvas.scrollIntoViewIfNeeded();
    const box = (await canvas.boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.synthesizeScrollGesture', { x: box.x + box.width * 0.7, y: box.y + box.height / 2, xDistance: -160, yDistance: 0, gestureSourceType: 'touch', speed: 800 });
    await expect.poll(() => row.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  });

  test('two fingers on a drawing can still zoom the page', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('#playground .pg-card canvas').first();
    await canvas.scrollIntoViewIfNeeded();
    const box = (await canvas.boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.synthesizePinchGesture', { x: box.x + box.width / 2, y: box.y + box.height / 2, scaleFactor: 2, gestureSourceType: 'touch' });
    await expect.poll(() => page.evaluate(() => visualViewport!.scale)).toBeGreaterThan(1.2);
  });

  test("a card's focus ring has room inside the swipe row", async ({ page }) => {
    await page.goto('/');
    const open = page.locator('#playground [data-sheet-open]').first();
    await open.focus();
    // Keyboard focus, not a programmatic one: Tab away and back so :focus-visible applies.
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(open).toBeFocused();
    const [card, row] = await page.evaluate(() => [document.querySelector('#playground .pg-card')!, document.querySelector('#playground .pg-cards')!].map((e) => e.getBoundingClientRect()));
    // The ring is 2 px wide, 3 px out from the card; the row clips whatever crosses its edges.
    expect(card.top - 5).toBeGreaterThanOrEqual(row.top);
    expect(card.bottom + 5).toBeLessThanOrEqual(row.bottom);
  });
});
