import type { IslandCore } from '../core';
import { Spring } from '../spring';
import { absorbProgress, nextAbsorbed, seg } from '../scroll';
import { titleFrame, titleProgress, type TitleOrigin } from '../title-motion';

export interface TitleControl {
  drop(): void;
  readonly dropped: boolean;
}

const LAND_DELAY = 380;

/** Every page's h1 lives in the island: it drops out on arrival and is absorbed back as the page scrolls. */
export function installTitle(core: IslandCore): TitleControl {
  const intro = new Spring(1, 0.75, 0.84);
  if (core.reduced) intro.tune(0.3, 1);
  let el: HTMLElement | null = null;
  let fades: HTMLElement[] = [];
  let origin: TitleOrigin = { cx: 0, cy: 0 };
  let dropped = false;
  let lastKey = '';
  let lastY = -1;

  const measure = () => {
    if (!el) return;
    const keep = el.style.transform;
    el.style.transform = 'none';
    const b = el.getBoundingClientRect();
    el.style.transform = keep;
    origin = { cx: b.left + b.width / 2, cy: b.top + b.height / 2 + scrollY };
    lastKey = '';
    lastY = -1;
  };

  core.onPage(() => {
    el = document.querySelector<HTMLElement>('main [data-island-title]');
    fades = [...document.querySelectorAll<HTMLElement>('main [data-scroll-fade]')];
    dropped = false;
    intro.snap(1);
    measure();
  });
  addEventListener('resize', measure);
  void document.fonts?.ready.then(measure);

  core.onFrame((dt) => {
    intro.step(dt);
    const y = scrollY;
    const H = innerHeight;
    const eS = absorbProgress(y, H);
    const absorbed = nextAbsorbed(core.state.absorbed, eS);
    if (absorbed !== core.state.absorbed) {
      core.state.absorbed = absorbed;
      if (!core.reduced) core.gulp.v += absorbed ? 3.2 : 2;
      if (absorbed) core.interrupt();
      core.resolve();
    }
    if (y !== lastY) {
      lastY = y;
      for (const f of fades) {
        f.style.opacity = (1 - seg(y, 0, H * 0.32)).toFixed(3);
        f.style.transform = `translate3d(0, ${(-y * 0.18).toFixed(2)}px, 0)`;
      }
    }
    if (!el) return;
    const e = titleProgress(intro.x, eS);
    const key = `${e.toFixed(4)}|${Math.round(y)}`;
    if (key === lastKey) return;
    lastKey = key;
    const f = titleFrame(e, origin, innerWidth, y, core.reduced);
    el.style.transform = `translate3d(${f.tx.toFixed(2)}px, ${f.ty.toFixed(2)}px, 0) scale(${f.scale.toFixed(4)})`;
    el.style.opacity = f.opacity.toFixed(3);
    el.style.filter = f.blur > 0.05 ? `blur(${f.blur.toFixed(2)}px)` : 'none';
  });

  return {
    drop() {
      if (dropped) return;
      dropped = true;
      intro.t = 0;
      if (!core.reduced) core.gulp.v += 3;
      const main = document.querySelector('main');
      window.setTimeout(() => main?.classList.add('landed'), core.reduced ? 0 : LAND_DELAY);
    },
    get dropped() {
      return dropped;
    },
  };
}
