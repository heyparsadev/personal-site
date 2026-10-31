// Claude Code plugins: each drawn as its own count. Venture's inputs flow into one workspace, Idea Validator's
// stages light in turn before the wall it won't cross, and Liquid Glass's screens catch a moving highlight.
import { STYLE, label, stroke, type Draw, type Scene } from '../engine';
import { lerp } from '../math';

export interface PluginsParams {
  /** Venture's inputs, feeding one workspace. */
  venture: number;
  /** Idea Validator's stages. */
  validator: number;
  /** Liquid Glass's working screens. */
  glass: number;
}

export function plugins({ venture, validator, glass }: PluginsParams): Scene<null> {
  return {
    init: () => null,
    draw(g) {
      const third = g.cols / 3, base = g.rows - 3;
      const narrow = third < 20;
      const caption = (x: number, name: string, count: string) => {
        label(g, name, x - name.length / 2, base + 1, STYLE.bright, 45);
        label(g, count, x - count.length / 2, base + 2);
      };
      drawVenture(g, third * 0.5, Math.round(base * 0.62), third);
      caption(third * 0.5, 'venture', `${venture} into 1`);
      drawValidator(g, third * 1.5, Math.round(base * 0.32), narrow);
      caption(third * 1.5, narrow ? 'validator' : 'idea validator', `${validator} stages, 1 wall`);
      drawGlass(g, third * 2.5, base, narrow);
      caption(third * 2.5, narrow ? 'glass' : 'liquid glass', `${glass} screens`);
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

  function drawValidator(g: Draw, cx: number, r0: number, narrow: boolean) {
    const gap = narrow ? 2 : 3, wall = narrow ? 2 : 3;
    const perRow = 5, rows = Math.ceil(validator / perRow);
    const width = (perRow - 1) * gap + 1 + gap + wall;
    const x0 = Math.round(cx - width / 2);
    const lit = g.still ? validator : Math.floor(g.t / 0.4) % (validator + 4);
    for (let i = 0; i < validator; i++) {
      const c = x0 + (i % perRow) * gap, r = r0 + Math.floor(i / perRow) * 3;
      if (i < lit) g.bright('■', c, r);
      else g.glyph('■', c, r, 0.3);
    }
    const wx = x0 + (perRow - 1) * gap + 1 + gap;
    for (let r = r0 - 1; r <= r0 + (rows - 1) * 3 + 1; r++) for (let c = wx; c < wx + wall; c++) g.put(STYLE.loss, '/', c, r, 2);
  }

  function drawGlass(g: Draw, cx: number, base: number, narrow: boolean) {
    const fw = narrow ? 3 : 5, fh = g.rows >= 19 ? 4 : 3;
    const perRow = 3, rows = Math.ceil(glass / perRow);
    const w = fw * perRow + (perRow - 1), h = fh * rows + (rows - 1);
    const gx = Math.round(cx - w / 2), gy = Math.max(0, Math.round((base - h) / 2));
    const sweep = g.still ? 0.4 : ((g.t * 0.22) % 1.6) - 0.3;
    for (let n = 0; n < glass; n++) {
      const fx = gx + (n % perRow) * (fw + 1), fy = gy + Math.floor(n / perRow) * (fh + 1);
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
}
