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

  isl.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse') return;
    clearTimeout(closeT);
    // core.navLock (set by router.ts): a client-side navigation's box resize can sweep under a
    // stationary pointer and fire a *genuine* pointerenter with no real mouse movement involved
    // -- checked here, at the moment the hover-open would actually fire, rather than in open()
    // itself, because a resize can only ever produce a spurious hover; it cannot fabricate a
    // focusin or a click, so those paths (keyboard, touch, tap) stay fully live during a
    // navigation and this check never touches them.
    openT = window.setTimeout(() => { if (!core.navLock) open(); }, OPEN_DELAY);
  });
  isl.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'mouse') return;
    clearTimeout(openT);
    closeT = window.setTimeout(close, CLOSE_DELAY);
  });
  isl.addEventListener('focusin', () => {
    clearTimeout(closeT);
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
    isl.blur();
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
    if (!root.contains(e.target as Node) && (core.state.menu || core.state.contact)) close();
  }, true);
  core.on('close-menu', close);
}
