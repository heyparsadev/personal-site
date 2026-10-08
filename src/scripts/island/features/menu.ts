import type { IslandCore } from '../core';

const OPEN_DELAY = 70;
const CLOSE_DELAY = 380;

/** Hover (mouse), focus (keyboard) or tap (touch) opens the menu. Clicks inside the island become core events. */
export function installMenu(core: IslandCore): void {
  const { isl, root } = core.dom;
  let openT = 0;
  let closeT = 0;

  const open = () => {
    if (core.state.sheet) return;
    core.interrupt();
    core.state.word = null;
    core.emit('lit', null);
    core.state.menu = true;
    core.resolve();
  };
  const close = () => {
    core.state.menu = false;
    core.state.contact = false;
    core.resolve();
  };
  // Copy and Escape hide the control that has focus. Focus goes back to the nav itself, so the
  // keyboard user keeps their place, behind a one-shot flag that skips focusin's focus-opens-menu
  // path. Focus events fire synchronously inside focus(), so the flag can't outlive this call.
  // If focus has already moved elsewhere on the page, it is left there.
  let quiet = false;
  const refocus = () => {
    const a = document.activeElement;
    if (a && a !== document.body && !isl.contains(a)) return;
    quiet = true;
    try {
      isl.focus({ preventScroll: true });
    } finally {
      quiet = false;
    }
  };

  // While the theme switch runs (core.switching), the browser aims every pointer event at <html>: the
  // island gets a pointerleave the mouse never made, and a press anywhere looks like one outside it. Both
  // are ignored until 'switched', which then closes the menu if the mouse really did leave meanwhile.
  let hovered = false;
  let mouse = { x: -1, y: -1 };
  const track = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') mouse = { x: e.clientX, y: e.clientY };
  };
  addEventListener('pointermove', track, { passive: true });
  addEventListener('pointerdown', track, { passive: true });
  core.on('switched', () => {
    const r = isl.getBoundingClientRect();
    if (!hovered || (mouse.x >= r.left && mouse.x <= r.right && mouse.y >= r.top && mouse.y <= r.bottom)) return;
    hovered = false;
    clearTimeout(closeT);
    closeT = window.setTimeout(close, CLOSE_DELAY);
  });

  isl.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse') return;
    hovered = true;
    track(e);
    clearTimeout(closeT);
    // core.navLock (set by router.ts): a client-side navigation's box resize can sweep under a
    // stationary pointer and fire a *genuine* pointerenter with no real mouse movement involved
    // -- checked here, at the moment the hover-open would actually fire, rather than in open()
    // itself, because a resize can only ever produce a spurious hover; it cannot fabricate a
    // focusin or a click, so those paths (keyboard, touch, tap) stay fully live during a
    // navigation and this check never touches them.
    // The end-of-page view (Home + next project) is itself the set of actions: hovering it must
    // leave those links in place to be clicked, not swap them out for the menu. Keyboard focus
    // and taps still open the menu as usual.
    openT = window.setTimeout(() => { if (!core.navLock && core.dom.current !== 'next') open(); }, OPEN_DELAY);
  });
  isl.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'mouse' || core.switching) return;
    hovered = false;
    clearTimeout(openT);
    closeT = window.setTimeout(close, CLOSE_DELAY);
  });
  isl.addEventListener('focusin', () => {
    clearTimeout(closeT);
    if (quiet) return;
    if (!core.state.menu && !core.state.contact) open();
  });
  isl.addEventListener('focusout', (e) => {
    if (!isl.contains(e.relatedTarget as Node | null)) close();
  });
  isl.addEventListener('pointerdown', () => { core.press.t = 0.96; });
  addEventListener('pointerup', () => { core.press.t = 1; });
  addEventListener('pointercancel', () => { core.press.t = 1; });
  isl.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    close();
    refocus();
  });

  isl.addEventListener('click', (e) => {
    const t = e.target as Element;
    const action = t.closest<HTMLElement>('[data-action]');
    if (action) { e.preventDefault(); core.emit('action', action.dataset.action); return; }
    const copy = t.closest<HTMLElement>('[data-copy]');
    if (copy) { e.preventDefault(); core.emit('copy', copy.dataset.copy); return; }
    const nav = t.closest<HTMLAnchorElement>('[data-nav]');
    if (nav) { core.emit('nav', { id: nav.dataset.nav, anchor: nav, event: e }); return; }
    if (t.closest('a[href]')) { close(); return; }
    if (core.state.sheet) { core.emit('action', 'close-sheet'); return; }
    if (!core.state.menu && !core.state.contact) open();
  });

  document.addEventListener('pointerdown', (e) => {
    if (core.switching) return;
    if (!root.contains(e.target as Node) && (core.state.menu || core.state.contact)) close();
  }, true);
  core.on('close-menu', close);
  core.on('refocus', refocus);
}
