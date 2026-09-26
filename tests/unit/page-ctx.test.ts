import { describe, it, expect } from 'vitest';
import { normalizePath, parseCtx, projectCtx, homeCtx, buildSiteMap, type ProjectInfo } from '../../src/lib/page-ctx';

const barayand: ProjectInfo = { id: 'barayand', title: 'Barayand', glyph: 'resultant', tint: ['#0a84ff', '#5e5ce6'], status: 'now', years: '2026 – present' };
const sibkade: ProjectInfo = { id: 'sibkade', title: 'Sibkade', glyph: 'gift', tint: ['#ffb340', '#ff7a00'], status: 'active', years: '2020 – present' };

describe('page context', () => {
  it('normalizes paths', () => {
    expect(normalizePath('/')).toBe('/');
    expect(normalizePath('/sibkade/')).toBe('/sibkade');
    expect(normalizePath('/sibkade/index.html')).toBe('/sibkade');
    expect(normalizePath('')).toBe('/');
  });
  it('builds project contexts with a status label and next link', () => {
    const c = projectCtx(barayand, [{ id: 'the-idea', label: 'The idea' }], sibkade);
    expect(c).toMatchObject({ kind: 'project', key: 'barayand', statusLabel: 'Now', next: { href: '/sibkade', title: 'Sibkade' } });
    expect(projectCtx(sibkade, [], barayand).statusLabel).toBe('2020 – present');
  });
  it('builds the home context with its four sections', () => {
    expect(homeCtx().sections.map((s) => s.id)).toEqual(['work', 'playground', 'about', 'contact']);
  });
  it('maps every page path', () => {
    expect(Object.keys(buildSiteMap([barayand, sibkade]))).toEqual(['/', '/barayand', '/sibkade']);
  });
  it('parses valid context JSON and rejects anything else', () => {
    expect(parseCtx(JSON.stringify(homeCtx()))?.key).toBe('home');
    expect(parseCtx('{"kind":1}')).toBeNull();
    expect(parseCtx('not json')).toBeNull();
    expect(parseCtx(null)).toBeNull();
  });
});
