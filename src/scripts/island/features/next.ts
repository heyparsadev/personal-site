import type { IslandCore } from '../core';
import { isNearEnd } from '../scroll';

/** Near the end of a project page, the island offers the next project. */
export function installNext(core: IslandCore): void {
  let end: HTMLElement | null = null;
  let endTop: number | null = null;
  const measure = () => {
    endTop = end ? end.getBoundingClientRect().top + scrollY : null;
  };

  core.onPage((ctx) => {
    end = ctx.kind === 'project' ? document.querySelector<HTMLElement>('main [data-next]') : null;
    measure();
  });
  addEventListener('resize', measure);
  addEventListener('load', measure);

  core.onFrame(() => {
    if (core.ctx.kind !== 'project') return;
    const near = isNearEnd(endTop, scrollY, innerHeight);
    if (near === core.state.nearEnd) return;
    core.state.nearEnd = near;
    core.resolve();
  });

  // The next-link is reachable without the menu ever having opened (every other in-island link
  // sits behind the hover-opened menu, so by the time it's clickable core.state.menu is already
  // true and menu.ts's focusin guard skips it). Here a mouse click's default focus-follows-click
  // would fire focusin -> menu.ts's open() -> the view switches to menu-page, which drops this
  // view's pointer-events immediately (unlike opacity/visibility, that CSS property isn't
  // transitioned). The click then lands on nothing and the browser never navigates. Suppressing
  // just the focus (not the click) keeps the anchor's own href in charge, same spirit as the
  // focus hand-offs elsewhere in the island (contact.ts, sections.ts, menu.ts's refocus): don't
  // let an incidental focus change fight the view being used. Keyboard reach is unaffected: Tab
  // already lands on nav.isl first and opens the menu before this link is ever independently
  // reachable.
  core.dom.slot('next-link').addEventListener('mousedown', (e) => e.preventDefault());
}
