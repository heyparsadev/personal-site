// Sisyphus: a push up a mountain with no summit, the roll back down when time is up, then the walk down after
// it. The stat beside the stage counts the push down live.
import { LINE, type Scene, type Status } from '../engine';
import { clock, lerp, norm3 } from '../math';

export interface PushParams {
  /** Seconds of each phase. */
  push: number;
  roll: number;
  rest: number;
}

interface State {
  phase: 'push' | 'roll' | 'rest';
  left: number;
  /** How far along the slope the push gets: as high as the boulder and Sisyphus still fit on the stage. */
  top: number;
}

const SUN = norm3(-0.55, -0.6, 0.58);
const START = 0.1;

/** The slope's surface row at a column: it climbs off the top right, a mountain with no summit. */
const slopeOf = (cols: number, rows: number) => (c: number) =>
  rows - 1 - (c / (cols - 1)) * (rows - 1) * 1.3 + 0.5 * Math.sin(c * 0.31) + 0.35 * Math.sin(c * 0.13 + 1.3);
const radiusOf = (cols: number, cw: number) => Math.min(LINE * 2.3, cols * cw * 0.065);

export function push({ push, roll, rest }: PushParams): Scene<State> {
  const cycle = push + roll + rest;
  return {
    init({ cols, rows, cw }) {
      const slope = slopeOf(cols, rows), R = radiusOf(cols, cw);
      // The boulder's top sits 1.95 radii above the surface, and Sisyphus's head three rows above his feet.
      const need = Math.max((1.95 * R) / LINE, 3.2);
      let top = 0.68;
      while (top > START + 0.05 && slope(top * (cols - 1)) < need) top -= 0.005;
      return { phase: 'push', left: push, top };
    },
    status(s): Status {
      if (s.phase === 'push') return { label: 'Time left on this push', value: clock(s.left) };
      if (s.phase === 'roll') return { label: 'Time is up', value: '0:00' };
      return { label: 'Your break: the walk down', value: clock(s.left) };
    },
    draw(g, s) {
      const t = g.still ? push * 0.43 : g.t % cycle;
      const base = g.rows - 1;
      const slope = slopeOf(g.cols, g.rows);
      let p: number;
      if (t < push) {
        s.phase = 'push';
        p = START + (s.top - START) * (t / push);
        s.left = push - t;
      } else if (t < push + roll) {
        s.phase = 'roll';
        const u = (t - push) / roll;
        p = s.top - (s.top - START) * u * u;
        s.left = 0;
      } else {
        s.phase = 'rest';
        p = START;
        s.left = cycle - t;
      }
      const R = radiusOf(g.cols, g.cw);
      const bc = p * (g.cols - 1);
      const cx = (bc + 0.5) * g.cw, cy = slope(bc) * LINE - R * 0.95;
      // The mountain, with a one-cell gap around the boulder so it reads as its own thing.
      for (let c = 0; c < g.cols; c++) {
        const top = slope(c);
        for (let r = Math.max(0, Math.floor(top)); r <= base; r++) {
          const cover = Math.min(1, r + 1 - top);
          if (cover <= 0) continue;
          if (Math.hypot((c + 0.5) * g.cw - cx, (r + 0.5) * LINE - cy) < R + g.cw * 1.2) continue;
          g.ink(c, r, cover < 1 ? 0.15 + 0.85 * cover : 0.42 + 0.58 * Math.exp(-(r - top) / 2.2), 3);
        }
      }
      // The boulder turns as it travels.
      const spin = -(p * g.cols * g.cw) / R;
      for (let r = Math.floor((cy - R) / LINE) - 1; r <= Math.ceil((cy + R) / LINE); r++) {
        for (let c = Math.floor((cx - R) / g.cw) - 1; c <= Math.ceil((cx + R) / g.cw); c++) {
          const x = (c + 0.5) * g.cw - cx, y = (r + 0.5) * LINE - cy;
          const d2 = (x * x + y * y) / (R * R);
          if (d2 > 1) continue;
          const nx = x / R, ny = y / R, nz = Math.sqrt(1 - d2);
          const light = Math.max(0, nx * SUN[0] + ny * SUN[1] + nz * SUN[2]);
          const band = 0.5 + 0.5 * Math.sin((nx * Math.cos(spin) + ny * Math.sin(spin)) * 6);
          g.ink(c, r, 0.4 + 0.6 * light * (0.78 + 0.22 * band), 20);
        }
      }
      // Sisyphus: leaning into the boulder while he pushes, walking down after it on his break.
      const edge = Math.round((cx - R) / g.cw);
      if (s.phase === 'push') {
        const fc = edge - 2, fr = Math.floor(slope(fc));
        g.bright('o', fc + 1, fr - 3);
        g.bright('/', fc, fr - 2);
        g.bright('-', fc + 1, fr - 2);
        g.bright('/', fc - 1, fr - 1);
        g.bright('\\', fc, fr - 1);
      } else if (s.phase === 'rest') {
        const u = 1 - s.left / rest;
        const fc = Math.round(lerp(s.top * (g.cols - 1) - 3, edge - 3, u)), fr = Math.floor(slope(fc));
        const stride = Math.floor(g.t * 2.5) % 2;
        g.bright('o', fc, fr - 3);
        g.bright('|', fc, fr - 2);
        g.bright(stride ? '/' : '|', fc - 1 + stride, fr - 1);
        g.bright('\\', fc + 1 - stride, fr - 1);
      }
    },
  };
}
