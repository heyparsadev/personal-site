// Persian LLM Eval: the leaderboard's runs by rank. Each bar is Monoglyph terrain up to its combined score, then
// fog where its 95% interval runs, so runs inside each other's fog read as the tie they are.
import { STYLE, label, type Readout, type Scene } from '../engine';
import { RAMP, clamp, phi } from '../math';

export interface LeaderboardParams {
  low: number;
  high: number;
  /** The 95% interval of one split, ± this much. */
  interval: number;
  /** [run, public_eval, hard, combined], by rank. */
  runs: [string, number, number, number][];
}

interface State {
  hi: number;
}

/** Columns kept on the right for the score labels. */
const LABELS = 7;

export function leaderboard({ low, high, interval, runs }: LeaderboardParams): Scene<State> {
  // The combined score is the mean of two splits, so its spread is a split's divided by √2.
  const sigma = interval / 1.96 / Math.SQRT2;
  const per = (cols: number) => (cols - LABELS) / runs.length;
  return {
    stillT: 3,
    init: () => ({ hi: -1 }),
    draw(g, s) {
      const area = g.cols - LABELS, base = g.rows - 2, H = base;
      const w = per(g.cols);
      const rowOf = (v: number) => Math.round(H - 1 - (((v - low) / (high - low)) * H - 0.5));
      s.hi = g.hover && g.hover.c < area ? Math.floor(g.hover.c / w) : -1;
      for (let v = Math.ceil(low * 20 + 1e-9) / 20; v < high - 0.01; v += 0.05) {
        if (v <= low) continue;
        for (let c = 0; c < area; c += 2) g.put(STYLE.grid, '·', c, rowOf(v), 0.5);
        label(g, v.toFixed(2), area + 1, rowOf(v));
      }
      runs.forEach(([, , , score], i) => {
        const c0 = Math.round(i * w), c1 = Math.max(c0 + 1, Math.round((i + 1) * w) - 1);
        const lit = i === s.hi;
        for (let c = c0; c < c1; c++) {
          for (let k = 0; k < H; k++) {
            const v = low + ((k + 0.5) / H) * (high - low);
            let ink: number;
            if (v <= score) ink = 0.42 + 0.58 * Math.exp(-(((score - v) / (high - low)) * H) / 2.2);
            else {
              // Fog: ink follows the chance the true score is at least this cell's value.
              const share = 1 - phi((v - score) / sigma);
              if (share < 0.03) continue;
              ink = 0.1 + 0.9 * share;
            }
            if (lit) g.bright(RAMP[clamp(Math.round(ink * 9), 1, 9)], c, H - 1 - k, 30);
            else g.ink(c, H - 1 - k, ink, 10);
          }
        }
        if (lit) for (let r = 0; r < rowOf(score + 0.035); r++) g.put(STYLE.scan, '|', Math.round((c0 + c1 - 1) / 2), r, 0.5);
      });
      for (let c = 0; c < area; c++) g.put(STYLE.grid, '.', c, base, 1);
      for (const rank of [1, 5, 10, 15].filter((n) => n <= runs.length)) {
        const c = Math.round((rank - 0.5) * w);
        g.put(STYLE.label, '+', c, base, 41);
        label(g, String(rank), c, base + 1);
      }
      label(g, 'rank', area + 1, base + 1);
    },
    readout(g, s): Readout | null {
      if (s.hi < 0 || s.hi >= runs.length) return null;
      const [name, pub, hard, score] = runs[s.hi];
      return {
        c: Math.round((s.hi + 0.5) * per(g.cols)),
        r: 1,
        html: `<b>${score.toFixed(4)}</b><span>${name}</span><span>rank ${s.hi + 1} of ${runs.length}</span><span>public_eval ${pub.toFixed(3)}, hard ${hard.toFixed(3)}</span>`,
      };
    },
  };
}
