import { test, expect, type Page } from '@playwright/test';

const island = (page: Page) => page.locator('#island');
const label = (page: Page) => page.locator('#island [data-roll] .roll-item:not(.out)');

interface VtProbe {
  oldVt?: string; oldName?: string; namesOld: string[];
  newVt?: string; newName?: string; newIsOld?: boolean; namesNew: string[];
  ready?: string; anims: [string | null, string][]; islandZ?: string;
}

/** Records what the next page transition captured and ran, from a capturing astro:before-swap listener
 *  (it runs before the page's own) and astro:after-swap. The old main is tagged so the new one can't pass for it. */
const probeTransition = (page: Page) => page.evaluate(() => {
  const w = window as unknown as { __vt: Partial<VtProbe> };
  const probe: Partial<VtProbe> = { namesOld: [], namesNew: [], anims: [] };
  w.__vt = probe;
  const old = document.querySelector('main')!;
  old.dataset.probe = 'old';
  const names = () => [...document.querySelectorAll('*')].map((el) => getComputedStyle(el).viewTransitionName).filter((n) => n && n !== 'none');
  document.addEventListener('astro:before-swap', (e) => {
    probe.oldVt = old.dataset.vt;
    probe.oldName = getComputedStyle(old).viewTransitionName;
    probe.namesOld = names();
    (e as Event & { viewTransition?: ViewTransition }).viewTransition?.ready.then(() => {
      probe.anims = document.getAnimations().map((a) => [(a.effect as KeyframeEffect | null)?.pseudoElement ?? null, (a as CSSAnimation).animationName]);
      probe.islandZ = getComputedStyle(document.documentElement, '::view-transition-group(island)').zIndex;
      probe.ready = 'ok';
    }, (err: Error) => { probe.ready = err.name; });
  }, { capture: true, once: true });
  document.addEventListener('astro:after-swap', () => {
    const main = document.querySelector('main')!;
    probe.newVt = main.dataset.vt;
    probe.newName = getComputedStyle(main).viewTransitionName;
    probe.newIsOld = main === old;
    probe.namesNew = names();
  }, { once: true });
});

const readProbe = async (page: Page): Promise<VtProbe> => {
  await expect.poll(() => page.evaluate(() => (window as unknown as { __vt: Partial<VtProbe> }).__vt.ready ?? null)).not.toBeNull();
  return page.evaluate(() => (window as unknown as { __vt: VtProbe }).__vt);
};

/** Every page transition's `ready` outcome, in order: 'ok', or the error name (a duplicate name gives InvalidStateError). */
const recordReadies = (page: Page) => page.evaluate(() => {
  const w = window as unknown as { __ready: string[] };
  w.__ready = [];
  document.addEventListener('astro:before-swap', (e) => {
    const i = w.__ready.push('pending') - 1;
    (e as Event & { viewTransition?: ViewTransition }).viewTransition?.ready.then(() => { w.__ready[i] = 'ok'; }, (err: Error) => { w.__ready[i] = err.name; });
  });
});

const expectCleanLanding = async (page: Page) => {
  await expect.poll(() => page.evaluate(() => (window as unknown as { __ready: string[] }).__ready.at(-1))).toBe('ok');
  expect(await page.evaluate(() => (window as unknown as { __ready: string[] }).__ready)).not.toContain('InvalidStateError');
  const mains = await page.locator('main').evaluateAll((els) => els.map((m) => [(m as HTMLElement).dataset.vt, getComputedStyle(m).viewTransitionName]));
  expect(mains).toEqual([['in', 'page-in']]);
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('heyparsa-intro-seen', '1'));
});

test('opening a project card: the island shows it, then the page takes over', async ({ page }) => {
  await page.goto('/');
  await expect(island(page)).toHaveAttribute('data-view', 'home');
  await page.locator('#work a.card-link[href="/sibkade"]').click();
  await expect(page).toHaveURL(/\/sibkade$/);
  await expect(island(page)).toHaveAttribute('data-view', 'page');
  await expect(page.locator('#island [data-slot="title"]')).toHaveText('Sibkade');
  await expect(page.locator('h1')).toHaveText('Sibkade');
  await expect(page.locator('h1')).toHaveCSS('opacity', '1');
});

test('the island element persists across navigation', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { (document.getElementById('island') as HTMLElement & { marker?: number }).marker = 42; });
  await page.locator('#work a.card-link[href="/barayand"]').click();
  await expect(page).toHaveURL(/\/barayand$/);
  expect(await page.evaluate(() => (document.getElementById('island') as HTMLElement & { marker?: number }).marker)).toBe(42);
});

