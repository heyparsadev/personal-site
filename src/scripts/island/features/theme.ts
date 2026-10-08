import type { IslandCore } from '../core';
import { applyTheme, currentTheme, flipTheme, saveTheme, type Theme } from '../../theme';
import { revealFrom, type RevealTiming } from '../../theme-reveal';

/**
 * The theme buttons (one in each menu) are a "Dark appearance" toggle. Their icon follows html[data-theme]
 * in CSS; this keeps aria-pressed in step and spreads the new appearance from the clicked button.
 */
export function installThemeToggle(core: IslandCore): void {
  const buttons = core.dom.root.querySelectorAll<HTMLElement>('[data-action="theme"]');
  const wave = core.dom.slot('wave');
  // Tracked here, not read back from <html>: an animated switch applies a frame later, after the
  // view transition has captured the old page, and a second click must still flip the first one.
  let theme: Theme = currentTheme();
  const press = () => {
    for (const b of buttons) b.setAttribute('aria-pressed', String(theme === 'dark'));
  };
  press();
  let latest: Promise<void> | null = null;

  // The ring that draws the circle's edge across the island (see .isl-wave): same centre, same growth.
  const ripple = (x: number, y: number) => ({ radius, duration, easing }: RevealTiming) => {
    const nav = core.dom.isl.getBoundingClientRect();
    const cx = x - nav.left;
    const cy = y - nav.top;
    wave.setAttribute('cx', String(cx));
    wave.setAttribute('cy', String(cy));
    wave.style.transformOrigin = `${cx}px ${cy}px`;
    wave.animate(
      [
        { transform: 'scale(0)', opacity: 0.9 },
        { opacity: 0.5, offset: 0.35 },
        { transform: `scale(${radius})`, opacity: 0 },
      ],
      { duration, easing },
    );
  };

  core.on('action', (action) => {
    if (action !== 'theme') return;
    theme = flipTheme(theme);
    const next = theme;
    // The clicked button is the one in the menu on show; the circle starts at its centre.
    const button = core.dom.views.get(core.dom.current ?? '')?.querySelector('[data-action="theme"]') ?? core.dom.isl;
    const box = button.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    // No circle during a navigation (it would cut that page transition short) or with reduced motion.
    const animate = !core.navLock && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    core.switching = animate;
    // The browser takes :hover off the button while the switch runs (see core.switching): hold its highlight.
    if (animate) for (const b of buttons) b.classList.toggle('is-held', b.matches(':hover'));
    const end = revealFrom(x, y, () => applyTheme(next), animate, ripple(x, y));
    latest = end;
    void end.then(() => {
      if (end !== latest) return; // a newer switch is still running
      core.switching = false;
      core.emit('switched');
      // Two frames on, the browser has hit-tested the pointer again and :hover takes back over.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        for (const b of buttons) b.classList.remove('is-held');
      }));
    });
    saveTheme(next);
    press();
    core.emit('theme', next);
  });
}
