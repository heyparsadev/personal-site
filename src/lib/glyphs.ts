export const GLYPH_NAMES = ['resultant', 'gift', 'psi', 'bag', 'trend', 'code', 'home', 'alert'] as const;
export type GlyphName = (typeof GLYPH_NAMES)[number];
export type Tint = readonly [string, string];

const PATHS: Record<GlyphName, string> = {
  resultant: '<path d="M5 19 9 9.5" opacity=".5"/><path d="M5 19l9.5-3" opacity=".5"/><path d="M5 19 18 6"/><path d="M11 6h7v7"/>',
  gift: '<rect x="3.5" y="7.5" width="17" height="4" rx="1"/><rect x="5" y="11.5" width="14" height="9" rx="1.5"/><path d="M12 7.5v13"/><path d="M12 7.5c-1.4-3-4.8-3.3-4.8-1.2 0 1.2 2.2 1.2 4.8 1.2zm0 0c1.4-3 4.8-3.3 4.8-1.2 0 1.2-2.2 1.2-4.8 1.2z"/>',
  psi: '<text x="12" y="17.6" text-anchor="middle" font-size="17" font-weight="500" fill="currentColor" stroke="none">Ψ</text>',
  bag: '<path d="M6 8.5h12l-1 11.5H7L6 8.5z"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/>',
  trend: '<path d="M4 17l6-6 4 4 6-7"/><path d="M15 8h5v5"/>',
  code: '<path d="M9 7l-5 5 5 5M15 7l5 5-5 5"/>',
  home: '<path d="M4 11.5 12 5l8 6.5"/><path d="M6.5 10v9h11v-9"/>',
  alert: '<circle cx="12" cy="12" r="8"/><path d="M12 8v5"/><path d="M12 16.2v.3"/>',
};

export function glyphSvg(name: GlyphName): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PATHS[name]}</svg>`;
}

export function tintBackground(tint: Tint): string {
  return `linear-gradient(140deg, ${tint[0]}, ${tint[1]})`;
}

/** "#0a84ff" → "10, 132, 255", for rgba() glows. */
export function hexToRgb(hex: string): string {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}
