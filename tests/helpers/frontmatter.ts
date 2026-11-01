import { readFileSync } from 'node:fs';
import { load } from 'js-yaml';
import { listFiles } from './private-markers';

/** The YAML between a markdown file's first two `---` lines. */
export function frontmatter(file: string): Record<string, any> {
  const [, yaml] = readFileSync(file, 'utf8').split(/^---\s*$/m);
  return load(yaml) as Record<string, any>;
}

/** The Markdown after a file's frontmatter. */
export function body(file: string): string {
  return readFileSync(file, 'utf8').split(/^---\s*$/m).slice(2).join('---').trim();
}

/** Every Playground entry, by file name, with its frontmatter and its description. */
export function playgroundEntries(): { id: string; fm: Record<string, any>; body: string }[] {
  return listFiles('content/playground', ['.md']).map((file) => ({
    id: file.split('/').pop()!.replace(/\.md$/, ''),
    fm: frontmatter(file),
    body: body(file),
  }));
}
