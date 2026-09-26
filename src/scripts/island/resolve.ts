export type PageKind = 'home' | 'project' | 'notfound';
export type FlashView = 'copied' | 'jump' | 'opening';
export type IntroStep = 'boot' | 'hello' | 'home' | `d-${string}`;
export type ViewName =
  | 'boot' | 'hello' | 'home' | 'page' | 'notfound' | 'section'
  | 'menu-home' | 'menu-page' | 'contact' | 'next' | 'sheet'
  | FlashView | `d-${string}`;

export interface IslandState {
  kind: PageKind;
  intro: IntroStep | null;
  flash: FlashView | null;
  sheet: string | null;
  contact: boolean;
  menu: boolean;
  word: string | null;
  absorbed: boolean;
  nearEnd: boolean;
}

export function initialState(kind: PageKind): IslandState {
  return { kind, intro: null, flash: null, sheet: null, contact: false, menu: false, word: null, absorbed: false, nearEnd: false };
}

/** Exactly one view wins. Priority, highest first: flash, sheet, contact, menu, word, intro, next, section, page kind. */
export function resolveView(s: IslandState): ViewName {
  if (s.flash) return s.flash;
  if (s.sheet) return 'sheet';
  if (s.contact) return 'contact';
  if (s.menu) return s.kind === 'project' ? 'menu-page' : 'menu-home';
  if (s.word && s.kind === 'home' && !s.absorbed) return `d-${s.word}`;
  if (s.intro) return s.intro;
  if (s.kind === 'project' && s.nearEnd) return 'next';
  if (s.absorbed) return 'section';
  if (s.kind === 'home') return 'home';
  return s.kind === 'project' ? 'page' : 'notfound';
}
