import { z } from 'astro/zod';

/** The drawings a Playground project can have on its stage. `name` is the fallback: the title in glyphs. */
export const SCENE_IDS = ['archive', 'agent-run', 'planet', 'tree', 'river', 'push', 'leaderboard', 'plugins', 'name'] as const;
export type SceneId = (typeof SCENE_IDS)[number];

/** `cards` renders the Monoglyph band as cards that open sheets; `stage` is the same band with a full row per
 *  project; `list` brings back the plain list (src/components/Playground.astro). */
export const PLAYGROUND_STYLES = ['cards', 'stage', 'list'] as const;

const shared = {
  /** The big number beside the description. `sub` is what a screen reader hears instead of the animated value. */
  stat: z.object({ label: z.string(), value: z.string(), sub: z.string().optional() }),
  /** The bottom HUD's key: glyphs and what they stand for. `dim` keys are drawn at label strength. */
  legend: z.array(z.object({ key: z.string(), text: z.string(), dim: z.boolean().optional() })),
  /** The bottom HUD's right-hand caption. */
  range: z.string(),
};

const branch = <S extends SceneId, P extends z.ZodType>(scene: S, params: P) =>
  z.object({ scene: z.literal(scene), ...shared, params });

const empty = z.object({}).default({});
const channel = z.object({
  name: z.string(),
  from: z.number(),
  to: z.number().optional(),
  fate: z.enum(['oxbow', 'main', 'dries', 'braids']),
});

/** A Playground entry's `stage` block. Scene code only draws; every number and word comes from here. */
export const stageSchema = z.discriminatedUnion('scene', [
  branch('archive', z.object({ kinds: z.array(z.object({ glyph: z.string(), name: z.string() })).length(5) })),
  branch(
    'agent-run',
    z.object({ lanes: z.array(z.string()).min(1), never: z.string() })
      .refine((p) => p.lanes.includes(p.never), { message: 'never must be one of the lanes' }),
  ),
  branch('planet', empty),
  branch('tree', z.object({ years: z.number().positive() })),
  branch('river', z.object({ sea: z.number(), channels: z.array(channel).min(1) })),
  branch('push', z.object({ push: z.number().positive(), roll: z.number().positive(), rest: z.number().positive() })),
  branch(
    'leaderboard',
    z.object({
      low: z.number(),
      high: z.number(),
      interval: z.number().positive(),
      runs: z.array(z.tuple([z.string(), z.number(), z.number(), z.number()])).min(1),
    }),
  ),
  branch('plugins', z.object({ venture: z.number().int(), validator: z.number().int(), glass: z.number().int() })),
  branch('name', empty),
]);

export type StageConfig = z.infer<typeof stageSchema>;

/** An entry's stage; a project without a stage block of its own draws its title, with its year as the stat. */
export function stageOf(data: { stage?: StageConfig; year: number }): StageConfig {
  return data.stage ?? {
    scene: 'name',
    params: {},
    stat: { label: 'Year', value: String(data.year) },
    legend: [{ key: '@%', text: 'its name' }],
    range: '',
  };
}
