// The Descent: the tree of life converging downwards, from today's tips to one root. Your line is lit, and a dot
// travels it back while lines merge into it, one by one.
import { LINE, label, stroke, type Scene } from '../engine';
import { lerp } from '../math';

export interface TreeParams {
  /** How far back the root is, in billions of years. */
  years: number;
}

interface State {
  L: number;
  /** Node columns per level: levels[L] are the tips, levels[0] the root. */
  levels: number[][];
  rows: number[];
  /** Your lineage: its node index at each level. */
  path: number[];
  ago: string;
}

const TRIP = 10;
const HOLD = 2;

export function tree({ years }: TreeParams): Scene<State> {
  return {
    init(grid) {
      const L = grid.cols >= 72 ? 6 : 5;
      const tips = 2 ** L, margin = 2, span = grid.cols - margin * 2 - 1;
      const levels: number[][] = [];
      levels[L] = Array.from({ length: tips }, (_, i) => margin + ((i + 0.5) * span) / tips);
      for (let k = L - 1; k >= 0; k--) levels[k] = Array.from({ length: 2 ** k }, (_, i) => (levels[k + 1][2 * i] + levels[k + 1][2 * i + 1]) / 2);
      // Rows go where the branches travel furthest: merges near the root get room to bend, the tips stay close.
      const top = 1, bottom = grid.rows - 3;
      const reach = Array.from({ length: L + 1 }, (_, k) => (k ? ((span / 2 ** (k + 1)) * grid.cw) / LINE : 0) ** 0.75);
      const total = reach.reduce((a, b) => a + b, 0);
      const rows: number[] = [];
      rows[L] = top;
      for (let k = L; k >= 1; k--) rows[k - 1] = rows[k] + ((bottom - top) * reach[k]) / total;
      const path: number[] = [];
      for (let k = L, i = Math.floor(tips * 0.62); k >= 0; k--, i >>= 1) path[k] = i;
      return { L, levels, rows, path, ago: '' };
    },
    range: (s) => s.ago || 'now',
    draw(g, s) {
      const { L, levels, rows, path } = s;
      const prog = g.still ? 0.55 : Math.min(1, (g.t % (TRIP + HOLD)) / TRIP);
      const dotRow = lerp(rows[L], rows[0], prog);
      for (let k = L; k >= 1; k--) {
        const r0 = rows[k], r1 = rows[k - 1];
        levels[k].forEach((x, i) => {
          const parent = i >> 1;
          let v = 0.32, pri = 2;
          if (path[k] === i) {
            // Your line: full ink where the dot has already been.
            v = r1 <= dotRow ? 1 : 0.62;
            pri = 8;
          } else if (path[k - 1] === parent && dotRow >= r1) {
            // A line that has just merged into yours glows, then settles.
            v = 0.4 + 0.6 * Math.exp(-(dotRow - r1) / 2.5);
            pri = 5;
          }
          stroke(g, x, r0, levels[k - 1][parent], r1, v, pri);
        });
      }
      let k = L;
      while (k > 0 && dotRow > rows[k - 1]) k--;
      const dotCol = k === 0 ? levels[0][0] : lerp(levels[k][path[k]], levels[k - 1][path[k - 1]], (dotRow - rows[k]) / (rows[k - 1] - rows[k]));
      g.bright('@', dotCol, dotRow, 90);
      levels[L].forEach((x, i) => g.glyph('.', x, rows[L] - 1, i === path[L] ? 1 : 0.5, 3));
      label(g, 'now', 0, 0);
      const back = `${years} billion years ago`;
      label(g, back, levels[0][0] - back.length / 2, g.rows - 1);
      s.ago = prog === 0 ? 'now' : `${(prog * years).toFixed(2)}b years ago`;
    },
  };
}
