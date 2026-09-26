import { describe, it, expect } from 'vitest';
import { GLYPH_NAMES, glyphSvg, tintBackground, hexToRgb } from '../../src/lib/glyphs';

describe('glyphs', () => {
  it('renders an svg for every glyph name', () => {
    for (const g of GLYPH_NAMES) {
      const svg = glyphSvg(g);
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg).toContain('viewBox="0 0 24 24"');
    }
  });
  it('builds a two-stop gradient', () => {
    expect(tintBackground(['#000', '#fff'])).toBe('linear-gradient(140deg, #000, #fff)');
  });
});

describe('hexToRgb', () => {
  it('converts long and short hex', () => {
    expect(hexToRgb('#0a84ff')).toBe('10, 132, 255');
    expect(hexToRgb('#fff')).toBe('255, 255, 255');
  });
});
