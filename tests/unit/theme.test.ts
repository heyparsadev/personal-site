import { describe, it, expect } from 'vitest';
import { resolveTheme, flipTheme, applyTheme, currentTheme, THEME_COLOR } from '../../src/scripts/theme';

describe('theme', () => {
  it('prefers a stored choice', () => {
    expect(resolveTheme('dark')).toBe('dark');
    expect(resolveTheme('light')).toBe('light');
  });
  it('defaults to light, whatever the system prefers', () => {
    expect(resolveTheme(null)).toBe('light');
    expect(resolveTheme('bogus')).toBe('light');
  });
  it('flips', () => {
    expect(flipTheme('dark')).toBe('light');
    expect(flipTheme('light')).toBe('dark');
  });
  it('applies to a root element', () => {
    const root = { dataset: {} as Record<string, string>, style: {} as Record<string, string> } as unknown as HTMLElement;
    applyTheme('dark', root);
    expect(root.dataset.theme).toBe('dark');
    expect(root.style.colorScheme).toBe('dark');
    expect(currentTheme(root)).toBe('dark');
  });
  it('keeps the browser chrome colour (theme-color) in step with the theme', () => {
    const meta = { content: '', setAttribute(_: string, v: string) { this.content = v; } };
    const root = {
      dataset: {} as Record<string, string>,
      style: {} as Record<string, string>,
      ownerDocument: { querySelector: (sel: string) => (sel === 'meta[name="theme-color"]' ? meta : null) },
    } as unknown as HTMLElement;
    applyTheme('dark', root);
    expect(meta.content).toBe(THEME_COLOR.dark);
    applyTheme('light', root);
    expect(meta.content).toBe(THEME_COLOR.light);
    expect(THEME_COLOR).toEqual({ light: '#fbfbfd', dark: '#000000' });
  });
});
