import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { NOTES_DIR, listFiles, privateMarkers, readPrivateText } from '../helpers/private-markers';

describe('built site', () => {
  it('exists', () => {
    expect(existsSync('dist/index.html')).toBe(true);
  });

  it.skipIf(!existsSync(NOTES_DIR))('contains no private notes or figures', () => {
    const markers = privateMarkers(readPrivateText());
    const files = listFiles('dist', ['.html', '.js', '.css', '.json', '.txt', '.xml']);
    expect(files.length).toBeGreaterThan(3);
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      // Name the marker by its index, never its text: the message lands in terminal logs and transcripts.
      for (const [i, m] of markers.entries()) expect(text.includes(m), `${file} leaks private marker #${i}`).toBe(false);
    }
  });
});
