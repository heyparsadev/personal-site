import type { GlyphName, Tint } from './glyphs';
import type { PageKind } from '../scripts/island/resolve';

export interface SectionRef {
  id: string;
  label: string;
}

export interface PageLink {
  href: string;
  title: string;
  glyph: GlyphName;
  tint: Tint;
}

/** What the island needs to know about the page it is on. Rendered as JSON in #page-ctx inside <main>. */
export interface PageCtx {
  kind: PageKind;
  key: string;
  title: string;
  glyph: GlyphName;
  tint: Tint;
  status?: 'now' | 'active' | 'past';
  statusLabel?: string;
  sections: SectionRef[];
  next?: PageLink;
}

export type SiteMap = Record<string, PageLink>;

export interface ProjectInfo {
  id: string;
  title: string;
  glyph: GlyphName;
  tint: Tint;
  status: 'now' | 'active' | 'past';
  years: string;
}

const NEUTRAL: Tint = ['#8e8e93', '#48484a'];

export const HOME_LINK: PageLink = { href: '/', title: 'Home', glyph: 'home', tint: NEUTRAL };

export const HOME_SECTIONS: SectionRef[] = [
  { id: 'work', label: 'Work' },
  { id: 'playground', label: 'Playground' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
];

export function linkFor(p: ProjectInfo): PageLink {
  return { href: `/${p.id}`, title: p.title, glyph: p.glyph, tint: p.tint };
}

export function homeCtx(): PageCtx {
  return { kind: 'home', key: 'home', title: 'Parsa Kharazmian', glyph: 'home', tint: NEUTRAL, sections: HOME_SECTIONS };
}

export function projectCtx(p: ProjectInfo, chapters: SectionRef[], next: ProjectInfo): PageCtx {
  return {
    kind: 'project',
    key: p.id,
    title: p.title,
    glyph: p.glyph,
    tint: p.tint,
    status: p.status,
    statusLabel: p.status === 'now' ? 'Now' : p.years,
    sections: chapters,
    next: linkFor(next),
  };
}

export function notFoundCtx(): PageCtx {
  return { kind: 'notfound', key: 'notfound', title: 'Page not found', glyph: 'alert', tint: NEUTRAL, sections: [] };
}

/** Pathname → link info for every page, so the island can show where a navigation is heading before it lands. */
export function buildSiteMap(pages: ProjectInfo[]): SiteMap {
  const map: SiteMap = { '/': HOME_LINK };
  for (const p of pages) map[`/${p.id}`] = linkFor(p);
  return map;
}

export function normalizePath(pathname: string): string {
  const p = pathname.replace(/\/index\.html$/, '').replace(/\/+$/, '');
  return p === '' ? '/' : p;
}

export function parseCtx(text: string | null | undefined): PageCtx | null {
  if (!text) return null;
  try {
    const v = JSON.parse(text);
    return v && typeof v.kind === 'string' && typeof v.key === 'string' && Array.isArray(v.sections) ? (v as PageCtx) : null;
  } catch {
    return null;
  }
}
