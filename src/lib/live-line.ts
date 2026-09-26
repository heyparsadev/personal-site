export type LiveSegment = { kind: 'text'; text: string } | { kind: 'word'; text: string; key: string };

const WORD = /\[([^\]]+)\]\(([a-z0-9-]+)\)/g;

/** Parses hero lines written as "Founder & CEO of [Sibkade](sibkade)." into text and live-word segments. */
export function parseLiveLine(line: string): LiveSegment[] {
  const out: LiveSegment[] = [];
  let last = 0;
  for (const m of line.matchAll(WORD)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ kind: 'text', text: line.slice(last, at) });
    out.push({ kind: 'word', text: m[1], key: m[2] });
    last = at + m[0].length;
  }
  if (last < line.length) out.push({ kind: 'text', text: line.slice(last) });
  return out;
}
