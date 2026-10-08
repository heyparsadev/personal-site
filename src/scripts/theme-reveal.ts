/**
 * The theme switch's reveal: the new appearance spreads in a circle from the theme button. It is a view
 * transition whose new snapshot a growing clip-path uncovers over the old one. html.theme-vt marks it for
 * global.css, which keeps the island live on top and holds back the CSS colour fades, so the circle
 * uncovers the new colours rather than a fade towards them.
 */

/** Radius of a circle centred on (x, y) that covers a w × h viewport: the distance to its farthest corner. */
export function coverRadius(x: number, y: number, w: number, h: number): number {
  return Math.hypot(Math.max(x, w - x), Math.max(y, h - y));
}

const DURATION = 650;
const EASING = 'cubic-bezier(.4, 0, .2, 1)';

/** The circle's final radius and timing, for anything that moves in step with it. */
export interface RevealTiming {
  radius: number;
  duration: number;
  easing: string;
}

let current: ViewTransition | null = null;

/**
 * Runs `update` (the switch itself) behind a circular reveal from (x, y), in viewport coordinates. When
 * `animate` is false, or the browser has no view transitions, it just runs `update`, and the half-second
 * colour fades in the CSS soften the switch instead. `onStart` runs as the circle starts to grow.
 * Resolves when the reveal is over (at once without one).
 */
export function revealFrom(
  x: number,
  y: number,
  update: () => void,
  animate: boolean,
  onStart?: (timing: RevealTiming) => void,
): Promise<void> {
  if (!animate || typeof document.startViewTransition !== 'function') {
    update();
    return Promise.resolve();
  }
  const root = document.documentElement;
  root.classList.add('theme-vt');
  const vt = document.startViewTransition(update);
  current = vt;
  vt.ready.then(
    () => {
      const radius = coverRadius(x, y, innerWidth, innerHeight);
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: DURATION, easing: EASING, pseudoElement: '::view-transition-new(root)' },
      );
      onStart?.({ radius, duration: DURATION, easing: EASING });
    },
    () => {}, // Skipped by a newer switch or a navigation: update has still run.
  );
  const done = () => {
    // A newer switch has taken over the class; it removes it when it ends.
    if (current !== vt) return;
    current = null;
    root.classList.remove('theme-vt');
  };
  return vt.finished.then(done, done);
}
