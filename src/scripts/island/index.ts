import { IslandDom } from './dom';
import { IslandCore } from './core';
import { installTitle } from './features/title';
import { installIntro } from './features/intro';
import { installMenu } from './features/menu';
import { installWords } from './features/words';
import { installContact } from './features/contact';
import { installThemeToggle } from './features/theme';
import { installSections } from './features/sections';
import { installNext } from './features/next';
import { installRouter, readCtx } from './features/router';

const root = document.querySelector<HTMLElement>('[data-island]');

if (root && !root.dataset.booted) {
  root.dataset.booted = 'true';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const core = new IslandCore(new IslandDom(root), readCtx(), reduced);
  const title = installTitle(core);
  installIntro(core, title);
  installMenu(core);
  installWords(core);
  installContact(core);
  installThemeToggle(core);
  installSections(core);
  installNext(core);
  installRouter(core);
  core.setPage(core.ctx, true);
  core.start();
  document.documentElement.classList.add('island-ready');
}
