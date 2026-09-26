export type Theme = 'light' | 'dark';
export const THEME_KEY = 'heyparsa-theme';

export function resolveTheme(stored: string | null, prefersDark: boolean): Theme {
  if (stored === 'light' || stored === 'dark') return stored;
  return prefersDark ? 'dark' : 'light';
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
}

export function saveTheme(t: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    /* storage blocked (private mode): the choice lasts for this page only */
  }
}
