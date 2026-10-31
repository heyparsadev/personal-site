import { describe, it, expect } from 'vitest';
import { playgroundEntries } from '../helpers/frontmatter';
import { createDraw, label, type Draw, type Grid } from '../../src/scripts/playground/engine';
import { sceneFor } from '../../src/scripts/playground/scenes';

const entries = playgroundEntries();
const WIDE: Grid = { cols: 72, rows: 20, cw: 7.2 };
const NARROW: Grid = { cols: 40, rows: 12, cw: 7.2 };

/** The scene a content entry asks for, built from its real params. */
function sceneOf(id: string) {
  const { fm } = entries.find((e) => e.id === id)!;
  return sceneFor({ scene: fm.stage.scene, params: fm.stage.params, title: fm.title, year: fm.year });
}

/** Draws one frame of a scene and hands back the cells, its state and the draw context. */
function frame(scene: ReturnType<typeof sceneFor>, grid: Grid, t: number, opts: { still?: boolean; hover?: Draw['hover']; state?: any } = {}) {
  const state = opts.state ?? scene.init(grid);
  const { g, cells } = createDraw(grid, { t, now: t * 1000, still: opts.still ?? false, hover: opts.hover ?? null });
  scene.draw(g, state);
  return { g, cells, state };
}

describe('playground scenes', () => {
  it('every scene draws on a wide and a narrow grid', () => {
    // The fallback has its own test below: in node there is no canvas, so it writes the title as text.
    const scenes = entries.map((e) => [e.id, sceneOf(e.id)] as const);
    for (const [id, scene] of scenes) {
      for (const grid of [WIDE, NARROW]) {
        for (const still of [false, true]) {
          const { cells } = frame(scene, grid, 3, { still });
          expect(cells.size, `${id} ${grid.cols}×${grid.rows} still=${still}`).toBeGreaterThanOrEqual(20);
        }
      }
    }
  });

  it('a frame stamped a moment before the scene started still draws', () => {
    // requestAnimationFrame's timestamp can precede the performance.now() taken when a stage is built.
    for (const { id } of entries) {
      const { cells } = frame(sceneOf(id), WIDE, -0.004);
      expect(cells.size, id).toBeGreaterThan(0);
    }
  });

  it('the registry falls back to drawing the title', () => {
    const { cells } = frame(sceneFor({ scene: 'nope', params: {}, title: 'Test', year: 2026 }), WIDE, 3);
    expect(cells.size).toBeGreaterThan(0);
    expect([...cells.values()].some((c) => 'Test'.includes(c.ch))).toBe(true);
  });

  it('the push counts down, rolls back, then rests', () => {
    const scene = sceneOf('sisyphus');
    const state = scene.init(WIDE);
    frame(scene, WIDE, 30, { state });
    expect(scene.status!(state)).toEqual({ label: 'Time left on this push', value: '0:30' });
    frame(scene, WIDE, 61, { state });
    expect(scene.status!(state).label).toBe('Time is up');
    frame(scene, WIDE, 70, { state });
    expect(scene.status!(state)).toEqual({ label: 'Your break: the walk down', value: '0:08' });
  });

  it('the descent counts how far back the dot has gone', () => {
    const scene = sceneOf('the-descent');
    const { state } = frame(scene, WIDE, 5);
    expect(scene.range!(state)).toBe('1.90b years ago');
  });

  it('the leaderboard’s readout names the run under the pointer', () => {
    const scene = sceneOf('persian-llm-eval');
    const { g, state } = frame(scene, WIDE, 3, { hover: { c: 1, r: 5 } });
    const html = scene.readout!(g, state)!.html;
    expect(html).toContain('0.9450');
    expect(html).toContain('gpt-5.5 + thinking (high)');
  });

  it('the river’s readout lists the channels running at that time', () => {
    const scene = sceneOf('delta');
    const c = Math.round(((2024.4 - 2019) / 8.5) * 71);
    const { g, state } = frame(scene, WIDE, 3, { hover: { c, r: 5 } });
    const html = scene.readout!(g, state)!.html;
    expect(html).toContain('sibkade');
    expect(html).toContain('helpfinity');
    expect(html).not.toContain('iranspoti');
  });

  // The grids the band really gets: 375px phones give 40 columns and 8 to 12 rows (plugins' wrapped HUD
  // leaves 8), desktop gives 70 × 14.
  const REAL: Grid[] = [{ cols: 40, rows: 8, cw: 7.2 }, { cols: 40, rows: 10, cw: 7.2 }, { cols: 70, rows: 14, cw: 7.2 }];

  it('labels never write over each other on the real grids', () => {
    for (const { id } of entries) {
      for (const grid of REAL) {
        const scene = sceneOf(id);
        const state = scene.init(grid);
        const { g } = createDraw(grid, { t: 3, now: 3000, still: false, hover: null });
        const owner = new Map<number, string>();
        const clashes: string[] = [];
        const text = g.text;
        g.text = (s, c, r, style, pri) => {
          for (let i = 0; i < s.length; i++) {
            const cc = Math.round(c) + i, rr = Math.round(r);
            if (cc < 0 || cc >= grid.cols || rr < 0 || rr >= grid.rows) continue;
            const key = rr * grid.cols + cc;
            // Another label on this cell, or right beside it on the same row, runs the two together.
            for (const k of [key - 1, key, key + 1]) {
              const prev = owner.get(k);
              if (k !== key && Math.floor(k / grid.cols) !== rr) continue;
              if (prev !== undefined && prev !== s) clashes.push(`"${prev}" and "${s}" at ${cc},${rr}`);
            }
            owner.set(key, s);
          }
          text(s, c, r, style, pri);
        };
        scene.draw(g, state);
        expect(clashes, `${id} on ${grid.cols}×${grid.rows}`).toEqual([]);
      }
    }
  });

  it('the plugins draw all nine screens on a phone', () => {
    const scene = sceneOf('claude-code-plugins');
    const grid = REAL[0];
    const { cells } = frame(scene, grid, 3, { still: true });
    // A screen is a frame of box-drawing glyphs, or one block per screen in the compact layout.
    const corners = [...cells.values()].filter((c) => c.ch === '╭').length;
    const tiles = [...cells.values()].filter((c) => c.ch === '█' && c.r < grid.rows - 3).length;
    expect(Math.max(corners, tiles)).toBe(9);
    // The validator's wall stays above the two caption rows.
    expect([...cells.values()].filter((c) => c.ch === '/' && c.r >= grid.rows - 2)).toEqual([]);
  });

  it('the boulder stays whole on the stage for the whole push', () => {
    const scene = sceneOf('sisyphus');
    for (const grid of [WIDE, ...REAL]) {
      const state = scene.init(grid);
      // The boulder is drawn at priority 20; count its cells as the push starts and as it ends.
      const boulder = (t: number) => [...frame(scene, grid, t, { state }).cells.values()].filter((c) => c.pri === 20).length;
      const start = boulder(1);
      expect(start, `${grid.cols}×${grid.rows}`).toBeGreaterThan(4);
      expect(boulder(59.9), `${grid.cols}×${grid.rows}`).toBeGreaterThanOrEqual(Math.floor(start * 0.8));
    }
  });

  it('label() keeps text inside the grid', () => {
    const { g, cells } = createDraw(NARROW, { t: 0, now: 0, still: true, hover: null });
    label(g, 'helpfinity', 36, 30);
    const placed = [...cells.values()];
    expect(placed.map((c) => c.ch).join('')).toBe('helpfinity');
    expect(Math.max(...placed.map((c) => c.c))).toBe(NARROW.cols - 1);
    expect(placed.every((c) => c.r === NARROW.rows - 1)).toBe(true);
  });
});
