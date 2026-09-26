import type { IslandCore } from '../core';
import { clamp } from '../scroll';

const LEAVE_DELAY = 150;

/** Hero live words preview themselves in the island. Desktop: hover or focus. Touch: the first tap previews, a second tap follows a link. */
export function installWords(core: IslandCore): void {
  let words: HTMLElement[] = [];
  let glow: HTMLElement | null = null;
  let leaveT = 0;
  let lastPointer = 'mouse';

  const lit = (key: string | null) => {
    for (const w of words) w.classList.toggle('is-lit', w.dataset.word === key);
    const el = key ? words.find((w) => w.dataset.word === key) : undefined;
    if (el && !core.reduced) {
      const b = el.getBoundingClientRect();
      core.lean.t = clamp((b.left + b.width / 2 - innerWidth / 2) * 0.035, -14, 14);
    } else {
      core.lean.t = 0;
    }
  };
  const set = (key: string) => {
    clearTimeout(leaveT);
    core.interrupt();
    core.state.word = key;
    lit(key);
    core.resolve();
  };
  const clear = () => {
    core.state.word = null;
    lit(null);
    core.resolve();
  };
  const clearSoon = () => {
    clearTimeout(leaveT);
    leaveT = window.setTimeout(clear, LEAVE_DELAY);
  };

  core.on('lit', (key) => lit(typeof key === 'string' ? key : null));

  core.on('view', (view) => {
    if (!glow) return;
    const rgb = core.dom.views.get(String(view))?.dataset.glow;
    const alpha = getComputedStyle(document.documentElement).getPropertyValue('--glow-alpha').trim() || '0.13';
    glow.style.setProperty('--glow', rgb ? `rgba(${rgb}, ${alpha})` : 'rgba(0, 0, 0, 0)');
  });

  document.addEventListener('pointerdown', (e) => {
    lastPointer = e.pointerType || 'mouse';
    if (lastPointer !== 'mouse' && core.state.word && !(e.target as Element).closest('[data-word]')) clear();
  }, true);

  core.onPage(() => {
    clearTimeout(leaveT);
    words = [...document.querySelectorAll<HTMLElement>('main [data-word]')];
    glow = document.querySelector<HTMLElement>('main [data-hero-glow]');
    for (const w of words) {
      const key = w.dataset.word ?? '';
      let wasActive = false;
      w.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') set(key); });
      w.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') clearSoon(); });
      w.addEventListener('focus', () => set(key));
      w.addEventListener('blur', clearSoon);
      w.addEventListener('pointerdown', () => { wasActive = core.state.word === key; });
      w.addEventListener('click', (e) => {
        if (lastPointer === 'mouse') return;
        if (wasActive) {
          if (w instanceof HTMLAnchorElement) return;
          clear();
          w.blur();
          return;
        }
        e.preventDefault();
        set(key);
      });
    }
  });
}
