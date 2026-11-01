// What a Playground card says (playgroundStyle: cards): one line, in Parsa's own words. The full description opens
// in the project's sheet.

/** The opening sentence of a Markdown body: its first paragraph up to the first . ! or ? that a space or the end
 *  follows, so "3.8 billion" reads through. Emphasis closing right after the stop stays with the sentence. */
export function firstSentence(markdown: string): string {
  const paragraph = markdown.trim().split(/\n\s*\n/)[0].replace(/\s+/g, ' ');
  return paragraph.match(/^.*?[.!?][*_]*(?=\s|$)/)?.[0] ?? paragraph;
}

/** The entry's own summary when it has one (for a first sentence too long for a card), else its first sentence. */
export function cardLine(summary: string | undefined, body: string): string {
  return summary ?? firstSentence(body);
}

/** A card line as HTML, the way the rendered description shows it: *emphasis* in <em>, apostrophes curled. */
export function lineHtml(line: string): string {
  return line
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/(\w)'(\w)/g, '$1’$2')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}
