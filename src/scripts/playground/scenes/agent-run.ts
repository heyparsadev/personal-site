// ApplyBot: one run of the agent as swimlanes, one tool at a time, with a budget that runs down. The lane it
// never uses (submit) stays hatched.
import { STYLE, label, type Scene } from '../engine';
import { RAMP, hash } from '../math';

export interface AgentRunParams {
  lanes: string[];
  never: string;
}

interface State {
  x0: number;
  steps: number;
  /** The lane working at each step, or -1 once the run is done. */
  plan: number[];
}

const STEP = 0.08;
const HOLD = 3;

export function agentRun({ lanes, never }: AgentRunParams): Scene<State> {
  return {
    stillT: 0,
    init(grid) {
      const x0 = Math.max(...lanes.map((l) => l.length)) + 2;
      const steps = Math.max(12, grid.cols - x0);
      // The working lanes in order: the first opens the run, the middle ones alternate, the last closes it.
      const work = lanes.map((name, i) => (name === never ? -1 : i)).filter((i) => i >= 0);
      const [first, last] = [work[0], work[work.length - 1]];
      const middle = work.slice(1, -1);
      const plan: number[] = [];
      const run = (lane: number, share: number) => {
        for (let i = 0, n = Math.max(1, Math.round(share * steps)); i < n; i++) plan.push(lane);
      };
      run(first, 0.14);
      for (let k = 0; k < 5; k++) for (const lane of middle) run(lane, 0.115 / Math.max(1, middle.length));
      if (last !== first) run(last, 0.2);
      while (plan.length < steps) plan.push(-1);
      plan.length = steps;
      return { x0, steps, plan };
    },
    draw(g, s) {
      const head = g.still ? Math.round(s.steps * 0.86) : Math.min(s.steps, Math.floor((g.t % (s.steps * STEP + HOLD)) / STEP));
      // The lanes share the plot above the budget row, each a row shorter than its stride.
      const stride = (g.rows - 2) / lanes.length;
      const laneH = Math.max(1, Math.round(stride) - 1);
      lanes.forEach((name, lane) => {
        const top = Math.round(lane * stride);
        const idle = name === never;
        label(g, name, 0, top + Math.floor((laneH - 1) / 2), idle ? STYLE.loss : STYLE.label);
        for (let x = 0; x < s.steps; x++) {
          for (let r = top; r < top + laneH; r++) {
            if (idle) g.put(STYLE.loss, '/', s.x0 + x, r, 1);
            else if (x < head && s.plan[x] === lane) {
              if (x === head - 1) g.bright(RAMP[9], s.x0 + x, r);
              else g.ink(s.x0 + x, r, 0.38 + 0.45 * hash(x, r, 21));
            }
          }
        }
      });
      const left = Math.round(18 * (1 - (0.7 * head) / s.steps));
      label(g, 'budget', 0, g.rows - 1);
      for (let i = 0; i < 18; i++) g.put(i < left ? STYLE.bright : STYLE.grid, i < left ? '█' : '░', s.x0 + i, g.rows - 1, 45);
    },
  };
}
