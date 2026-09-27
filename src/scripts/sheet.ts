import { springEasing } from './island/spring';

const OPEN = springEasing(0.5, 0.86);
const CLOSE = springEasing(0.38, 1);

interface Opened {
  id: string;
  sheet: HTMLElement;
  card: HTMLElement | null;
  trigger: HTMLElement | null;
  /** Set the instant closeSheet() claims this session, so a still-running openSheet() tail
   *  (suspended on the FLIP animation's `finished` promise) knows to back off instead of
   *  re-settling a sheet that is already on its way out. See closeSheet() below: without this,
   *  Escape (or any close) pressed while the ~700ms open animation is still playing was silently
   *  dropped, because the old single `busy` flag blocked closeSheet() outright until the open
   *  animation finished on its own. */
  closing: boolean;
}

let opened: Opened | null = null;

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const layer = () => document.querySelector<HTMLElement>('[data-sheet-layer]');

/** The transform that makes an element laid out at `base` appear at `target` (transform-origin: top left). */
function transformFor(target: DOMRect, base: DOMRect): string {
  return `translate(${target.left - base.left}px, ${target.top - base.top}px) scale(${target.width / base.width}, ${target.height / base.height})`;
}

function tell(detail: { id: string; title: string; glyph: string; tint: string[] } | null): void {
  document.dispatchEvent(new CustomEvent('island:sheet', { detail }));
}

function cleanup(): void {
  if (!opened) return;
  const { sheet, card } = opened;
  for (const a of sheet.getAnimations()) a.cancel();
  sheet.classList.remove('is-active', 'is-settled');
  sheet.removeAttribute('role');
  sheet.removeAttribute('aria-modal');
  if (card) card.style.visibility = '';
  layer()?.classList.remove('is-open', 'is-shown');
  document.querySelector('main')?.removeAttribute('inert');
  document.documentElement.classList.remove('sheet-lock');
  opened = null;
  tell(null);
}

export async function openSheet(id: string, trigger: HTMLElement | null): Promise<void> {
  const l = layer();
  const sheet = document.getElementById(`sheet-${id}`);
  if (opened || !l || !sheet) return;
  const card = document.querySelector<HTMLElement>(`[data-card="${id}"]`);
  const session: Opened = { id, sheet, card, trigger, closing: false };
  opened = session;
  l.classList.add('is-open');
  sheet.classList.add('is-active');
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  document.querySelector('main')?.setAttribute('inert', '');
  document.documentElement.classList.add('sheet-lock');
  history.replaceState(history.state, '', `#${id}`);
  tell({ id, title: sheet.dataset.title ?? id, glyph: sheet.dataset.glyph ?? 'alert', tint: (sheet.dataset.tint ?? '#8e8e93,#48484a').split(',') });
  requestAnimationFrame(() => l.classList.add('is-shown'));
  if (card && !reduced()) {
    const from = card.getBoundingClientRect();
    const to = sheet.getBoundingClientRect();
    card.style.visibility = 'hidden';
    await sheet
      .animate([{ transform: transformFor(from, to), borderRadius: '28px' }, { transform: 'none', borderRadius: '32px' }], { duration: OPEN.duration, easing: OPEN.easing })
      .finished.catch(() => undefined);
  }
  // closeSheet() may have interrupted the animation above (Escape, backdrop, island) -- when it
  // did, `session.closing` is already true and this stale continuation must not resurrect a
  // sheet that is on its way out (re-adding is-settled or stealing focus back from the trigger).
  if (session.closing) return;
  sheet.classList.add('is-settled');
  sheet.focus({ preventScroll: true });
}

export async function closeSheet(): Promise<void> {
  if (!opened || opened.closing) return;
  opened.closing = true;
  const { sheet, card, trigger } = opened;
  // Cancel a still-running open so the FLIP math below measures the sheet's actual current box
  // instead of racing the open animation for the transform/border-radius properties.
  for (const a of sheet.getAnimations()) a.cancel();
  sheet.classList.remove('is-settled');
  layer()?.classList.remove('is-shown');
  if (card && !reduced()) {
    const to = card.getBoundingClientRect();
    const from = sheet.getBoundingClientRect();
    await sheet
      .animate([{ transform: 'none', borderRadius: '32px' }, { transform: transformFor(to, from), borderRadius: '28px' }], { duration: CLOSE.duration, easing: CLOSE.easing, fill: 'forwards' })
      .finished.catch(() => undefined);
  }
  cleanup();
  history.replaceState(history.state, '', location.pathname + location.search);
  trigger?.focus({ preventScroll: true });
}

document.addEventListener('click', (e) => {
  const t = e.target as Element;
  const openBtn = t.closest<HTMLElement>('[data-sheet-open]');
  if (openBtn) {
    e.preventDefault();
    void openSheet(openBtn.dataset.sheetOpen ?? '', openBtn);
    return;
  }
  if (opened && (t.closest('[data-sheet-close]') || t.closest('[data-sheet-backdrop]'))) void closeSheet();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && opened) void closeSheet();
});
document.addEventListener('sheet:close', () => void closeSheet());
document.addEventListener('astro:before-swap', () => {
  cleanup();
});
document.addEventListener('astro:page-load', () => {
  const id = location.hash.slice(1);
  if (id && document.getElementById(`sheet-${id}`)) void openSheet(id, document.querySelector<HTMLElement>(`[data-sheet-open="${id}"]`));
});
