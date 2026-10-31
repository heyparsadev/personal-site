import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { load } from 'js-yaml';
import { listFiles } from '../helpers/private-markers';
import { PLAYGROUND_STYLES, stageSchema } from '../../src/lib/playground-stage';

/** The YAML between a markdown file's first two `---` lines. */
function frontmatter(file: string): Record<string, any> {
  const [, yaml] = readFileSync(file, 'utf8').split(/^---\s*$/m);
  return load(yaml) as Record<string, any>;
}

const entries = listFiles('content/playground', ['.md']).map((file) => ({
  id: file.split('/').pop()!.replace(/\.md$/, ''),
  fm: frontmatter(file),
}));

describe('playground stage blocks', () => {
  it('every stage block validates', () => {
    expect(entries).toHaveLength(8);
    for (const { id, fm } of entries) {
      const parsed = stageSchema.safeParse(fm.stage);
      expect(parsed.success, `${id}: ${parsed.success ? '' : JSON.stringify(parsed.error.issues)}`).toBe(true);
    }
  });

  it('each project uses its scene', () => {
    const scenes = Object.fromEntries(entries.map(({ id, fm }) => [id, fm.stage.scene]));
    expect(scenes).toEqual({
      bargasht: 'archive', applybot: 'agent-run', apsis: 'planet', 'the-descent': 'tree',
      delta: 'river', sisyphus: 'push', 'persian-llm-eval': 'leaderboard', 'claude-code-plugins': 'plugins',
    });
  });

  it('labels with commas survive the YAML', () => {
    const byId = Object.fromEntries(entries.map(({ id, fm }) => [id, fm]));
    expect(byId['claude-code-plugins'].stage.stat.label).toBe('Plugins, learned by building');
    expect(byId.delta.stage.legend[0]).toEqual({ key: '%#', text: 'a project, running' });
  });

  it("the leaderboard holds the README's 17 runs", () => {
    const { runs } = entries.find((e) => e.id === 'persian-llm-eval')!.fm.stage.params;
    expect(runs).toHaveLength(17);
    expect(runs[0]).toEqual(['gpt-5.5 + thinking (high)', 0.9702, 0.9197, 0.945]);
    for (const [, ...scores] of runs) for (const s of scores) expect(s >= 0 && s <= 1, String(s)).toBe(true);
  });

  it('an unknown scene is rejected', () => {
    const valid = entries.find((e) => e.id === 'delta')!.fm.stage;
    expect(stageSchema.safeParse(valid).success).toBe(true);
    expect(stageSchema.safeParse({ ...valid, scene: 'riverr' }).success).toBe(false);
  });

  it('home picks the stage style', () => {
    const home = frontmatter('content/site/home.md');
    expect(home.playgroundStyle).toBe('stage');
    expect(PLAYGROUND_STYLES).toContain(home.playgroundStyle);
  });
});
