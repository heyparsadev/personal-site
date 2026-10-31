// Apsis: a shaded planet on Mars Coordinated Time, with its 24-hour ring and the time floating above it. It
// follows the pointer late, as if it had mass, the way the app's planet lags when the phone tilts.
import { LINE, STYLE, label, type Scene } from '../engine';
import { marsHours, marsTime, norm3, vnoise } from '../math';

interface State {
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  last: number;
}

const SUN = norm3(-0.6, -0.45, 0.66);
/** Mars turns once in 88,642 seconds. */
const SIDEREAL_S = 88642;

export function planet(): Scene<State> {
  return {
    fps: 30,
    init: () => ({ ox: 0, oy: 0, vx: 0, vy: 0, tx: 0, ty: 0, last: 0 }),
    pointer(s, x, y, size) {
      s.tx = x == null ? 0 : (x - size.w / 2) * 0.06;
      s.ty = y == null ? 0 : (y - size.h / 2) * 0.06;
    },
    range: () => `mars time ${marsTime(Date.now())}`,
    draw(g, s) {
      const dt = s.last ? Math.min(0.08, (g.now - s.last) / 1000) : 0.016;
      s.last = g.now;
      s.vx += (12 * (s.tx - s.ox) - 4.2 * s.vx) * dt;
      s.vy += (12 * (s.ty - s.oy) - 4.2 * s.vy) * dt;
      s.ox += s.vx * dt;
      s.oy += s.vy * dt;
      const W = g.cols * g.cw, H = g.rows * LINE;
      const R = Math.min(W * 0.27, H * 0.33);
      const cx = W / 2 + s.ox, cy = H * 0.58 + s.oy;
      const turn = (Date.now() / 1000) * ((2 * Math.PI) / SIDEREAL_S) + (g.still ? 0 : g.t * 0.05);
      for (let r = Math.floor((cy - R) / LINE) - 1; r <= Math.ceil((cy + R) / LINE); r++) {
        for (let c = Math.floor((cx - R) / g.cw) - 1; c <= Math.ceil((cx + R) / g.cw); c++) {
          const x = (c + 0.5) * g.cw - cx, y = (r + 0.5) * LINE - cy;
          const d2 = (x * x + y * y) / (R * R);
          if (d2 > 1) continue;
          const nx = x / R, ny = y / R, nz = Math.sqrt(1 - d2);
          const lon = Math.atan2(nx, nz) + turn, lat = Math.asin(-ny);
          const ground = 0.6 * vnoise(lon * 2.2 + 20, lat * 2.8 + 3) + 0.4 * vnoise(lon * 5.5, lat * 6 + 9);
          const light = nx * SUN[0] + ny * SUN[1] + nz * SUN[2];
          g.ink(c, r, light > 0.04 ? 0.14 + 0.86 * light * (0.5 + 0.5 * ground) : 0.1);
        }
      }
      const ring = R * 1.3;
      const at = (hours: number): [number, number] => {
        const a = (hours / 24) * Math.PI * 2 - Math.PI / 2;
        return [(cx + Math.cos(a) * ring) / g.cw - 0.5, (cy + Math.sin(a) * ring) / LINE - 0.5];
      };
      for (let h = 0; h < 24; h++) g.put(STYLE.grid, '·', ...at(h), 2);
      g.bright('+', ...at(marsHours(Date.now())));
      const time = marsTime(Date.now());
      label(g, time, cx / g.cw - time.length / 2, at(0)[1] - 2, STYLE.bright);
    },
  };
}
