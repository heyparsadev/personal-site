import type { IslandCore } from '../core';

/** Contact opens inside the island; tapping the email copies it and confirms like a system notice. */
export function installContact(core: IslandCore): void {
  core.on('action', (action) => {
    if (action !== 'contact') return;
    core.state.menu = true;
    core.state.contact = true;
    core.resolve();
    // The trigger button lives in the menu view this call just hid, so move focus into the panel
    // (its view is visible as soon as it is shown). That keeps the keyboard user's place, and focus
    // stays inside the island: menu.ts's focusout doesn't close what we just opened, and its
    // focusin sees `contact` and doesn't reopen the menu.
    core.dom.views.get('contact')?.querySelector<HTMLElement>('.row')?.focus({ preventScroll: true });
  });

  core.on('copy', async (text) => {
    let ok = true;
    try {
      await navigator.clipboard.writeText(String(text));
    } catch {
      ok = false;
    }
    core.dom.setCopied(ok);
    core.dom.announce(ok ? 'Email copied' : 'Copy failed');
    core.state.menu = false;
    core.state.contact = false;
    core.flash('copied', 1500);
    // The row that had focus is hidden now: hand focus back to the nav itself (see menu.ts).
    core.emit('refocus');
  });
}