test('the named island keeps a real box and stays the same node across navigation', async ({ page }) => {
  await page.goto('/');
  await expect(island(page)).toHaveAttribute('data-view', 'home');
  // The wrapper is its own view-transition group, and a group is sized to its element's box:
  // with a 0x0 box the island painted nothing for the whole navigation.
  expect(await island(page).evaluate((el) => getComputedStyle(el).viewTransitionName)).toBe('island');
  const box = (await island(page).boundingBox())!;
  expect(box.width).toBeGreaterThan(0);
  expect(box.height).toBeGreaterThan(0);
  const before = await island(page).elementHandle();
  await page.locator('#work a.card-link[href="/sibkade"]').click();
  await expect(page).toHaveURL(/\/sibkade$/);
  await expect(island(page)).toHaveAttribute('data-view', 'page');
  expect(await page.evaluate((el) => el === document.getElementById('island') && el.isConnected, before)).toBe(true);
  const after = (await island(page).boundingBox())!;
  expect([after.width, after.height]).toEqual([box.width, box.height]);
});

test('a page transition names the outgoing and incoming main apart, so neither slides', async ({ page }) => {
  expect(await (await page.request.get('/sibkade')).text()).not.toContain('data-vt');
  await page.goto('/');
  await expect(island(page)).toHaveAttribute('data-view', 'home');
  expect(await page.evaluate(() => document.querySelector('main')!.dataset.vt ?? null)).toBeNull();
  await page.evaluate(() => scrollTo(0, document.getElementById('work')!.offsetTop));
  await probeTransition(page);
  await page.locator('#work a.card-link[href="/sibkade"]').click();
  await expect(page).toHaveURL(/\/sibkade$/);
  await expect(page).toHaveTitle('Sibkade · Parsa Kharazmian');
  await expect(island(page)).toHaveAttribute('data-view', 'page');
  const vt = await readProbe(page);
  expect(vt.ready).toBe('ok');
  expect([vt.oldVt, vt.oldName]).toEqual(['out', 'page-out']);
  expect([vt.newVt, vt.newName, vt.newIsOld]).toEqual(['in', 'page-in', false]);
  for (const names of [vt.namesOld, vt.namesNew]) expect(new Set(names).size).toBe(names.length);
  expect(vt.anims).toContainEqual(['::view-transition-old(page-out)', 'hp-page-out']);
  expect(vt.anims).toContainEqual(['::view-transition-new(page-in)', 'hp-page-rise']);
  // Nothing morphs: under one shared name, main's group animated its box by the whole scroll delta.
  expect(vt.anims.filter(([pseudo]) => pseudo?.startsWith('::view-transition-group'))).toEqual([]);
  expect(vt.islandZ).toBe('1');
});

test('Back to a scrolled home falls into place, under the island', async ({ page }) => {
  await page.goto('/');
  await expect(island(page)).toHaveAttribute('data-view', 'home');
  await page.evaluate(() => scrollTo(0, document.getElementById('work')!.offsetTop));
  await page.locator('#work a.card-link[href="/sibkade"]').click();
  await expect(island(page)).toHaveAttribute('data-view', 'page');
  await probeTransition(page);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(island(page)).toHaveAttribute('data-view', /^(home|section)$/);
  const vt = await readProbe(page);
  expect(vt.ready).toBe('ok');
  expect([vt.oldVt, vt.newVt, vt.newIsOld]).toEqual(['out', 'in', false]);
  expect(vt.anims).toContainEqual(['::view-transition-new(page-in)', 'hp-page-fall']);
  expect(vt.anims.filter(([pseudo]) => pseudo?.startsWith('::view-transition-group'))).toEqual([]);
  // page-in is new to the transition, so its group comes after the island's: the island must stay above it.
  expect(vt.islandZ).toBe('1');
});

test('Back in the middle of a page transition lands cleanly', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(island(page)).toHaveAttribute('data-view', 'home');
  await page.evaluate(() => scrollTo(0, document.getElementById('work')!.offsetTop));
  await recordReadies(page);
  await page.locator('#work a.card-link[href="/sibkade"]').click();
  await page.waitForFunction(() => document.querySelector('main')?.dataset.vt === 'in'); // swapped, still animating
  await page.evaluate(() => history.back());
  await expect(page).toHaveURL(/\/$/);
  await expect(island(page)).toHaveAttribute('data-view', /^(home|section)$/);
  await expectCleanLanding(page);
  expect(errors).toEqual([]);
});

