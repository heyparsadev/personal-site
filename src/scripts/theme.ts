export type Theme = 'light' | 'dark';
export const THEME_KEY = 'heyparsa-theme';

/** Browser chrome colour (meta theme-color) for each theme; matches --bg. */
export const THEME_COLOR: Record<Theme, string> = { light: '#fbfbfd', dark: '#000000' };

/** Light unless the visitor chose dark. The system setting is deliberately ignored. */
export function resolveTheme(stored: string | null): Theme {
  return stored === 'dark' ? 'dark' : 'light';
}

export function flipTheme(t: Theme): Theme {
  return t === 'dark' ? 'light' : 'dark';
}

export function currentTheme(root: HTMLElement = document.documentElement): Theme {
  return root.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function applyTheme(t: Theme, root: HTMLElement = document.documentElement): void {
  root.dataset.theme = t;
  root.style.colorScheme = t;
  root.ownerDocument?.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[t]);
}

export function saveTheme(t: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    /* storage blocked (private mode): the choice lasts for this page only */
  }
}
