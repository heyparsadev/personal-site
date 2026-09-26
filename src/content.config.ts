import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { GLYPH_NAMES } from './lib/glyphs';

const glyph = z.enum(GLYPH_NAMES);
const tint = z.tuple([z.string(), z.string()]);

const projects = defineCollection({
  loader: glob({ pattern: '*.md', base: './content/projects' }),
  schema: z.object({
    title: z.string(),
    order: z.number(),
    role: z.string(),
    years: z.string(),
    status: z.enum(['now', 'active', 'past']),
    tagline: z.string(),
    summary: z.string().optional(),
    page: z.boolean(),
    url: z.string().optional(),
    glyph,
    tint,
  }),
});

const playground = defineCollection({
  loader: glob({ pattern: '*.md', base: './content/playground' }),
  schema: z.object({
    title: z.string(),
    order: z.number(),
    year: z.number(),
    kind: z.string().optional(),
    url: z.string().optional(),
  }),
});

const home = defineCollection({
  loader: glob({ pattern: 'home.md', base: './content/site' }),
  schema: z.object({
    name: z.tuple([z.string(), z.string()]),
    lines: z.tuple([z.string(), z.string()]),
    greeting: z.string(),
    greetingSub: z.string(),
    building: z.string(),
    playgroundIntro: z.string(),
    previews: z.array(
      z.object({
        key: z.string(),
        text: z.string(),
        title: z.string().optional(),
        meta: z.string().optional(),
        glyph: glyph.optional(),
        tint: tint.optional(),
      }),
    ),
  }),
});

const about = defineCollection({
  loader: glob({ pattern: 'about.md', base: './content/site' }),
  schema: z.object({
    beliefs: z.array(z.object({ title: z.string(), text: z.string() })),
    timeline: z.array(z.object({ year: z.number(), name: z.string() })),
    timelineTail: z.string(),
    stack: z.array(z.object({ label: z.string(), text: z.string() })),
    personality: z.string(),
    links: z.array(z.object({ label: z.string(), handle: z.string(), href: z.string(), copy: z.string().optional() })),
  }),
});

export const collections = { projects, playground, home, about };
