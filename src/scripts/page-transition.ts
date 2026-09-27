import type { TransitionBeforeSwapEvent } from 'astro:transitions/client';

/**
 * Names the outgoing and incoming <main> for the page transition (see global.css): the old one exits
 * in place as page-out, the new one enters in place as page-in. Only one <main> is ever in the
 * document, because the swap replaces it, so the two names can't collide.
 */
document.addEventListener('astro:after-preparation', () => {
  // After the loader, just before startViewTransition captures the old state.
  const main = document.querySelector<HTMLElement>('main');
  if (main) main.dataset.vt = 'out';
});

document.addEventListener('astro:before-swap', (e) => {
  const { newDocument, signal } = e as TransitionBeforeSwapEvent;
  const main = newDocument.querySelector<HTMLElement>('main');
  // A superseded navigation (another click, or Back, before this swap) still swaps. The newer
  // transition may capture this main as its old state before its own after-preparation can re-mark
  // it, so it stays unnamed: it then joins the root snapshot instead of pairing with the next page-in.
  if (main && !signal.aborted) main.dataset.vt = 'in';
});
