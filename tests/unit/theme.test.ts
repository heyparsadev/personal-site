import { describe, it, expect } from 'vitest';
import { resolveTheme, flipTheme, applyTheme, currentTheme } from '../../src/scripts/theme';

describe('theme', () => {
  it('prefers a stored choice', () => {
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('light', true)).toBe('light');
  });
  it('falls back to the system setting', () => {
    expect(resolveTheme(null, true)).toBe('dark');
    expect(resolveTheme('bogus', false)).toBe('light');
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
});
