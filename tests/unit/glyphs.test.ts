import { describe, it, expect } from 'vitest';
import { GLYPH_NAMES, glyphSvg, tintBackground } from '../../src/lib/glyphs';

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
