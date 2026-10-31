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

  it('label() keeps text inside the grid', () => {
    const { g, cells } = createDraw(NARROW, { t: 0, now: 0, still: true, hover: null });
    label(g, 'helpfinity', 36, 30);
    const placed = [...cells.values()];
    expect(placed.map((c) => c.ch).join('')).toBe('helpfinity');
    expect(Math.max(...placed.map((c) => c.c))).toBe(NARROW.cols - 1);
    expect(placed.every((c) => c.r === NARROW.rows - 1)).toBe(true);
  });
});
