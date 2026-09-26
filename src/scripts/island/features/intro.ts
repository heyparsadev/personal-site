import type { IslandCore } from '../core';
import type { IntroStep } from '../resolve';
import type { TitleControl } from './title';

const SEEN_KEY = 'heyparsa-intro-seen';

function seen(): boolean {
  try { return sessionStorage.getItem(SEEN_KEY) === '1'; } catch { return true; }
}

function markSeen(): void {
  try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* storage blocked */ }
}

/** First visit to home: hello → the name drops out → two live-word previews. Every other arrival only drops the title. */
export function installIntro(core: IslandCore, title: TitleControl): void {
  let timers: number[] = [];
  const at = (ms: number, fn: () => void) => { timers.push(window.setTimeout(fn, ms)); };
  const clear = () => { for (const t of timers) clearTimeout(t); timers = []; };
  const step = (view: IntroStep | null, lit: string | null = null) => {
    core.state.intro = view;
    core.emit('lit', lit);
    core.resolve();
  };

  core.onInterrupt(() => {
    if (!core.state.intro && title.dropped) return;
    clear();
    core.state.intro = null;
    core.emit('lit', null);
    title.drop();
    core.resolve();
  });

  core.onPage((ctx, first) => {
    clear();
    const full = first && ctx.kind === 'home' && !seen() && !core.reduced && scrollY < 8;
    markSeen();
    if (first) {
      core.w.snap(36);
      core.h.snap(36);
      core.r.snap(18);
      core.state.intro = 'boot';
    }
    if (full) {
      at(150, () => step('hello'));
      at(1500, () => { title.drop(); step('home'); });
      at(3000, () => step('d-sibkade', 'sibkade'));
      at(4700, () => step('d-barayand', 'barayand'));
      at(6400, () => step(null));
    } else {
      at(first ? 150 : 40, () => { title.drop(); step(null); });
    }
  });
}
