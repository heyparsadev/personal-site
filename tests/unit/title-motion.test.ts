import { describe, it, expect } from 'vitest';
import { titleFrame, titleProgress, ISLAND_CENTER_Y, TITLE_MIN_SCALE } from '../../src/scripts/island/title-motion';

const origin = { cx: 400, cy: 500 };

describe('titleFrame', () => {
  it('is the identity at e = 0', () => {
    const f = titleFrame(0, origin, 1000, 0);
    expect(f.tx).toBeCloseTo(0);
    expect(f.ty).toBeCloseTo(0);
    expect(f.scale).toBeCloseTo(1);
    expect(f.opacity).toBe(1);
    expect(f.blur).toBe(0);
  });
  it('lands on the island centre at e = 1, whatever the scroll', () => {
    for (const y of [0, 300]) {
      const f = titleFrame(1, origin, 1000, y);
      expect(origin.cx + f.tx).toBeCloseTo(500);
      expect(origin.cy - y + f.ty).toBeCloseTo(ISLAND_CENTER_Y);
      expect(f.scale).toBeCloseTo(TITLE_MIN_SCALE);
      expect(f.opacity).toBe(0);
      expect(f.blur).toBeCloseTo(5);
    }
  });
  it('drops blur under reduced motion', () => {
    expect(titleFrame(1, origin, 1000, 0, true).blur).toBe(0);
  });
  it('only fades under reduced motion: no travel, no scale', () => {
    for (const [e, y] of [[0.5, 0], [0.8, 120], [1, 300]]) {
      const f = titleFrame(e, origin, 1000, y, true);
      expect([f.tx, f.ty, f.scale]).toEqual([0, 0, 1]);
      expect(f.opacity).toBe(titleFrame(e, origin, 1000, y).opacity);
    }
    expect(titleFrame(1, origin, 1000, 0, true).opacity).toBe(0);
  });
  it('overshoots gently below 0', () => {
    const f = titleFrame(-0.04, origin, 1000, 0);
    expect(f.scale).toBeGreaterThan(1);
    expect(f.scale).toBeLessThan(1.05);
    expect(f.opacity).toBe(1);
  });
});

describe('titleProgress', () => {
  it('uses the intro value at the top and the larger value once scrolling', () => {
    expect(titleProgress(-0.02, 0)).toBe(-0.02);
    expect(titleProgress(0.3, 0.5)).toBe(0.5);
    expect(titleProgress(0.9, 0.5)).toBe(0.9);
  });
});