test('a second click before the first swap lands on the second page', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(island(page)).toHaveAttribute('data-view', 'home');
  await page.evaluate(() => scrollTo(0, document.getElementById('work')!.offsetTop));
  await recordReadies(page);
  await page.evaluate(() => {
    const w = window as unknown as { __superseded?: [boolean, string | null] };
    // Click through to Barayand from inside the first navigation's swap: its view transition has
    // already started, so it is superseded mid-flight rather than before it began.
    document.addEventListener('astro:before-swap', () => {
      const a = document.createElement('a');
      a.href = '/barayand';
      document.body.append(a);
      a.click();
      a.remove();
    }, { capture: true, once: true });
    // Runs after page-transition.ts's listener: how did the superseded swap mark its incoming main?
    document.addEventListener('astro:before-swap', (e) => {
      const { signal, newDocument } = e as Event & { signal: AbortSignal; newDocument: Document };
      w.__superseded = [signal.aborted, newDocument.querySelector('main')!.dataset.vt ?? null];
    }, { once: true });
  });
  await page.locator('#work a.card-link[href="/sibkade"]').click();
  await expect(page).toHaveURL(/\/barayand$/);
  await expect(page).toHaveTitle('Barayand · Parsa Kharazmian');
  await expect(page.locator('h1')).toHaveText('Barayand');
  expect(await page.evaluate(() => (window as unknown as { __superseded?: unknown }).__superseded)).toEqual([true, null]);
  await expectCleanLanding(page);
  expect(errors).toEqual([]);
  // The island's own context is not asserted here: router.ts lets the first page-load after a
  // before-preparation consume its single `navigating` flag, so a navigation that starts before the
  // previous one's page-load leaves the island on the previous page (a separate, known issue).
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('a page transition swaps at once: no view-transition animation runs', async ({ page }) => {
    await page.goto('/');
    await expect(island(page)).toHaveAttribute('data-view', 'home');
    await page.evaluate(() => scrollTo(0, document.getElementById('work')!.offsetTop));
    await probeTransition(page);
    await page.locator('#work a.card-link[href="/sibkade"]').click();
    await expect(page).toHaveURL(/\/sibkade$/);
    const vt = await readProbe(page);
    expect(vt.ready).toBe('ok');
    expect([vt.oldVt, vt.newVt]).toEqual(['out', 'in']);
    expect(vt.anims.filter(([pseudo]) => pseudo?.startsWith('::view-transition'))).toEqual([]);
  });
});

