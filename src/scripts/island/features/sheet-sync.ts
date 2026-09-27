import type { IslandCore } from '../core';
import type { GlyphName, Tint } from '../../../lib/glyphs';

interface SheetDetail {
  id: string;
  title: string;
  glyph: GlyphName;
  tint: Tint;
}

/** While a sheet is open the island shows it, and tapping the island closes it. */
export function installSheetSync(core: IslandCore): void {
  document.addEventListener('island:sheet', (e) => {
    const d = (e as CustomEvent<SheetDetail | null>).detail;
    if (d) {
      core.dom.setSheet(d.title, d.glyph, d.tint);
      core.state.sheet = d.id;
      core.state.menu = false;
      core.state.contact = false;
      core.state.word = null;
      core.emit('lit', null);
    } else {
      core.state.sheet = null;
    }
    core.resolve(true);
  });
  core.on('action', (action) => {
    if (action === 'close-sheet') document.dispatchEvent(new CustomEvent('sheet:close'));
  });
}
