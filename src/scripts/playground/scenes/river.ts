// Delta: six years as a river on a time axis. Each channel is a real project, and its fate is how it ended:
// a meander cut off into an oxbow lake, the main stem, a branch that dries, braids that reach the sea.
import { STYLE, label, LINE, type Draw, type Readout, type Scene } from '../engine';
import { RAMP, clamp, lerp, smooth } from '../math';

export interface Channel {
  name: string;
  from: number;
  to?: number;
  fate: 'oxbow' | 'main' | 'dries' | 'braids';
}

export interface RiverParams {
  /** Where the river meets the sea: today, as a decimal year. */
  sea: number;
  channels: Channel[];
}

interface State {
  note: Readout | null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function river({ sea, channels }: RiverParams): Scene<State> {
  const fate = (f: Channel['fate']) => channels.find((c) => c.fate === f);
  const oxbow = fate('oxbow'), main = fate('main'), dries = fate('dries'), braids = fate('braids');
  const Y0 = Math.min(...channels.map((c) => c.from));
  const Y1 = sea + 0.64;
  // How long a dried branch keeps a dotted bed.
  const DRY_BED = 0.35;

  return {
    init: () => ({ note: null }),
    draw(g, s) {
      const axis = g.rows - 2, H = axis;
      const yearAt = (c: number) => Y0 + (c / (g.cols - 1)) * (Y1 - Y0);
      const colOf = (y: number) => ((y - Y0) / (Y1 - Y0)) * (g.cols - 1);
      const mid = H * 0.52;
      const m0 = main?.from ?? Y0;
      const yS = (t: number) => mid + H * 0.09 * Math.sin((t - m0) * 1.9 + 0.4);
      const span = oxbow ? (oxbow.to ?? m0) - oxbow.from : 1;
      const yI = (t: number) => mid + H * 0.1 * Math.sin(((t - (oxbow?.from ?? Y0)) / span) * Math.PI * 3.2);
      const d0 = dries?.from ?? 0, d1 = dries?.to ?? d0 + 1.6;
      const yH = (t: number) => yS(t) + H * 0.3 * smooth(d0, d0 + 0.95, t) + H * 0.04 * Math.sin((t - d0) * 5);
      const hoverC = g.hover ? g.hover.c : -1;
      const flow = (c: number, r: number) => (g.still ? 1 : 0.82 + 0.18 * Math.sin(c * 0.6 - r * 0.15 - g.t * 2.4));
      const water = (c: number, y: number, w: number, v: number) => {
        for (let r = Math.floor(y - w - 1); r <= Math.ceil(y + w + 1); r++) {
          const d = Math.abs(r + 0.5 - y);
          if (d > w + 0.5) continue;
          const ink = v * (0.35 + 0.65 * (1 - d / (w + 0.5))) * flow(c, r);
          if (c === hoverC) g.bright(RAMP[clamp(Math.round(ink * 9), 1, 9)], c, r, 30);
          else g.ink(c, r, ink);
        }
      };

      for (let c = 0; c < g.cols; c++) {
        const t = yearAt(c);
        let atSea = false;
        for (let r = 0; r < axis; r++) {
          if (t >= sea + 0.05 * Math.sin(r * 0.9)) {
            atSea = true;
            g.ink(c, r, 0.46 + 0.2 * Math.sin(r * 0.8 + c * 0.5 - (g.still ? 0 : g.t * 1.4)));
          }
        }
        if (atSea) continue;
        if (oxbow) {
          // The meander, then the straighter channel left once the loop was cut off, into the main stem.
          const cut = oxbow.from + 0.47 * span, end = oxbow.to ?? m0;
          if (t >= oxbow.from && t < cut) water(c, yI(t), 0.6, 0.9);
          else if (t >= cut && t < end) water(c, lerp(yI(cut), yS(end), smooth(cut, end, t)), 0.7, 0.9);
        }
        if (main && t >= main.from) {
          if (braids && t >= braids.from) {
            for (const side of [-1, 0, 1]) water(c, yS(t) + side * H * 0.13 * smooth(braids.from, braids.from + 0.33, t), side ? 0.5 : 0.8, 0.95);
          } else water(c, yS(t), Math.min(2, 0.8 + (t - main.from) * 0.22), 1);
        }
        if (dries && t >= d0 && t < d1 + DRY_BED) {
          const w = 0.9 * (1 - smooth(d0 + 0.25, d1, t));
          if (w > 0.2) water(c, yH(t), w, 0.85);
          else g.put(STYLE.grid, '.', c, Math.round(yH(t) - 0.5), 2);
        }
        g.put(STYLE.grid, '.', c, axis, 1);
      }

      if (oxbow) {
        // The oxbow lake: still water, so no flow.
        const ox = colOf(oxbow.from + 0.66 * span) * g.cw, oy = (mid - H * 0.28) * LINE;
        const rx = (colOf(oxbow.from + 0.84 * span) - colOf(oxbow.from + 0.48 * span)) * 0.5 * g.cw;
        const ry = Math.max(1.2, H * 0.1) * LINE;
        for (let r = Math.floor((oy - ry) / LINE) - 1; r <= Math.ceil((oy + ry) / LINE); r++) {
          for (let c = Math.floor((ox - rx) / g.cw) - 1; c <= Math.ceil((ox + rx) / g.cw); c++) {
            const e = Math.hypot(((c + 0.5) * g.cw - ox) / rx, ((r + 0.5) * LINE - oy) / ry);
            if (Math.abs(e - 1) < 0.26) g.ink(c, r, 0.6);
          }
        }
        label(g, oxbow.name, ox / g.cw - 4, (oy - ry) / LINE - 1.6);
      }
      const clampRow = (r: number) => Math.min(r, axis - 2);
      if (main) label(g, main.name, colOf(m0 + 1.3), clampRow(yS(m0 + 1.3) - 3.6));
      if (dries) label(g, dries.name, colOf(d0 + 0.5), clampRow(yH(d0 + 0.95) + 2.2));
      if (braids) label(g, braids.name, colOf(sea - 0.02) - braids.name.length, clampRow(yS(braids.from + 0.18) - H * 0.13 - 2.6));

      const every = g.cols / (Y1 - Y0) < 6 ? 2 : 1;
      for (let y = Math.ceil(Y0); y <= Math.floor(sea); y += every) {
        g.put(STYLE.label, '+', colOf(y), axis, 41);
        label(g, String(y), colOf(y), axis + 1);
      }
      s.note = hoverC >= 0 ? note(g, hoverC, yearAt(hoverC)) : null;
    },
    readout: (_g, s) => s.note,
  };

  /** The scanline at the pointer, and the month with the channels running then. */
  function note(g: Draw, c: number, t: number): Readout {
    for (let r = 0; r < g.rows - 2; r++) g.put(STYLE.scan, '|', c, r, 0.5);
    const running: string[] = [];
    if (t >= sea) running.push('the sea');
    else {
      if (oxbow && t >= oxbow.from && t < (oxbow.to ?? Infinity)) running.push(oxbow.name);
      if (main && t >= main.from) running.push(main.name);
      if (dries && t >= dries.from && t < (dries.to ?? Infinity)) running.push(dries.name);
      if (dries?.to && t >= dries.to && t < dries.to + DRY_BED) running.push(`${dries.name}, dry`);
      if (braids && t >= braids.from) running.push(braids.name);
    }
    const month = MONTHS[Math.min(11, Math.floor((t % 1) * 12))];
    return { c, r: 1, html: `<b>${month} ${Math.floor(t)}</b><span>${running.join(', ')}</span>` };
  }
}
