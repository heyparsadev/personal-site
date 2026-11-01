import { describe, it, expect } from 'vitest';
import { cardLine, firstSentence, lineHtml } from '../../src/lib/playground-card';

describe('firstSentence', () => {
  it('stops at the first full stop', () => {
    expect(firstSentence('A clock that refuses to behave like one. A planet hangs in the dark.')).toBe('A clock that refuses to behave like one.');
  });

  it('reads through a decimal point', () => {
    expect(firstSentence('A single page that turns your scrollbar into 3.8 billion years. You start as one glowing dot.'))
      .toBe('A single page that turns your scrollbar into 3.8 billion years.');
  });

  it('stops at a question mark', () => {
    expect(firstSentence('Can you imagine Sisyphus happy? Each day it asks.')).toBe('Can you imagine Sisyphus happy?');
  });

  it('keeps emphasis that closes after the full stop', () => {
    expect(firstSentence('*Time, kept at a distance.* No streaks.')).toBe('*Time, kept at a distance.*');
  });

  it('reads only the first paragraph, as one line', () => {
    expect(firstSentence('One line\nwraps here. Then more.\n\nA second paragraph.')).toBe('One line wraps here.');
  });

  it('returns the whole paragraph when nothing ends it', () => {
    expect(firstSentence('  No full stop here\n')).toBe('No full stop here');
  });
});

describe('cardLine', () => {
  it("prefers the entry's own summary", () => {
    expect(cardLine('A benchmark for Persian.', 'A benchmark for Persian: 544 items. More.')).toBe('A benchmark for Persian.');
  });

  it('falls back to the opening sentence', () => {
    expect(cardLine(undefined, 'My career as a river, seen from a satellite. The river is grown in code.')).toBe('My career as a river, seen from a satellite.');
  });
});

describe('lineHtml', () => {
  it('turns *emphasis* into <em> and curls apostrophes, as the rendered description does', () => {
    expect(lineHtml("A focus timer built on Camus's *The Myth of Sisyphus*, drawn like a vase."))
      .toBe('A focus timer built on Camus’s <em>The Myth of Sisyphus</em>, drawn like a vase.');
  });

  it('escapes markup', () => {
    expect(lineHtml('Fish & <b>chips</b>')).toBe('Fish &amp; &lt;b&gt;chips&lt;/b&gt;');
  });
});
