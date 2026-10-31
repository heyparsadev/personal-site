// Pure helpers behind the Playground stages: Monoglyph's ramp and noise, a few easings, and Mars time.

/** Monoglyph's ramp, lightest to densest. One ink value picks both the glyph and its alpha. */
export const RAMP = ' .:-=+*#%@';
/** Glyphs the opening flashes in a column before it settles. */
export const NOISE = '#%&@$*+=/\\<>?!';

export const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Smoothstep: 0 below e0, 1 above e1, eased between. */
export function smooth(e0: number, e1: number, x: number): number {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function norm3(x: number, y: number, z: number): [number, number, number] {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
}

/** Deterministic noise in [0, 1) for a cell and a time slot (Monoglyph's). */
export function hash(x: number, y: number, z: number): number {
  let h = Math.imul(x + 1, 0x27d4eb2d) ^ Math.imul(y + 1, 0x165667b1) ^ Math.imul(z + 1, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise in [0, 1], interpolated between hashed lattice points. */
export function vnoise(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const u = smooth(0, 1, x - xi), v = smooth(0, 1, y - yi);
  const a = hash(xi, yi, 3), b = hash(xi + 1, yi, 3), c = hash(xi, yi + 1, 3), d = hash(xi + 1, yi + 1, 3);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Abramowitz and Stegun 7.1.26, good to about 1.5e-7. */
function erf(x: number): number {
  const sign = Math.sign(x), a = Math.abs(x), t = 1 / (1 + 0.3275911 * a);
  return sign * (1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a));
}

/** The standard normal CDF. */
export const phi = (z: number): number => 0.5 * (1 + erf(z / Math.SQRT2));

/** A countdown as m:ss, rounded up to whole seconds, never below 0:00. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Mars Coordinated Time in hours, [0, 24), from Allison and McEwen's Mars Sol Date. */
export function marsHours(epochMs: number): number {
  const jdTT = epochMs / 86400000 + 2440587.5 + 69.184 / 86400;
  const msd = (jdTT - 2405522.0028779) / 1.0274912517;
  return (((msd % 1) + 1) % 1) * 24;
}

export function marsTime(epochMs: number): string {
  const h = marsHours(epochMs), hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** The ramp level an ink value draws at: 1 (.) to 9 (@). */
export const inkLevel = (v: number): number => clamp(Math.round(v * 9), 1, 9);
/** A level's alpha: 0.16 + 0.84 × level ÷ 9. */
export const inkAlpha = (level: number): number => 0.16 + (0.84 * level) / 9;
