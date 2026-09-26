import { describe, it, expect } from 'vitest';
import { parseLiveLine } from '../../src/lib/live-line';

describe('parseLiveLine', () => {
  it('splits text and [Word](key) segments', () => {
    expect(parseLiveLine('Founder & CEO of [Sibkade](sibkade). Now building [Barayand](barayand).')).toEqual([
      { kind: 'text', text: 'Founder & CEO of ' },
      { kind: 'word', text: 'Sibkade', key: 'sibkade' },
      { kind: 'text', text: '. Now building ' },
      { kind: 'word', text: 'Barayand', key: 'barayand' },
      { kind: 'text', text: '.' },
    ]);
  });
  it('handles a line that starts with a word and plain lines', () => {
    expect(parseLiveLine('[Startup](startup) × x')[0]).toEqual({ kind: 'word', text: 'Startup', key: 'startup' });
    expect(parseLiveLine('plain')).toEqual([{ kind: 'text', text: 'plain' }]);
  });
});
