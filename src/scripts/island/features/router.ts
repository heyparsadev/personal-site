import type { TransitionBeforePreparationEvent } from 'astro:transitions/client';
import type { IslandCore } from '../core';
import { homeCtx, normalizePath, parseCtx, type PageCtx, type SiteMap } from '../../../lib/page-ctx';

const MIN_OPENING_MS = 350;
// Comfortably more than menu.ts's own OPEN_DELAY (70ms): once the island's box has stopped
// resizing, any hover-open that a last-moment spurious pointerenter (see below) already
// scheduled has had time to fire -- and be turned away by navLock -- before the lock lifts.
const SETTLE_BUFFER_MS = 200;

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
  let settledAt: number | null = null;

  // A navigation can leave the pointer resting over the persisted island (it was over the link
  // that led here) while the island's own box keeps morphing through several sizes -- the
  // outgoing view's, 'opening', then the new page's. That resize is spring-animated rather than
  // instant, so a stationary pointer can end up straddling the box's moving edge, and the
  // browser fires genuine (not stale) pointerenter/pointerleave pairs purely from the box
  // sweeping past it -- `pointer-events: none` does not reliably suppress this while the box is
  // under active size/transform animation, so that isn't a fix. core.navLock (checked by
  // menu.ts's open()) blocks the resulting hover/focus-open outright instead. It lifts the
  // moment a real pointermove happens (the pointer is doing something new, so normal hover is
  // trustworthy again), or once the box has settled into the new page's size and stayed there
  // for SETTLE_BUFFER_MS, whichever comes first -- the latter also covers keyboard-only
  // navigation, where no pointermove will ever come.
  document.addEventListener('pointermove', () => {
    core.navLock = false;
  });

  core.onFrame((_dt, now) => {
    if (!core.navLock || navigating || !core.w.settled || !core.h.settled) {
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
