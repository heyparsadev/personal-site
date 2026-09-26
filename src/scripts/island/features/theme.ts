import type { IslandCore } from '../core';
import { applyTheme, currentTheme, flipTheme, saveTheme } from '../../theme';

export function installThemeToggle(core: IslandCore): void {
  core.on('action', (action) => {
    if (action !== 'theme') return;
    const next = flipTheme(currentTheme());
    applyTheme(next);
    saveTheme(next);
    core.emit('theme', next);
  });
}
