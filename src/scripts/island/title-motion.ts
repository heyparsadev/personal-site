import { seg } from './scroll';

export const ISLAND_CENTER_Y = 30;
export const TITLE_MIN_SCALE = 0.045;

/** Title centre in page coordinates, measured with no transform applied. */
export interface TitleOrigin {
  cx: number;
  cy: number;
}

export interface TitleFrame {
  tx: number;
  ty: number;
  scale: number;
  opacity: number;
  blur: number;
}

/** e = 0: the title sits in place. e = 1: it is shrunk into the island's centre. Values below 0 overshoot gently. */
export function titleFrame(e: number, origin: TitleOrigin, viewportW: number, scrollY: number, reduced = false): TitleFrame {
  const tx = (viewportW / 2 - origin.cx) * e;
  const ty = (ISLAND_CENTER_Y - (origin.cy - scrollY)) * (e < 0 ? e * 0.5 : e);
  const scale = e >= 0 ? Math.exp(Math.log(TITLE_MIN_SCALE) * e) : 1 - e * 0.5;
  const opacity = 1 - seg(e, 0.66, 0.94);
  const blur = reduced ? 0 : seg(e, 0.3, 1) * 5;
  return { tx, ty, scale, opacity, blur };
}

/** At the very top the intro spring rules (so it may overshoot); once scrolling, whichever is further in wins. */
export function titleProgress(introE: number, absorbE: number): number {
  return absorbE > 0 ? Math.max(introE, absorbE) : introE;
}
