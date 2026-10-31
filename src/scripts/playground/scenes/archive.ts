// Bargasht: saves pile up day by day, one texture per kind; every few seconds an old one lights up and comes
// back. The saves are simulated, and the stage's caption says so.
import { STYLE, label, type Readout, type Scene } from '../engine';
import { hash, lerp, smooth, vnoise } from '../math';

export interface ArchiveParams {
  kinds: { glyph: string; name: string }[];
}

interface State {
  days: number[][];
  note: Readout | null;
}

const DAY = 1.4;
const CYCLE = 4.2;

export function archive({ kinds }: ArchiveParams): Scene<State> {
  return {
    init(grid) {
      // Busy weeks and quiet ones: each day's pile follows a slow wave, so the archive reads as a skyline.
      const cap = Math.max(3, grid.rows - 5);
      const days = Array.from({ length: 800 }, (_, d) => {
        const n = Math.round(cap * (0.12 + 0.62 * vnoise(d * 0.16, 1.7)) * (0.55 + 0.45 * hash(d, 1, 7)));
        return Array.from({ length: n }, (_, i) => Math.floor(hash(d, i, 11) * kinds.length));
      });
      return { days, note: null };
    },
    draw(g, s) {
      const axis = g.rows - 2;
      const first = g.still ? 0 : Math.floor(g.t / DAY);
      // The archive scrolls a day every 1.4s and wraps, so it never runs out however long the page stays open.
      const day = (c: number) => s.days[(first + c) % s.days.length];
      const fresh = g.still ? 1 : (g.t % DAY) / DAY;
      const cycle = Math.floor(g.t / CYCLE);
      const phase = g.still ? 0.3 : (g.t % CYCLE) / CYCLE;
      // The save that comes back this cycle: at least 16 days old.
      const pc = Math.floor(hash(cycle, 2, 5) * Math.max(1, g.cols - 16));
      const pickDay = day(pc);
      const pick = pickDay.length && phase < 0.78 ? { c: pc, i: Math.floor(hash(cycle, 3, 5) * pickDay.length) } : null;
      for (let c = 0; c < g.cols; c++) {
        const today = c === g.cols - 1;
        day(c).forEach((kind, i) => {
          let r = axis - 1 - i;
          // Today's saves are still falling in.
          if (today) r = Math.round(lerp(-1 - i, r, smooth(0, 0.6, fresh)));
          if (pick && pick.c === c && pick.i === i) g.bright(kinds[kind].glyph, c, r);
          else g.glyph(kinds[kind].glyph, c, r, 0.5);
        });
        g.put(STYLE.grid, '.', c, axis, 1);
      }
      for (let k = 10; k < g.cols - 4; k += 10) {
        g.put(STYLE.label, '+', g.cols - 1 - k, axis, 41);
        label(g, `${k}d`, g.cols - 2 - k, axis + 1);
      }
      label(g, 'today', g.cols - 5, axis + 1);
      if (pick) {
        const top = axis - 1 - pick.i;
        for (let r = 0; r < top; r++) g.put(STYLE.scan, '|', pick.c, r, 0.5);
        const kind = kinds[pickDay[pick.i]].name;
        s.note = { c: pick.c, r: 2, html: `<b>${kind}</b><span>saved ${g.cols - 1 - pick.c} days ago</span><span>back on your phone now</span>` };
      } else s.note = null;
    },
    readout: (_g, s) => s.note,
  };
}
