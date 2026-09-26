import { describe, it, expect } from 'vitest';
import { absorbProgress, nextAbsorbed, currentSection, rollDirection, isNearEnd, pageProgress, type SectionTop } from '../../src/scripts/island/scroll';

const tops: SectionTop[] = [
  { id: 'work', label: 'Work', top: 1000 },
  { id: 'about', label: 'About', top: 2000 },
];

describe('scroll maths', () => {
  it('absorbProgress eases from 0 to 1 over 42% of the viewport', () => {
    expect(absorbProgress(0, 1000)).toBe(0);
    expect(absorbProgress(210, 1000)).toBeCloseTo(0.5, 5);
    expect(absorbProgress(420, 1000)).toBe(1);
    expect(absorbProgress(5000, 1000)).toBe(1);
  });
  it('nextAbsorbed has hysteresis', () => {
    expect(nextAbsorbed(false, 0.91)).toBe(false);
    expect(nextAbsorbed(false, 0.92)).toBe(true);
    expect(nextAbsorbed(true, 0.86)).toBe(true);
    expect(nextAbsorbed(true, 0.84)).toBe(false);
  });
  it('currentSection switches when a section top passes 28% of the viewport', () => {
    expect(currentSection(tops, 0, 1000)).toBeNull();
    expect(currentSection(tops, 719, 1000)).toBeNull();
    expect(currentSection(tops, 720, 1000)?.id).toBe('work');
    expect(currentSection(tops, 1720, 1000)?.id).toBe('about');
  });
  it('rollDirection follows document order', () => {
    expect(rollDirection(tops, null, 'work')).toBe(1);
    expect(rollDirection(tops, 'about', 'work')).toBe(-1);
    expect(rollDirection(tops, 'work', null)).toBe(-1);
  });
  it('isNearEnd triggers when the end block reaches 75% of the viewport', () => {
    expect(isNearEnd(null, 5000, 1000)).toBe(false);
    expect(isNearEnd(2000, 1249, 1000)).toBe(false);
    expect(isNearEnd(2000, 1250, 1000)).toBe(true);
  });
  it('pageProgress is clamped to 0..1', () => {
    expect(pageProgress(0, 1000, 5000)).toBe(0);
    expect(pageProgress(4000, 1000, 5000)).toBe(1);
    expect(pageProgress(9000, 1000, 5000)).toBe(1);
    expect(pageProgress(10, 1000, 500)).toBe(1);
  });
});
