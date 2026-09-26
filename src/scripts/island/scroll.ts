export const ABSORB_RANGE = 0.42;
export const ABSORB_ON = 0.92;
export const ABSORB_OFF = 0.85;
export const SECTION_LINE = 0.28;
export const NEAR_END_LINE = 0.75;

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a), 0, 1);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (t: number) => t * t * (3 - 2 * t);

/** 0 at the top of the page; 1 once the title should be fully inside the island. */
export function absorbProgress(scrollY: number, viewportH: number): number {
  return smoothstep(seg(scrollY, 0, viewportH * ABSORB_RANGE));
}

/** Hysteresis, so the island doesn't flicker at the threshold. */
export function nextAbsorbed(prev: boolean, progress: number): boolean {
  return prev ? progress >= ABSORB_OFF : progress >= ABSORB_ON;
}

export interface SectionTop {
  id: string;
  label: string;
  top: number;
}

/** The last section whose top has passed SECTION_LINE of the viewport, or null before the first one. */
export function currentSection(tops: SectionTop[], scrollY: number, viewportH: number): SectionTop | null {
  let hit: SectionTop | null = null;
  for (const t of tops) if (t.top - scrollY <= viewportH * SECTION_LINE) hit = t;
  return hit;
}

export function rollDirection(tops: SectionTop[], fromId: string | null, toId: string | null): 1 | -1 {
  const index = (id: string | null) => (id === null ? -1 : tops.findIndex((t) => t.id === id));
  return index(toId) >= index(fromId) ? 1 : -1;
}

/** True once the end block's top is within NEAR_END_LINE of the viewport. */
export function isNearEnd(endTop: number | null, scrollY: number, viewportH: number): boolean {
  return endTop !== null && endTop - scrollY <= viewportH * NEAR_END_LINE;
}

export function pageProgress(scrollY: number, viewportH: number, docH: number): number {
  return clamp(scrollY / Math.max(1, docH - viewportH), 0, 1);
}