test('without the View Transitions API, the fallback fades the old main out and the new one in', async ({ page }) => {
  await page.addInitScript(() => { delete (Document.prototype as { startViewTransition?: unknown }).startViewTransition; });
  await page.goto('/');
  await expect(island(page)).toHaveAttribute('data-view', 'home');
  await page.evaluate(() => {
    const w = window as unknown as { __fb: [string | null, string | undefined, string[]][] };
    w.__fb = [];
    // First sighting of each phase only: the swap strips and re-adds the attribute on <html>.
    new MutationObserver(() => {
      const phase = document.documentElement.getAttribute('data-astro-transition-fallback');
      if (!phase || w.__fb.some(([p]) => p === phase)) return;
      const main = document.querySelector('main')!;
      w.__fb.push([phase, main.dataset.vt, main.getAnimations().map((a) => (a as CSSAnimation).animationName)]);
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-astro-transition-fallback'] });
  });
  await page.locator('#work a.card-link[href="/sibkade"]').click();
  await expect(page).toHaveURL(/\/sibkade$/);
  await expect(island(page)).toHaveAttribute('data-view', 'page');
  expect(await page.evaluate(() => (window as unknown as { __fb: unknown[] }).__fb)).toEqual([
    ['old', 'out', ['hp-page-out']],
    ['new', 'in', ['hp-page-rise']],
  ]);
});

test('a click inside the island wrapper but outside the pill reaches the page', async ({ page }) => {
  await page.goto('/');
  await expect(island(page)).toHaveAttribute('data-view', 'home');
  const wrap = (await island(page).boundingBox())!;
  const pill = (await page.locator('#island nav.isl').boundingBox())!;
  const x = wrap.x + 60;
  const y = pill.y + pill.height + 80;
  expect(x).toBeLessThan(pill.x);
  expect(y).toBeLessThan(wrap.y + wrap.height);
  // Put the Barayand card under that point; its stretched link must get the click, not the wrapper.
  await page.evaluate((py) => {
    const card = document.querySelector('[data-card="barayand"]')!;
    scrollTo(0, card.getBoundingClientRect().top + scrollY - (py - 40));
  }, y);
  await expect
    .poll(() => page.evaluate(([px, py]) => !!document.elementFromPoint(px, py)?.closest('[data-card="barayand"]'), [x, y]))
    .toBe(true);
  await page.mouse.click(x, y);
  await expect(page).toHaveURL(/\/barayand$/);
});

test('the progress dot is clickable once it splits off', async ({ page }) => {
  await page.goto('/');
  await expect(island(page)).toHaveAttribute('data-view', 'home');
  await page.evaluate(() => scrollTo(0, document.getElementById('playground')!.offsetTop));
  await expect(page.locator('#island [data-dot]')).toHaveCSS('opacity', '1');
  await page.locator('#island [data-dot]').click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(2);
  // Focus goes to the top of the page too, so Tab continues from there.
  await expect(page.locator('main#content')).toBeFocused();
});

test('a project page names its chapters and offers the next project at the end', async ({ page }) => {
  await page.goto('/sibkade');
  await expect(island(page)).toHaveAttribute('data-view', 'page');
  await page.evaluate(() => {
    const h = document.getElementById('staying-close-to-the-product')!;
    scrollTo(0, h.getBoundingClientRect().top + scrollY - 100);
  });
  await expect(island(page)).toHaveAttribute('data-view', 'section');
  await expect(label(page)).toHaveText('Staying close to the product');
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await expect(island(page)).toHaveAttribute('data-view', 'next');
  await expect(page.locator('#island [data-slot="next-title"]')).toHaveText('Barayand');
  await page.locator('#island [data-slot="next-link"]').click();
  await expect(page).toHaveURL(/\/barayand$/);
  await expect(island(page)).toHaveAttribute('data-view', 'page');
});

test('at the end of a project page the island also offers Home, which returns to the Work section', async ({ page }) => {
  await page.goto('/sibkade');
  await expect(island(page)).toHaveAttribute('data-view', 'page');
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await expect(island(page)).toHaveAttribute('data-view', 'next');
  const home = page.locator('#island [data-view="next"] [data-slot="next-home"]');
  await expect(home).toHaveAttribute('href', '/#work');
  await expect(home).toHaveAccessibleName('Home');
  await expect(home).toBeVisible();
  // A person moves onto the island and takes a moment before clicking: the actions must stay put
  // (hovering the island elsewhere opens its menu, which would swap this view out).
  await home.hover();
  await page.waitForTimeout(400);
  await expect(island(page)).toHaveAttribute('data-view', 'next');
  await expect(home).toBeVisible();
  await home.click();
  await expect(page).toHaveURL(/\/#work$/);
  await expect
    .poll(() => page.evaluate(() => Math.abs(document.getElementById('work')!.getBoundingClientRect().top)))
    .toBeLessThan(40);
  await expect(island(page)).toHaveAttribute('data-view', 'section');
  await expect(label(page)).toHaveText('Work');
});

test('the project menu lists chapters and jumps to them', async ({ page }) => {
  await page.goto('/barayand');
  await expect(island(page)).toHaveAttribute('data-view', 'page');
  await page.locator('#island nav.isl').hover();
  await expect(island(page)).toHaveAttribute('data-view', 'menu-page');
  await expect(page.locator('#island .mp-list a')).toHaveText(['The idea', 'What shipped', 'The benchmark']);
  await page.locator('#island .mp-list a[data-nav="the-benchmark"]').click();
  await expect(page).toHaveURL(/#the-benchmark$/);
  await expect(label(page)).toHaveText('The benchmark');
});

test('back returns the island to the home page state', async ({ page }) => {
  await page.goto('/');
  await page.locator('#work a.card-link[href="/sibkade"]').click();
  await expect(island(page)).toHaveAttribute('data-view', 'page');
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(island(page)).toHaveAttribute('data-view', /^(home|section)$/);
  await expect(page.locator('#island [data-slot="title"]')).toHaveText('Parsa Kharazmian');
});

test('a jump still in flight does not outlive a Back to a page outside the site map', async ({ page }) => {
  await page.goto('/nope');
  await expect(island(page)).toHaveAttribute('data-view', 'notfound');
  await page.locator('main a.nf-link').click();
  await expect(page).toHaveURL(/\/$/);
  await expect(island(page)).toHaveAttribute('data-view', 'home');
  // Start a long smooth jump and go Back in the same task, so the jump is surely still scrolling.
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('#island .menu [data-nav="about"]')!.click();
    history.back();
  });
  await expect(page).toHaveURL(/\/nope$/);
  await expect(island(page)).toHaveAttribute('data-view', 'notfound');
});

test('the chosen theme survives navigation', async ({ page }) => {
  await page.goto('/');
  await page.locator('#island nav.isl').hover();
  await page.locator('#island [data-view="menu-home"] [data-action="theme"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.mouse.move(12, 700);
  await page.locator('#work a.card-link[href="/sibkade"]').click();
  await expect(page).toHaveURL(/\/sibkade$/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('a keyboard user can open the menu right after a client-side navigation', async ({ page }) => {
  await page.goto('/');
  await page.locator('#work a.card-link[href="/sibkade"]').click();
  await expect(page).toHaveURL(/\/sibkade$/);
  await page.locator('#island nav.isl').focus();
  await expect(island(page)).toHaveAttribute('data-view', 'menu-page');
});
