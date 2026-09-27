import { describe, it, expect } from 'vitest';
import { Spring, springEasing, withLinearFallback, LINEAR_FALLBACK_EASING } from '../../src/scripts/island/spring';

function run(s: Spring, seconds: number): number {
  let max = -Infinity;
  for (let i = 0; i < seconds * 60; i++) {
    s.step(1 / 60);
    max = Math.max(max, s.x);
  }
  return max;
}

describe('Spring', () => {
  it('settles on its target without overshoot when critically damped', () => {
    const s = new Spring(0, 0.4, 1);
    s.t = 100;
    const max = run(s, 3);
    expect(s.x).toBeCloseTo(100, 2);
    expect(max).toBeLessThanOrEqual(100.001);
    expect(s.settled).toBe(true);
  });
  it('overshoots when underdamped', () => {
    const s = new Spring(0, 0.5, 0.5);
    s.t = 100;
    expect(run(s, 3)).toBeGreaterThan(100);
  });
  it('snap jumps to a value at rest', () => {
    const s = new Spring(0, 0.4, 1);
    s.t = 10;
    s.step(0.1);
    s.snap(5);
    expect([s.x, s.t, s.v]).toEqual([5, 5, 0]);
  });
  it('stays stable through a long frame', () => {
    const s = new Spring(0, 0.2, 0.7);
    s.t = 1;
    s.step(1);
    expect(Number.isFinite(s.x)).toBe(true);
    expect(Math.abs(s.x - 1)).toBeLessThan(0.01);
  });
  it('carries existing velocity, so motion can be interrupted', () => {
    const s = new Spring(0, 0.5, 1);
    s.v = 500;
    s.step(1 / 60);
    expect(s.x).toBeGreaterThan(0);
  });
});

describe('springEasing', () => {
  const values = (e: string) => e.slice('linear('.length, -1).split(', ').map(Number);
  it('produces a CSS linear() curve from 0 to 1', () => {
    const { easing, duration } = springEasing(0.5, 1);
    expect(easing.startsWith('linear(0, ')).toBe(true);
    expect(easing.endsWith(', 1)')).toBe(true);
    expect(duration).toBeGreaterThan(200);
    expect(duration).toBeLessThanOrEqual(2000);
  });
  it('overshoots only when underdamped', () => {
    expect(Math.max(...values(springEasing(0.5, 1).easing))).toBeLessThanOrEqual(1.0001);
    expect(Math.max(...values(springEasing(0.5, 0.7).easing))).toBeGreaterThan(1);
  });
});

describe('withLinearFallback', () => {
  const curve = springEasing(0.5, 0.86);
  it('keeps the linear() curve where the engine supports it', () => {
    expect(withLinearFallback(curve, true)).toEqual(curve);
  });
  it('falls back to cubic-bezier(.22, 1, .36, 1) with the same duration where it does not', () => {
    expect(LINEAR_FALLBACK_EASING).toBe('cubic-bezier(.22, 1, .36, 1)');
    expect(withLinearFallback(curve, false)).toEqual({ easing: 'cubic-bezier(.22, 1, .36, 1)', duration: curve.duration });
  });
});
