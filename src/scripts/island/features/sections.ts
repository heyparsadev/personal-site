import type { IslandCore } from '../core';
import { currentSection, pageProgress, rollDirection, type SectionTop } from '../scroll';
import { normalizePath } from '../../../lib/page-ctx';

const SETTLE_MS = 180;
const CHAPTER_OFFSET = 96;

/** Moves keyboard focus to a jump target without scrolling, so the next Tab continues from there.
 *  The tabindex is temporary: once focus leaves, clicks inside the target no longer focus it. */
function focusTarget(el: HTMLElement): void {
  if (!el.hasAttribute('tabindex')) {
    el.setAttribute('tabindex', '-1');
    el.addEventListener('blur', () => el.removeAttribute('tabindex'), { once: true });
  }
  el.focus({ preventScroll: true });
}

/** Names the section (home) or chapter (project) being read, drives the progress dot, and smooth-scrolls in-page links. */
export function installSections(core: IslandCore): void {
  let tops: SectionTop[] = [];
  let current: string | null = null;
  let jumping = false;
  let lastMove = 0;
  let lastY = -1;
  let docH = 1;

  const measure = () => {
    tops = [];
    for (const s of core.ctx.sections) {
      const el = document.getElementById(s.id);
      if (el) tops.push({ id: s.id, label: s.label, top: el.getBoundingClientRect().top + scrollY });
    }
    docH = document.documentElement.scrollHeight;
    lastY = -1;
  };
  const labelOf = (id: string | null) => tops.find((t) => t.id === id)?.label ?? core.ctx.title;

  const sync = (animate: boolean) => {
    const hit = currentSection(tops, scrollY, innerHeight);
    const id = hit ? hit.id : null;
    if (id === current) return;
    const dir = rollDirection(tops, current, id);
    current = id;
    core.dom.highlight(id);
    const showing = core.dom.current === 'section';
    if (core.dom.setLabel(labelOf(id), dir, animate && showing) && showing) core.fit();
  };

  const jump = (id: string, target: number) => {
    core.dom.setJump(id === 'top' ? 'Top' : labelOf(id), target < scrollY);
    core.state.menu = false;
    core.state.contact = false;
    jumping = true;
    lastMove = performance.now();
    core.flash('jump');
    scrollTo({ top: target, behavior: core.reduced ? 'auto' : 'smooth' });
    // Take the keyboard's place along, as a plain in-page link would: the next Tab continues from
    // the target, not from the menu link (or dot) this jump just hid. Leaving the island this way
    // also closes the menu through menu.ts's focusout.
    const to = id === 'top' ? document.querySelector<HTMLElement>('main#content') : document.getElementById(id);
    if (to) focusTarget(to);
    history.replaceState(history.state, '', id === 'top' ? location.pathname : `#${id}`);
  };

  core.onPage(() => {
    jumping = false;
    current = null;
    measure();
    core.dom.setLabel(core.ctx.title, 1, false);
    core.dom.highlight(null);
    sync(false);
  });
  addEventListener('resize', measure);
  addEventListener('load', measure);
  void document.fonts?.ready.then(measure);

  core.on('nav', (payload) => {
    const { id, anchor, event } = payload as { id: string; anchor: HTMLAnchorElement; event: MouseEvent };
    if (normalizePath(new URL(anchor.href, location.href).pathname) !== normalizePath(location.pathname)) return;
    const el = document.getElementById(id);
    if (!el) return;
    event.preventDefault();
    const offset = core.ctx.kind === 'project' && id !== 'top' ? CHAPTER_OFFSET : 0;
    jump(id, Math.max(0, el.getBoundingClientRect().top + scrollY - offset));
  });
  core.dom.dot.addEventListener('click', () => jump('top', 0));

  core.onFrame((_dt, now) => {
    const y = scrollY;
    if (jumping) {
      if (Math.abs(y - lastY) > 0.5) lastMove = now;
      else if (now - lastMove > SETTLE_MS) {
        jumping = false;
        sync(false);
        core.flash(null);
      }
    }
    if (y !== lastY) {
      if (!jumping) sync(true);
      core.dom.setProgress(pageProgress(y, innerHeight, docH));
    }
    lastY = y;
  });
}
