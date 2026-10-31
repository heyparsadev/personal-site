// Picks a project's drawing from its content. Params were validated at build time (src/lib/playground-stage.ts),
// so the client trusts them; an unknown scene still falls back to drawing the title.
import type { Scene } from '../engine';
import { agentRun, type AgentRunParams } from './agent-run';
import { archive, type ArchiveParams } from './archive';
import { leaderboard, type LeaderboardParams } from './leaderboard';
import { name } from './name';
import { planet } from './planet';
import { plugins, type PluginsParams } from './plugins';
import { push, type PushParams } from './push';
import { river, type RiverParams } from './river';
import { tree, type TreeParams } from './tree';

/** What each stage element carries in its data-stage attribute. */
export interface StagePayload {
  scene: string;
  params: Record<string, unknown>;
  title: string;
  year: number;
}

const SCENES: Record<string, (p: StagePayload) => Scene> = {
  archive: (p) => archive(p.params as unknown as ArchiveParams),
  'agent-run': (p) => agentRun(p.params as unknown as AgentRunParams),
  planet: () => planet(),
  tree: (p) => tree(p.params as unknown as TreeParams),
  river: (p) => river(p.params as unknown as RiverParams),
  push: (p) => push(p.params as unknown as PushParams),
  leaderboard: (p) => leaderboard(p.params as unknown as LeaderboardParams),
  plugins: (p) => plugins(p.params as unknown as PluginsParams),
  name: (p) => name({ title: p.title }),
};

export function sceneFor(p: StagePayload): Scene {
  return (SCENES[p.scene] ?? SCENES.name)(p);
}
