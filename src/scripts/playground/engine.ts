// The draw context behind every Playground stage, after Monoglyph's stage.js. A scene puts glyphs into a
// per-frame cell buffer (the higher priority keeps a cell); the Stage then paints the buffer on its canvas.
import { RAMP, hash, inkAlpha, inkLevel, lerp } from './math';

/** Glyphs are 12px on 15px rows; a column is as wide as "0". */
export const GLYPH_PX = 12;
export const LINE = 15;

const white = (a: number) => `rgba(255, 255, 255, ${a.toFixed(3)})`;
/** Fill styles: the ramp's ten alphas, then the fixed ones from Monoglyph's stage tokens. */
export const STYLE = {
  ink: [...RAMP].map((_, level) => white(inkAlpha(level))),
  bright: white(1),
  label: white(0.45),
  grid: white(0.16),
  scan: white(0.35),
  loss: white(0.24),
};

export interface Grid {
  cols: number;
  rows: number;
  /** One column's width in px: measureText('0'). */
  cw: number;
}

export interface Cell {
  style: string;
  ch: string;
  c: number;
  r: number;
  pri: number;
}

export interface Draw extends Grid {
  /** Seconds since the scene started (its still time under reduced motion). */
  t: number;
  /** performance.now() of this frame; the shimmer re-rolls from it. */
  now: number;
  still: boolean;
  /** The cell under the pointer, in plot cells, or null. */
  hover: { c: number; r: number } | null;
  put(style: string, ch: string, c: number, r: number, pri?: number): void;
  /** A ramp glyph for ink v; v ≤ 0.03 draws nothing. Priority defaults to the level. */
  ink(c: number, r: number, v: number, pri?: number): void;
  /** A given glyph at the alpha ink v would draw. */
  glyph(ch: string, c: number, r: number, v: number, pri?: number): void;
  text(s: string, c: number, r: number, style?: string, pri?: number): void;
  bright(ch: string, c: number, r: number, pri?: number): void;
}

export interface Readout {
  c: number;
  r: number;
  html: string;
}

export interface Status {
  label?: string;
  value?: string;
}

/** One project's drawing. Scenes keep their own state; the Stage calls them once per frame. */
export interface Scene<S = any> {
  /** Frames a second while idle; Monoglyph's is about 11. */
  fps?: number;
  /** Seconds into the scene the still frame shows under reduced motion. */
  stillT?: number;
  init(grid: Grid): S;
  draw(g: Draw, s: S): void;
  readout?(g: Draw, s: S): Readout | null;
  /** A live stat (the Sisyphus countdown); read every 250ms. */
  status?(s: S): Status;
  /** A live caption for the bottom HUD's right side. */
  range?(s: S): string;
  pointer?(s: S, x: number | null, y: number | null, size: { w: number; h: number }): void;
}

export function createDraw(
  grid: Grid,
  frame: { t: number; now: number; still: boolean; hover: Draw['hover'] },
): { g: Draw; cells: Map<number, Cell> } {
  const cells = new Map<number, Cell>();
  const slot = frame.now / 1000;
  const put = (style: string, ch: string, c: number, r: number, pri = 1) => {
    c = Math.round(c);
    r = Math.round(r);
    if (c < 0 || c >= grid.cols || r < 0 || r >= grid.rows || !ch || ch === ' ') return;
    const key = r * grid.cols + c;
    const prev = cells.get(key);
    if (prev && prev.pri > pri) return;
    cells.set(key, { style, ch, c, r, pri });
  };
  // Ink moves by ±0.05, and each cell re-rolls about every 1.25s, at its own offset.
  const jitter = (c: number, r: number) =>
    frame.still ? 0 : (hash(c, r, Math.floor(slot * 0.8 + hash(c, r, 9) * 8)) - 0.5) * 0.1;
  const g: Draw = {
    ...grid,
    ...frame,
    put,
    ink(c, r, v, pri) {
      if (!(v > 0.03)) return;
      const l = inkLevel(v + jitter(Math.round(c), Math.round(r)));
      put(STYLE.ink[l], RAMP[l], c, r, pri ?? l);
    },
    glyph(ch, c, r, v, pri) {
      if (!(v > 0.03)) return;
      const l = inkLevel(v + jitter(Math.round(c), Math.round(r)));
      put(STYLE.ink[l], ch, c, r, pri ?? l);
    },
    text(s, c, r, style = STYLE.label, pri = 40) {
      for (let i = 0; i < s.length; i++) put(style, s[i], c + i, r, pri);
    },
    bright(ch, c, r, pri = 60) {
      put(STYLE.bright, ch, c, r, pri);
    },
  };
  return { g, cells };
}

/** A line of glyphs between two cells; / \ | - follow its angle on screen, where cells are about twice as tall as wide. */
export function stroke(g: Draw, c0: number, r0: number, c1: number, r1: number, v: number, pri?: number, glyph?: string): void {
  const dx = (c1 - c0) * g.cw, dy = (r1 - r0) * LINE;
  const angle = (Math.atan2(Math.abs(dy), Math.abs(dx)) * 180) / Math.PI;
  const ch = glyph || (angle > 64 ? '|' : angle < 22 ? '-' : dx * dy > 0 ? '\\' : '/');
  const steps = Math.ceil(Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0)) * 2) + 1;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    g.glyph(ch, Math.round(lerp(c0, c1, t)), Math.round(lerp(r0, r1, t)), v, pri);
  }
}
