import { readFileSync } from 'node:fs';
import { load } from 'js-yaml';
import { listFiles } from './private-markers';

/** The YAML between a markdown file's first two `---` lines. */
export function frontmatter(file: string): Record<string, any> {
  const [, yaml] = readFileSync(file, 'utf8').split(/^---\s*$/m);
  return load(yaml) as Record<string, any>;
}

/** Every Playground entry, by file name, with its frontmatter. */
export function playgroundEntries(): { id: string; fm: Record<string, any> }[] {
  return listFiles('content/playground', ['.md']).map((file) => ({
    id: file.split('/').pop()!.replace(/\.md$/, ''),
    fm: frontmatter(file),
  }));
}
