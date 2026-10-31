// The fallback for a project with no drawing of its own: its name, set large and filled with the ramp. Where
// no canvas exists (node, tests), the name is written as plain glyph text instead.
import { LINE, label, type Grid, type Scene } from '../engine';

export interface NameParams {
  title: string;
}

interface State {
  /** Ink per cell, row by row; null when the title couldn't be rasterised. */
  ink: Float32Array | null;
}

/** The title drawn at real scale, sampled at every cell's centre. */
function rasterise(title: string, grid: Grid): Float32Array | null {
  const w = Math.ceil(grid.cols * grid.cw), h = grid.rows * LINE;
  const canvas: OffscreenCanvas | HTMLCanvasElement | null =
    typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h)
      : typeof document !== 'undefined' ? Object.assign(document.createElement('canvas'), { width: w, height: h })
        : null;
  const ctx = canvas?.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null | undefined;
  if (!ctx) return null;
  let size = h * 0.7;
  ctx.font = `700 ${size}px -apple-system, system-ui, sans-serif`;
  size *= Math.min(1, (w * 0.9) / ctx.measureText(title).width);
  ctx.font = `700 ${size}px -apple-system, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.fillText(title, w / 2, h / 2);
  const data = ctx.getImageData(0, 0, w, h).data;
  const ink = new Float32Array(grid.cols * grid.rows);
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const x = Math.min(w - 1, Math.round((c + 0.5) * grid.cw)), y = Math.min(h - 1, Math.round((r + 0.5) * LINE));
      ink[r * grid.cols + c] = data[(y * w + x) * 4 + 3] / 255;
    }
  }
  return ink;
}

export function name({ title }: NameParams): Scene<State> {
  return {
    init: (grid) => ({ ink: rasterise(title, grid) }),
    draw(g, s) {
      if (!s.ink) {
        label(g, title, g.cols / 2 - title.length / 2, g.rows / 2, undefined, 50);
        return;
      }
      for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) g.ink(c, r, s.ink[r * g.cols + c]);
    },
  };
}
