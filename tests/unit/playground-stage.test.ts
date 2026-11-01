import { describe, it, expect } from 'vitest';
import { readoutLeft } from '../../src/scripts/playground/stage';

describe('readoutLeft', () => {
  it('sits 12px right of its column when it fits', () => {
    expect(readoutLeft(40, 7, 100, 500)).toBe(59);
  });

  it('flips to the left of its column near the right edge', () => {
    expect(readoutLeft(400, 7, 100, 500)).toBe(288);
  });

  it('stays inside a stage too narrow for either side, as a card on a phone', () => {
    expect(readoutLeft(130, 7.2, 150, 307)).toBe(8);
    expect(readoutLeft(150, 7.2, 150, 307)).toBe(8);
  });

  it('starts at the left edge when it is wider than the stage', () => {
    expect(readoutLeft(50, 7, 400, 300)).toBe(8);
  });
});
