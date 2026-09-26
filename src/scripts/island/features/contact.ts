import type { IslandCore } from '../core';

/** Contact opens inside the island; tapping the email copies it and confirms like a system notice. */
export function installContact(core: IslandCore): void {
  core.on('action', (action) => {
    if (action !== 'contact') return;
    // The trigger button lives in the menu view this call hides; blur it first so the island
    // doesn't see a later, browser-forced blur (relatedTarget null) as focus leaving the island
    // and close what we just opened (mirrors the blur-before-hide in the 'copy' handler below).
    (document.activeElement as HTMLElement | null)?.blur?.();
    core.state.menu = true;
    core.state.contact = true;
    core.resolve();
  });

  core.on('copy', async (text) => {
    let ok = true;
    try {
      await navigator.clipboard.writeText(String(text));
    } catch {
      ok = false;
    }
    core.dom.setCopied(ok);
    core.state.menu = false;
    core.state.contact = false;
    (document.activeElement as HTMLElement | null)?.blur?.();
    core.flash('copied', 1500);
  });
}
