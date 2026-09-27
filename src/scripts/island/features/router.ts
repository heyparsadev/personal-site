import type { TransitionBeforePreparationEvent } from 'astro:transitions/client';
import type { IslandCore } from '../core';
import { homeCtx, normalizePath, parseCtx, type PageCtx, type SiteMap } from '../../../lib/page-ctx';

const MIN_OPENING_MS = 350;
// Comfortably more than menu.ts's own OPEN_DELAY (70ms): once the island's box has stopped
// resizing, any hover-open that a last-moment spurious pointerenter (see below) already
// scheduled has had time to fire -- and be turned away by navLock -- before the lock lifts.
const SETTLE_BUFFER_MS = 200;
// Safety net: navLock must never outlive a navigation that never finishes (a superseded or
// failed astro:page-load), so it is force-released this long after it was set regardless of
// whether the box ever reports settled.
const LOCK_TIMEOUT_MS = 2000;

export function readCtx(): PageCtx {
  return parseCtx(document.querySelector('main #page-ctx')?.textContent) ?? homeCtx();
}

/** Keeps the island in step with client-side navigations: it shows where you're heading, then takes the new page's context. */
export function installRouter(core: IslandCore): void {
  let siteMap: SiteMap = {};
  try {
    siteMap = JSON.parse(document.getElementById('site-map')?.textContent || '{}') as SiteMap;
  } catch {
    siteMap = {};
  }
  let navigating = false;
  let openedAt = 0;
  let lockedAt = 0;
  let settledAt: number | null = null;

  // A navigation can leave the pointer resting over the persisted island (it was over the link
  // that led here) while the island's own box keeps morphing through several sizes -- the
  // outgoing view's, 'opening', then the new page's. That resize is spring-animated rather than
  // instant (the under-damped w/h springs can take close to a second to settle), so a stationary
  // pointer can end up straddling the box's moving edge, and the browser fires a genuine (not
  // stale) pointerenter purely from the box sweeping past it, with no real mouse movement
  // involved. `pointer-events: none` does not reliably suppress this while the box is under
  // active size/transform animation, so that isn't a fix either. core.navLock (checked only by
  // menu.ts's hover path -- see menu.ts) blocks the resulting hover-open outright instead.
  //
  // The lock is released once the box has settled into the new page's size and stayed that way
  // for SETTLE_BUFFER_MS -- never on the first pointermove: an incidental move right as the user
  // releases their click (their hand isn't perfectly still) would otherwise disarm the guard
  // while the box is still actively resizing, letting a later sweep through unprotected. A
  // bounded LOCK_TIMEOUT_MS also force-releases the lock so a navigation that never reaches
  // astro:page-load (superseded or failed) can't hold hover open shut forever.
  core.onFrame((_dt, now) => {
    if (!core.navLock) {
      settledAt = null;
      return;
    }
    if (now - lockedAt > LOCK_TIMEOUT_MS) {
      core.navLock = false;
      settledAt = null;
      return;
    }
    if (navigating || !core.w.settled || !core.h.settled) {
      settledAt = null;
      return;
    }
    if (settledAt === null) settledAt = now;
    else if (now - settledAt > SETTLE_BUFFER_MS) core.navLock = false;
  });

  document.addEventListener('astro:before-preparation', (e) => {
    navigating = true;
    const to = normalizePath((e as TransitionBeforePreparationEvent).to.pathname);
    if (to === normalizePath(location.pathname)) return;
    core.navLock = true;
    lockedAt = performance.now();
    const link = siteMap[to];
    if (!link) return;
    core.dom.setOpening(link);
    core.state.menu = false;
    core.state.contact = false;
    core.state.word = null;
    core.emit('lit', null);
    openedAt = performance.now();
    core.flash('opening');
  });

  document.addEventListener('astro:page-load', () => {
    if (!navigating) return;
    navigating = false;
    core.setPage(readCtx(), false);
    if (core.state.flash !== 'opening') return;
    const wait = core.reduced ? 0 : Math.max(0, MIN_OPENING_MS - (performance.now() - openedAt));
    window.setTimeout(() => {
      if (core.state.flash === 'opening') core.flash(null);
    }, wait);
  });
}
