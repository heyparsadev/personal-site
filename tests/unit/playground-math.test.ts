import { describe, it, expect } from 'vitest';
import { clock, hash, inkAlpha, inkLevel, marsHours, marsTime, phi } from '../../src/scripts/playground/math';

describe('playground math', () => {
  it('phi is the standard normal CDF', () => {
    expect(phi(0)).toBeCloseTo(0.5, 6);
    expect(Math.abs(phi(1.96) - 0.975)).toBeLessThan(1e-3);
  });

  it('clock rounds a countdown up to whole seconds and never goes negative', () => {
    expect(clock(60)).toBe('1:00');
    expect(clock(59.2)).toBe('1:00');
    expect(clock(0.4)).toBe('0:01');
    expect(clock(0)).toBe('0:00');
    expect(clock(-3)).toBe('0:00');
  });

  it('Mars time is midnight at the start of MSD 44796 (6 Jan 2000, Mars24)', () => {
    const h = marsHours(Date.UTC(2000, 0, 6));
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(24);
    expect(Math.min(h, 24 - h)).toBeLessThan(0.02);
    expect(marsTime(Date.UTC(2026, 9, 31, 12))).toMatch(/^\d\d:\d\d$/);
  });

  it('hash is deterministic and in [0, 1)', () => {
    for (let i = -5; i < 50; i++) {
      const v = hash(i, i * 3, 7);
      expect(v).toBe(hash(i, i * 3, 7));
      expect(v >= 0 && v < 1).toBe(true);
    }
  });

  it('one ink value picks the glyph level and its alpha', () => {
    expect(inkLevel(0.5)).toBe(5);
    expect(inkLevel(2)).toBe(9);
    expect(inkLevel(0.01)).toBe(1);
    expect(inkAlpha(9)).toBeCloseTo(1, 6);
    expect(inkAlpha(1)).toBeCloseTo(0.2533, 3);
  });
});
