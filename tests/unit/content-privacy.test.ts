import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { NOTES_DIR, listFiles, privateMarkers, readPrivateText } from '../helpers/private-markers';

const PUBLISHED = ['content/projects', 'content/playground', 'content/site'];
const EXPECTED = [
  'content/projects/barayand.md', 'content/projects/sibkade.md', 'content/projects/helpfinity.md', 'content/projects/iranspoti.md',
  'content/site/home.md', 'content/site/about.md',
];

describe('published content', () => {
  it('exists in the new structure', () => {
    for (const f of EXPECTED) expect(existsSync(f), f).toBe(true);
    expect(listFiles('content/playground', ['.md'])).toHaveLength(7);
  });

  it.skipIf(!existsSync(NOTES_DIR))('contains no private notes or figures', () => {
    const markers = privateMarkers(readPrivateText());
    expect(markers.length).toBeGreaterThan(5);
    for (const file of PUBLISHED.flatMap((d) => listFiles(d, ['.md']))) {
      const text = readFileSync(file, 'utf8');
      // Name the marker by its index, never its text: the message lands in terminal logs and transcripts.
      for (const [i, m] of markers.entries()) expect(text.includes(m), `${file} leaks private marker #${i}`).toBe(false);
    }
  });
});
