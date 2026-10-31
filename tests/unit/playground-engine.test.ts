import { describe, it, expect } from 'vitest';
import { STYLE, createDraw, stroke } from '../../src/scripts/playground/engine';
import { RAMP } from '../../src/scripts/playground/math';

const grid = { cols: 20, rows: 10, cw: 7.2 };
const frame = (still = true) => ({ t: 1, now: 1000, still, hover: null });
const at = (cells: Map<number, { ch: string }>, c: number, r: number) => cells.get(r * grid.cols + c)?.ch;

describe('the draw context', () => {
  it('a higher priority wins a cell, and a lower one does not replace it', () => {
    const { g, cells } = createDraw(grid, frame());
    g.put(STYLE.label, 'a', 2, 2, 5);
    g.put(STYLE.label, 'b', 2, 2, 3);
    expect(at(cells, 2, 2)).toBe('a');
    g.put(STYLE.label, 'c', 2, 2, 9);
    expect(at(cells, 2, 2)).toBe('c');
  });

  it('drops puts outside the grid and blanks', () => {
    const { g, cells } = createDraw(grid, frame());
    g.put(STYLE.label, 'x', -1, 0);
    g.put(STYLE.label, 'x', 20, 0);
    g.put(STYLE.label, 'x', 0, 10);
    g.put(STYLE.label, ' ', 1, 1);
    expect(cells.size).toBe(0);
  });

  it('ink at or under 0.03 draws nothing', () => {
    const { g, cells } = createDraw(grid, frame());
    g.ink(1, 1, 0.03);
    expect(cells.size).toBe(0);
  });

  it('a still frame maps ink 0.5 to the ramp’s fifth glyph', () => {
    const { g, cells } = createDraw(grid, frame(true));
    g.ink(4, 4, 0.5);
    expect(at(cells, 4, 4)).toBe(RAMP[5]);
  });

  it('text fills one cell per character', () => {
    const { g, cells } = createDraw(grid, frame());
    g.text('ab', 3, 2);
    expect(at(cells, 3, 2)).toBe('a');
    expect(at(cells, 4, 2)).toBe('b');
  });

  it('stroke follows the line’s angle on screen', () => {
    const glyphOf = (c0: number, r0: number, c1: number, r1: number) => {
      const { g, cells } = createDraw(grid, frame());
      stroke(g, c0, r0, c1, r1, 1);
      return [...new Set([...cells.values()].map((cell) => cell.ch))];
    };
    expect(glyphOf(5, 0, 5, 6)).toEqual(['|']);
    expect(glyphOf(0, 3, 12, 3)).toEqual(['-']);
    expect(glyphOf(2, 1, 6, 3)).toEqual(['\\']);
    expect(glyphOf(6, 1, 2, 3)).toEqual(['/']);
  });
});
