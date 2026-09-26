import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const NOTES_DIR = 'content/notes';
export const NOTES_HEADING = '## Notes (not for publishing)';

export function listFiles(dir: string, exts: string[]): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...listFiles(p, exts));
    else if (exts.some((e) => name.endsWith(e))) out.push(p);
  }
  return out;
}

/** Private part of every archived original: everything from the notes heading on, or the whole file if it has none. */
export function readPrivateText(): string {
  return listFiles(NOTES_DIR, ['.md'])
    .map((f) => {
      const text = readFileSync(f, 'utf8');
      const i = text.indexOf(NOTES_HEADING);
      return i >= 0 ? text.slice(i) : text;
    })
    .join('\n');
}

/** Distinctive strings that must never be published: long note lines, grouped figures, percentages. */
export function privateMarkers(privateText: string): string[] {
  const lines = privateText
    .split('\n')
    .map((l) => l.replace(/^[\s>#*\-\d.]+/, '').trim())
    .filter((l) => l.length >= 40);
  const figures = privateText.match(/\b\d{1,3}(?:,\d{3})+\b|\b\d+(?:\.\d+)?%/g) ?? [];
  return [...new Set(['not for publishing', 'Homepage card (short version)', ...lines, ...figures])];
}
