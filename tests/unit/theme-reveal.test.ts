import { describe, it, expect } from 'vitest';
import { coverRadius } from '../../src/scripts/theme-reveal';

describe('coverRadius', () => {
  it('reaches the farthest corner from the theme button near the top middle', () => {
    expect(coverRadius(720, 40, 1440, 900)).toBeCloseTo(Math.hypot(720, 860));
  });
  it('picks the opposite corner from an off-centre point', () => {
    expect(coverRadius(100, 50, 400, 300)).toBeCloseTo(Math.hypot(300, 250));
    expect(coverRadius(350, 260, 400, 300)).toBeCloseTo(Math.hypot(350, 260));
  });
  it('is the whole diagonal from a corner', () => {
    expect(coverRadius(0, 0, 300, 400)).toBe(500);
  });
});
