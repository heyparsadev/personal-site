// Claude Code plugins: each drawn as its own count. Venture's inputs flow into one workspace, Idea Validator's
// stages light in turn before the wall it won't cross, and Liquid Glass's screens catch a moving highlight.
// On a phone's small stage the screens become single tiles and the captions shorten, so nothing collides.
import { STYLE, label, stroke, type Draw, type Scene } from '../engine';
import { clamp, lerp } from '../math';

export interface PluginsParams {
  /** Venture's inputs, feeding one workspace. */
  venture: number;
  /** Idea Validator's stages. */
  validator: number;
  /** Liquid Glass's working screens. */
  glass: number;
}

/** Screens per row, and the height of a framed screen. */
const PER_ROW = 3;
const FRAME_H = 3;

export function plugins({ venture, validator, glass }: PluginsParams): Scene<null> {
  return {
    init: () => null,
    draw(g) {
      const third = g.cols / 3, base = g.rows - 3;
      const glassRows = Math.ceil(glass / PER_ROW);
      // Framed screens need three rows each plus gaps, above the two caption rows; otherwise draw tiles.
      const compact = third < 19 || base + 1 < glassRows * FRAME_H + (glassRows - 1);
      const caption = (x: number, name: string, count: string) => {
        label(g, name, x - name.length / 2, base + 1, STYLE.bright, 45);
        label(g, count, x - count.length / 2, base + 2);
      };
      drawVenture(g, third * 0.5, Math.round(base * 0.62), third);
      caption(third * 0.5, 'venture', `${venture} into 1`);
      drawValidator(g, third * 1.5, base, compact);
      caption(third * 1.5, compact ? 'validator' : 'idea validator', compact ? `${validator} stages` : `${validator} stages, 1 wall`);
      if (compact) drawTiles(g, third * 2.5, base);
      else drawFrames(g, third * 2.5, base);
      caption(third * 2.5, compact ? 'glass' : 'liquid glass', `${glass} screens`);
    },
  };

  function drawVenture(g: Draw, cx: number, ws: number, third: number) {
    for (let i = 0; i < venture; i++) {
      const x0 = third * 0.1 + (i * third * 0.8) / Math.max(1, venture - 1);
      const x1 = cx + (i - (venture - 1) / 2) * 1.6;
      stroke(g, x0, 0, x1, ws - 1, 0.42, 4, ':');
      if (!g.still) {
        const u = (g.t * 0.5 + i * 0.23) % 1;
        g.bright('*', lerp(x0, x1, u), lerp(0, ws - 1, u));
      }
    }
    for (let r = ws; r < Math.min(g.rows - 3, ws + 3); r++) {
      for (let c = Math.round(cx - 4); c <= Math.round(cx + 4); c++) g.glyph('▓', c, r, 0.72, 6);
    }
  }

  function drawValidator(g: Draw, cx: number, base: number, compact: boolean) {
    const gap = compact ? 2 : 3, wall = compact ? 2 : 3, perRow = 5;
    const rows = Math.ceil(validator / perRow);
    // Rows of stages sit closer on a short stage, so the wall ends above the captions.
    const rowGap = base >= 3 * rows + 1 ? 3 : 2;
    const r0 = clamp(Math.round(base * 0.32), 1, Math.max(1, base - (rows - 1) * rowGap - 1));
    const width = (perRow - 1) * gap + 1 + gap + wall;
    const x0 = Math.round(cx - width / 2);
    const lit = g.still ? validator : Math.floor(g.t / 0.4) % (validator + 4);
    for (let i = 0; i < validator; i++) {
      const c = x0 + (i % perRow) * gap, r = r0 + Math.floor(i / perRow) * rowGap;
      if (i < lit) g.bright('■', c, r);
      else g.glyph('■', c, r, 0.3);
    }
    const wx = x0 + (perRow - 1) * gap + 1 + gap;
    for (let r = r0 - 1; r <= Math.min(base, r0 + (rows - 1) * rowGap + 1); r++) {
      for (let c = wx; c < wx + wall; c++) g.put(STYLE.loss, '/', c, r, 2);
    }
  }

  /** The sweep of light across the glass: 0 to 1 along the diagonal, then off the edge for a beat. */
  function sweepAt(g: Draw): number {
    return g.still ? 0.4 : ((g.t * 0.22) % 1.6) - 0.3;
  }

  function drawFrames(g: Draw, cx: number, base: number) {
    const fw = 5, fh = g.rows >= 19 ? 4 : FRAME_H;
    const rows = Math.ceil(glass / PER_ROW);
    const w = fw * PER_ROW + (PER_ROW - 1), h = fh * rows + (rows - 1);
    const gx = Math.round(cx - w / 2), gy = Math.max(0, Math.round((base - h) / 2));
    const sweep = sweepAt(g);
    for (let n = 0; n < glass; n++) {
      const fx = gx + (n % PER_ROW) * (fw + 1), fy = gy + Math.floor(n / PER_ROW) * (fh + 1);
      g.put(STYLE.label, '╭', fx, fy, 5);
      g.put(STYLE.label, '╮', fx + fw - 1, fy, 5);
      g.put(STYLE.label, '╰', fx, fy + fh - 1, 5);
      g.put(STYLE.label, '╯', fx + fw - 1, fy + fh - 1, 5);
      for (let c = fx + 1; c < fx + fw - 1; c++) {
        g.put(STYLE.label, '─', c, fy, 5);
        g.put(STYLE.label, '─', c, fy + fh - 1, 5);
      }
      for (let r = fy + 1; r < fy + fh - 1; r++) {
        g.put(STYLE.label, '│', fx, r, 5);
        g.put(STYLE.label, '│', fx + fw - 1, r, 5);
        for (let c = fx + 1; c < fx + fw - 1; c++) {
          const u = ((c - gx) / w + (r - gy) / h) / 2;
          g.ink(c, r, 0.18 + 0.8 * Math.exp(-(((u - sweep) / 0.09) ** 2)), 6);
        }
      }
    }
  }

  /** Compact: one block per screen, two columns and two rows apart, lit by the same sweep. */
  function drawTiles(g: Draw, cx: number, base: number) {
    const rows = Math.ceil(glass / PER_ROW);
    const w = (PER_ROW - 1) * 2 + 1, h = (rows - 1) * 2 + 1;
    const gx = Math.round(cx - w / 2), gy = Math.max(0, Math.round((base - h) / 2));
    const sweep = sweepAt(g);
    for (let n = 0; n < glass; n++) {
      const i = n % PER_ROW, j = Math.floor(n / PER_ROW);
      const u = (i / Math.max(1, PER_ROW - 1) + j / Math.max(1, rows - 1)) / 2;
      g.glyph('█', gx + i * 2, gy + j * 2, 0.3 + 0.7 * Math.exp(-(((u - sweep) / 0.18) ** 2)), 6);
    }
  }
}
