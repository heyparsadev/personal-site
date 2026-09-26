import { IslandDom } from './dom';
import { IslandCore } from './core';
import { homeCtx, parseCtx } from '../../lib/page-ctx';
import { installTitle } from './features/title';
import { installIntro } from './features/intro';
import { installMenu } from './features/menu';
import { installWords } from './features/words';
import { installContact } from './features/contact';
import { installThemeToggle } from './features/theme';
import { installSections } from './features/sections';

const root = document.querySelector<HTMLElement>('[data-island]');

if (root && !root.dataset.booted) {
  root.dataset.booted = 'true';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const readCtx = () => parseCtx(document.querySelector('main #page-ctx')?.textContent) ?? homeCtx();
  const core = new IslandCore(new IslandDom(root), readCtx(), reduced);
  const title = installTitle(core);
  installIntro(core, title);
  installMenu(core);
  installWords(core);
  installContact(core);
  installThemeToggle(core);
  installSections(core);

  // Client-side navigations: the island persists, the page context changes.
  let navigating = false;
  document.addEventListener('astro:before-preparation', () => { navigating = true; });
  document.addEventListener('astro:page-load', () => {
    if (!navigating) return;
    navigating = false;
    core.setPage(readCtx(), false);
  });

  core.setPage(core.ctx, true);
  core.start();
  document.documentElement.classList.add('island-ready');
}
