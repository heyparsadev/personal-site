# heyparsa.com Portfolio v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the heyparsa.com portfolio as a static Astro 7 site whose Dynamic Island is the signature and the site-wide navigation. The island persists across page navigations and morphs with springs.

**Architecture:**
- **Pages:** Astro 7 static output. Content comes from Markdown in `content/` through content collections. `<ClientRouter />` does client-side navigation.
- **Island markup:** rendered once by `Island.astro` and kept alive with `transition:persist="island"`.
- **Island behaviour:** plain TypeScript modules, split in two:
  - pure logic, unit-tested with Vitest: spring, view resolver, scroll maths, title motion;
  - a small runtime core that "features" plug into: title, intro, menu, words, sections, contact, theme, router, sheet sync.
- **Page context:** each page ships a JSON block (`#page-ctx`) inside `<main>`. It swaps with the page, and the island reads it after every navigation.

**Tech Stack:** Astro 7.3, TypeScript 6, Vitest 5, Playwright 1.63 (Chromium + WebKit), no UI framework, no CSS framework, no web fonts.

**Spec:** `docs/superpowers/specs/2026-09-26-portfolio-site-design.md`
**Reference prototype:** `docs/prototypes/island-hero.html`. Open it in a browser. It shows the island's intended feel; the plan's island code is a structured port of it.

## Global Constraints

- Node ≥ 22.12 (the machine has 22.19). Astro `^7.3.5`, Vitest `^5.0.2`, `@playwright/test` `^1.63.0`, `typescript` `^6` (TS 7 is not supported by `@astrojs/check`).
- Static output only. Nothing host-specific (no Netlify/Vercel config files). `dist/` must work on Vercel and behind plain nginx/Caddy.
- English only. System font stack only (`-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Inter, system-ui, sans-serif`).
- **Typography only:** no images, screenshots or logos.
- **Privacy:** `content/notes/` is git-ignored and must never be imported, rendered, or copied into any committed file (including this plan and tests). Tests read it at runtime only.
- **Copy:** publishable text is copied verbatim from the original content files. Only structure changes (frontmatter + body).
- **No stat blocks or charts.** Numbers stay inside sentences.
- **Astro 7 uses a Rust compiler that does not repair invalid HTML nesting.** Never put block elements (`div`, `p`, `section`, `ul`) inside `<p>`, or `<a>` inside `<a>`.
- Island motion constants (copied from the spec):
  - size and radius springs: response 0.5 / damping 0.72;
  - press 0.96;
  - split-dot spring: 0.55 / 0.66, dot gap about 10 px;
  - absorb range 0.42 × viewport height, absorb at ≥ 0.92, release below 0.85;
  - section line at 28 % of the viewport;
  - view crossfade: out 120 ms; in 280 ms after an 80 ms delay; blur 4 px.
- Reduced motion: critically damped springs, no blur, no gulp, no lean.
- Every commit message ends with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Commit on the current branch after each task. Never push.

## File Structure

```
package.json, package-lock.json          scripts + deps
astro.config.mjs                         site URL, dev toolbar off
tsconfig.json                            astro strict preset
vitest.config.ts                         unit + build tests
playwright.config.ts                     e2e against `astro preview` on :4329
.claude/launch.json                      dev server for the desktop app's browser pane
public/favicon.svg                       island-shaped favicon

content/                                 (Task 2) single source of text
  projects/*.md                          barayand, sibkade, helpfinity, iranspoti
  playground/*.md                        7 weekend projects
  site/home.md, site/about.md            hero, island previews, about, links
  notes/                                 private originals (git-ignored, never loaded)

src/content.config.ts                    collections: projects, playground, home, about
src/lib/glyphs.ts                        island glyph SVGs + GLYPH_NAMES
src/lib/live-line.ts                     "[Word](key)" hero-line parser
src/lib/page-ctx.ts                      PageCtx types + builders + parse/normalize helpers
src/styles/tokens.css, global.css        colour/type tokens, base styles, page-transition keyframes
src/scripts/theme.ts                     theme helpers (pure + apply/persist)
src/layouts/Base.astro                   html shell, theme boot, ClientRouter, skip link, island, overlay slot
src/components/Hero.astro, WorkSection.astro, WorkCard.astro, Playground.astro,
               About.astro, Contact.astro, NextProject.astro, PageCtx.astro,
               ProjectSheet.astro, Island.astro
src/pages/index.astro, [slug].astro, 404.astro

src/scripts/island/spring.ts             pure spring + springEasing()
src/scripts/island/resolve.ts            pure state → view
src/scripts/island/scroll.ts             pure scroll maths
src/scripts/island/title-motion.ts       pure title transform
src/scripts/island/dom.ts                IslandDom: DOM reads/writes for the island
src/scripts/island/core.ts               IslandCore: state, springs, rAF loop, hooks, event bus
src/scripts/island/features/*.ts         title, intro, menu, words, sections, contact, theme, router, sheet-sync
src/scripts/island/index.ts              bootstrap (imported once by Island.astro)
src/scripts/sheet.ts                     HelpFinity / IranSpoti sheets (FLIP, inert, focus, hash)

tests/unit/*.test.ts                     Vitest (pure modules + content privacy)
tests/build/privacy-dist.test.ts         Vitest over dist/ after a build
tests/e2e/*.spec.ts                      Playwright
README.md                                run, build, deploy notes
```

---

### Task 1: Scaffold Astro, Vitest and Playwright

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `src/pages/index.astro`, `tests/e2e/smoke.spec.ts`
- Modify: `.claude/launch.json` (replace the prototype server with the Astro dev server)

**Interfaces:**
- Produces:
  - npm scripts: `dev`, `build`, `preview`, `check`, `test` (unit), `test:build`, `test:e2e`;
  - the e2e server on port 4329;
  - the dev server on port 4321.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "heyparsa",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "test": "vitest run tests/unit",
    "test:build": "astro build && vitest run tests/build",
    "test:e2e": "playwright test"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:
```bash
npm install astro@^7.3.5
npm install -D vitest@^5.0.2 @playwright/test@^1.63.0 @astrojs/check@^0.9.10 typescript@^6
npx playwright install chromium webkit
```
Expected: installs finish without errors. `node -p "require('astro/package.json').version"` prints `7.3.x`.

- [ ] **Step 3: Write the configs**

`astro.config.mjs`:
```js
// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://heyparsa.com',
  devToolbar: { enabled: false },
});
```

`tsconfig.json`:
```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "docs"]
}
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/build/**/*.test.ts'],
    environment: 'node',
    passWithNoTests: true,
  },
});
```

`playwright.config.ts`:
```ts
import { defineConfig, devices } from '@playwright/test';

const PORT = 4329;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  webServer: {
    command: `npm run build && npx astro preview --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

`.claude/launch.json` (replace the whole file):
```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "site", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev"], "port": 4321 }
  ]
}
```

- [ ] **Step 4: Write the failing smoke test**

`tests/e2e/smoke.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('home responds with the site title', async ({ page }) => {
  const res = await page.goto('/');
  expect(res?.status()).toBe(200);
  await expect(page).toHaveTitle(/Parsa Kharazmian/);
});
```

Run: `npm run test:e2e`
Expected: FAIL. The build fails or `/` returns 404 because no page exists yet.

- [ ] **Step 5: Add a temporary home page**

`src/pages/index.astro` (replaced in Task 3):
```astro
---
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Parsa Kharazmian</title>
  </head>
  <body>
    <h1>Parsa Kharazmian.</h1>
  </body>
</html>
```

- [ ] **Step 6: Verify everything runs**

Run: `npm run build && npm test && npm run test:e2e && npx astro check`
Expected:
- build completes;
- `vitest` reports no test files and exits 0;
- Playwright reports `2 passed` (chromium, webkit);
- `astro check` reports `0 errors`.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json astro.config.mjs tsconfig.json vitest.config.ts playwright.config.ts src tests .claude/launch.json
git commit -m "Scaffold Astro 7 with Vitest and Playwright

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Restructure content into collections, with a privacy guard

The original `content/*.md` files mix publishable text with private notes. They move, untouched, into `content/notes/` (git-ignored). New structured files hold only the publishable text, copied verbatim. A privacy test reads `content/notes/` at runtime and fails if any private line or figure shows up in published content. The test file itself contains no private data.

**Files:**
- Move: `content/*.md` → `content/notes/` (all seven originals, unchanged)
- Create: `src/lib/glyphs.ts`, `src/content.config.ts`, `tests/helpers/private-markers.ts`, `tests/unit/content-privacy.test.ts`, `tests/unit/glyphs.test.ts`
- Create: `content/projects/{barayand,sibkade,helpfinity,iranspoti}.md`
- Create: `content/playground/{bargasht,applybot,apsis,the-descent,sisyphus,persian-llm-eval,claude-code-plugins}.md`
- Create: `content/site/home.md`, `content/site/about.md`

**Interfaces:**
- Produces:
  - `GLYPH_NAMES`, `GlyphName`, `glyphSvg(name)`, `tintBackground(tint)` from `src/lib/glyphs.ts`;
  - collections `projects`, `playground`, `home` (entry id `home`), `about` (entry id `about`) with the schemas below;
  - `privateMarkers(text)` and `readPrivateText()` from `tests/helpers/private-markers.ts`.

- [ ] **Step 1: Write the privacy helper and failing tests**

`tests/helpers/private-markers.ts`:
```ts
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const NOTES_DIR = 'content/notes';
export const NOTES_HEADING = '## Notes (not for publishing)';

export function listFiles(dir: string, exts: string[]): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...listFiles(p, exts));
    else if (exts.some((e) => name.endsWith(e))) out.push(p);
  }
  return out;
}

/** Private part of every archived original: everything from the notes heading on, or the whole file if it has none. */
export function readPrivateText(): string {
  return listFiles(NOTES_DIR, ['.md'])
    .map((f) => {
      const text = readFileSync(f, 'utf8');
      const i = text.indexOf(NOTES_HEADING);
      return i >= 0 ? text.slice(i) : text;
    })
    .join('\n');
}

/** Distinctive strings that must never be published: long note lines, grouped figures, percentages. */
export function privateMarkers(privateText: string): string[] {
  const lines = privateText
    .split('\n')
    .map((l) => l.replace(/^[\s>#*\-\d.]+/, '').trim())
    .filter((l) => l.length >= 40);
  const figures = privateText.match(/\b\d{1,3}(?:,\d{3})+\b|\b\d+(?:\.\d+)?%/g) ?? [];
  return [...new Set(['not for publishing', 'Homepage card (short version)', ...lines, ...figures])];
}
```

`tests/unit/content-privacy.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { NOTES_DIR, listFiles, privateMarkers, readPrivateText } from '../helpers/private-markers';

const PUBLISHED = ['content/projects', 'content/playground', 'content/site'];
const EXPECTED = [
  'content/projects/barayand.md', 'content/projects/sibkade.md', 'content/projects/helpfinity.md', 'content/projects/iranspoti.md',
  'content/site/home.md', 'content/site/about.md',
];

describe('published content', () => {
  it('exists in the new structure', () => {
    for (const f of EXPECTED) expect(existsSync(f), f).toBe(true);
    expect(listFiles('content/playground', ['.md'])).toHaveLength(7);
  });

  it.skipIf(!existsSync(NOTES_DIR))('contains no private notes or figures', () => {
    const markers = privateMarkers(readPrivateText());
    expect(markers.length).toBeGreaterThan(5);
    for (const file of PUBLISHED.flatMap((d) => listFiles(d, ['.md']))) {
      const text = readFileSync(file, 'utf8');
      for (const m of markers) expect(text.includes(m), `${file} leaks: ${m.slice(0, 60)}`).toBe(false);
    }
  });
});
```

`tests/unit/glyphs.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { GLYPH_NAMES, glyphSvg, tintBackground } from '../../src/lib/glyphs';

describe('glyphs', () => {
  it('renders an svg for every glyph name', () => {
    for (const g of GLYPH_NAMES) {
      const svg = glyphSvg(g);
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg).toContain('viewBox="0 0 24 24"');
    }
  });
  it('builds a two-stop gradient', () => {
    expect(tintBackground(['#000', '#fff'])).toBe('linear-gradient(140deg, #000, #fff)');
  });
});
```

Run: `npm test`
Expected: FAIL. The content files don't exist, and `src/lib/glyphs` cannot be resolved.

- [ ] **Step 2: Archive the originals as private notes**

Run:
```bash
mkdir -p content/notes && mv content/*.md content/notes/ && ls content/notes && git status --short content
```
Expected:
- `content/notes` lists `about-notes.md about.md barayand.md helpfinity.md iranspoti.md playground.md sibkade.md`;
- `git status` shows nothing under `content/notes` (ignored by `.gitignore`).

- [ ] **Step 3: Create `src/lib/glyphs.ts`**

```ts
export const GLYPH_NAMES = ['resultant', 'gift', 'psi', 'bag', 'trend', 'code', 'home', 'alert'] as const;
export type GlyphName = (typeof GLYPH_NAMES)[number];
export type Tint = readonly [string, string];

const PATHS: Record<GlyphName, string> = {
  resultant: '<path d="M5 19 9 9.5" opacity=".5"/><path d="M5 19l9.5-3" opacity=".5"/><path d="M5 19 18 6"/><path d="M11 6h7v7"/>',
  gift: '<rect x="3.5" y="7.5" width="17" height="4" rx="1"/><rect x="5" y="11.5" width="14" height="9" rx="1.5"/><path d="M12 7.5v13"/><path d="M12 7.5c-1.4-3-4.8-3.3-4.8-1.2 0 1.2 2.2 1.2 4.8 1.2zm0 0c1.4-3 4.8-3.3 4.8-1.2 0 1.2-2.2 1.2-4.8 1.2z"/>',
  psi: '<text x="12" y="17.6" text-anchor="middle" font-size="17" font-weight="500" fill="currentColor" stroke="none">Ψ</text>',
  bag: '<path d="M6 8.5h12l-1 11.5H7L6 8.5z"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/>',
  trend: '<path d="M4 17l6-6 4 4 6-7"/><path d="M15 8h5v5"/>',
  code: '<path d="M9 7l-5 5 5 5M15 7l5 5-5 5"/>',
  home: '<path d="M4 11.5 12 5l8 6.5"/><path d="M6.5 10v9h11v-9"/>',
  alert: '<circle cx="12" cy="12" r="8"/><path d="M12 8v5"/><path d="M12 16.2v.3"/>',
};

export function glyphSvg(name: GlyphName): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PATHS[name]}</svg>`;
}

export function tintBackground(tint: Tint): string {
  return `linear-gradient(140deg, ${tint[0]}, ${tint[1]})`;
}
```

- [ ] **Step 4: Create the project files (text verbatim from the originals)**

`content/projects/barayand.md`:
```md
---
title: Barayand
order: 1
role: Founder
years: 2026 – present
status: now
tagline: One question, a panel of frontier models, one answer you can measure.
summary: A multi-model AI platform. One question goes to a panel of frontier models; a judge maps their agreement and disagreement; a synthesizer writes one answer with a confidence score. Built and shipped solo in summer 2026.
page: true
url: https://barayand.io
glyph: resultant
tint: ["#0a84ff", "#5e5ce6"]
---

## The idea

*Barayand* is the Persian word for a resultant: the single vector you get when several forces are added together. That is the product. Instead of trusting one model, you send a question to a panel of the world's leading models at once. A judge model reads all the answers and extracts where they agree, where they diverge, what only one of them noticed, and what all of them missed. A synthesizer then writes one grounded answer, with an agreement score attached, so you can see how much to trust it.

The idea came from a simple observation: every model is confidently wrong sometimes, and no single one is right all the time. Disagreement between models is not noise. It is signal, and Barayand turns it into a product.

> Disagreement between models is not noise. It is signal, and Barayand turns it into a product.

## What shipped

I started building it in June 2026 and shipped it the same summer as a Persian-first platform: chat with any model, image generation, long-term memory, web and deep research, gift subscriptions, local pricing, and phone login. Two assistants sit on top of it. **Hambonyan** (هم‌بنیان) turns a business idea into a workspace, runs the playbooks for customers, market, competitors, and unit economics, and ends with a board review where a panel of models argues against the idea before it gets a verdict. **Hamfekr** (هم‌فکر) guides a research project from question to defense, keeping the writing in the author's hands.

## The benchmark

Alongside the product, I published an open, reproducible benchmark for Persian: 300 questions across 10 axes, deterministic scoring with bootstrap confidence intervals, and reference results from the leading models. The Persian-speaking world needed a shared yardstick, so I built one.

I designed and built Barayand alone, from the brand mark to the billing.
```

`content/projects/sibkade.md`:
```md
---
title: Sibkade
order: 2
role: Founder & CEO
years: 2020 – present
status: active
tagline: Building a gift-card business around customer experience.
summary: A digital gift-card and subscription business I started alone at twenty and still run today. Instant delivery, a team built around the customer, and core systems I designed and built myself.
page: true
glyph: gift
tint: ["#ffb340", "#ff7a00"]
---

Sibkade is a digital gift-card and subscription business serving customers in Iran. I founded it in 2020 and have led it from the first website and the first ads through building a team and developing the systems behind the business.

## Getting the business started

In 2020 I built the website and handled everything myself. I ran the Google Ads that brought in the first customers while managing the day-to-day operation. That gave me a close view of the whole journey, from the first ad someone saw to the questions they asked after buying.

As orders passed ten thousand a year, I hired and trained a team. My responsibilities grew with it, and I stayed in the decisions about the product and the customer's experience.

## Making the experience worth recommending

We were the first in our market to deliver gift cards instantly, so customers receive their codes without waiting for someone to process each order by hand. If a paid instant-delivery order misses its window, the fee is refunded in full. Loyal customers get a VIP tier with their own support line.

The result is the growth channel we never paid for. Nearly one in two customers come back, and three in ten order three times or more. Most of the rest arrive because someone they trust recommended us. That is the standard I wanted: an experience people are comfortable putting their own name behind.

> An experience people are comfortable putting their own name behind.

## Staying close to the product

In 2026, after six years inside the business, I designed and built the core systems myself: twelve production systems in eleven weeks, about 41,000 lines of code and 15,000 lines of tests, all live.

Each one answers a practical question a customer asks. *Where is my code?* Automated code fulfillment. *How much do I still need to pay?* Wallet payments that show the split clearly. *How do I get back into my account?* Phone-first login and passkeys, after the data showed almost no customer ever used a password. *When can I expect a reply?* A support desk inside the customer's account, with an honest estimate.

Behind fulfillment, I also built the tools for tracking stock, spotting shortages, and allocating codes when inventory is replenished. These are the less visible parts of making a delivery promise work.

## Giving the team better support tools

The helpdesk is built around how our agents actually work: customer history, internal notes, follow-up reminders, mentions, and feedback on individual replies. The aim was enough context to continue any conversation, and a way to review the quality of support without reading every ticket.

I integrated AI into that workflow. It helps draft and refine replies using product-specific guidance, and turns recurring questions into proposed knowledge-base entries for managers to review. Staff see suggestions before anything is sent. A separately controlled option can answer automatically, only from approved knowledge.

## Understanding the business as it grows

I built the customer-intelligence and reporting tools that bring purchase history, customer segments, churn risk, and product-level profit into the daily operation. I also built first-party tracking for sign-in, checkout, and payment, because off-the-shelf analytics recorded zero purchases on our stack. Now those parts of the journey can be measured, not guessed.
```

`content/projects/helpfinity.md`:
```md
---
title: HelpFinity
order: 3
role: Founder
years: 2023 – 2025
status: past
tagline: Could software notice the patterns in how you think?
page: false
glyph: psi
tint: ["#bf5af2", "#5e5ce6"]
---

HelpFinity started from a question I kept running into with my background in psychology: people can name cognitive distortions in other people's thinking, and almost never in their own. The idea was an app that reads what you write and points out the CBT patterns inside it, with journaling, breathing exercises, and short audio alongside.

The timing mattered. OpenAI had just opened its API to system prompts and then launched the first Assistants API, where you could give a model a role, a description, and tools. It was one of the earliest ways to build something like an agent, and combining it with a fixed taxonomy of thinking patterns was the first product I designed around a language model. I took it as far as a prototype and a plan; it did not become a company.

**Coda, 2026.** As a tribute to that idea, I rebuilt its core as a small Persian Telegram bot called Mind Mirror. You write the thought that bothered you. It names up to three patterns, quoting your own words, offers a more balanced reading, and asks one question back. Over time it shows which patterns repeat and where. It is deliberately not therapy: no diagnosis, a crisis screen that runs before anything reaches the model, and hard limits on what it will discuss. Fifty people are using it in a private launch. This is a side project, not a venture, and I keep it that way.
```

`content/projects/iranspoti.md`:
```md
---
title: IranSpoti
order: 4
role: Founder
years: 2019 – 2020
status: past
tagline: The first draft of Sibkade.
page: false
glyph: bag
tint: ["#34c759", "#30b0c7"]
---

IranSpoti was a small gift-card business that lived entirely on Instagram. It lasted about a year, and that year was a year of trial and error: I taught myself WordPress, ran my first digital ads with people in the gift-card space, and learned how much a real website, search, and Google Ads mattered compared to a feed.

It never became a company. It became the plan for one. Almost everything Sibkade got right in its first year, IranSpoti got wrong first.
```

- [ ] **Step 5: Create the playground files (text verbatim from the originals)**

`content/playground/bargasht.md`:
```md
---
title: Bargasht
order: 1
year: 2026
kind: live
url: https://bargasht.barayand.io
---

A personal archive that eats everything you save and gives it back when it matters. Reels, podcasts, screenshots, book pages, voice notes: it transcribes, summarizes, and files them, then resurfaces the right one on your phone when you are likely to want it. Built on the bet that people do not pay to search their own saves; they pay to be reminded. I use it every day.
```

`content/playground/applybot.md`:
```md
---
title: ApplyBot
order: 2
year: 2026
---

A Persian Telegram agent for students applying to graduate programs abroad. It interviews you, researches real programs on the live web, reads the official admissions pages, and writes a tailored CV and statement of purpose. It never submits anything for you. My first end-to-end agent with tools, memory, and a budget.
```

`content/playground/apsis.md`:
```md
---
title: Apsis
order: 3
year: 2026
kind: iOS
---

A clock that refuses to behave like one. A planet hangs in the dark, the time floats above it, and the day runs at that world's real length: a Martian day is 37 minutes longer than ours. Tilt the phone and the planet lags behind, as if it had mass. No account, no notifications, no streaks. *Time, kept at a distance.*
```

`content/playground/the-descent.md`:
```md
---
title: The Descent
order: 4
year: 2026
kind: web
---

A single page that turns your scrollbar into 3.8 billion years. You start as one glowing dot. As you scroll, the branches of the tree of life merge into yours, one by one, until everything converges on the last universal common ancestor. Then the camera pulls back and you are one lit tip among millions. No libraries, no build step.
```

`content/playground/sisyphus.md`:
```md
---
title: Sisyphus
order: 5
year: 2026
kind: web
url: https://sisyphustimer.site
---

A focus timer built on Camus's *The Myth of Sisyphus*, drawn like a Greek black-figure vase. You name a task and a length of time, and Sisyphus pushes a boulder up a mountain with no summit. When the time runs out, the boulder rolls back down, and your break is the walk down after it: the only time you hear from Camus. Give up halfway and the boulder rolls back over your task and shatters it. Each day it asks one question before the first push: can you imagine Sisyphus happy?
```

`content/playground/persian-llm-eval.md`:
```md
---
title: Persian LLM Eval
order: 6
year: 2026
kind: open source
url: https://github.com/heyparsadev/persian-llm-eval
---

A benchmark for how well language models actually handle Persian: 300 items across 10 tracks, from reading and culture to hard math and strict instruction following, with deterministic scoring and bootstrap confidence intervals. I built it because I wanted a Persian yardstick to exist, and nothing did. The result I did not expect: on strict instruction following, the biggest and most expensive model lost to a smaller one.
```

`content/playground/claude-code-plugins.md`:
```md
---
title: Claude Code plugins
order: 7
year: 2026
kind: open source
url: https://github.com/heyparsadev/claude-plugins
---

I learned Claude Code by building the things I needed from it. *Venture* is a business copilot: market, competitors, customer discovery, unit economics, go-to-market, all feeding one shared workspace and ending in a board review. *Idea Validator* turns the idea chapter of Anthropic's Founder's Playbook into a ten-stage pipeline with kill criteria written first, evidence graded by its source, and one wall it refuses to cross: it will not fake customer interviews. *Liquid Glass* teaches Claude Apple's iOS 26 design language, with the API, the guidelines, and nine working screens.
```

- [ ] **Step 6: Create the site files**

`content/site/home.md`:
```md
---
name: ["Parsa", "Kharazmian."]
lines:
  - "Founder & CEO of [Sibkade](sibkade). Now building [Barayand](barayand)."
  - "[Startup](startup) × [Tech](tech) × [Psychology](psychology). Six years in, still early."
greeting: "Hi, I’m Parsa."
greetingSub: Welcome to heyparsa.com
building: Barayand
playgroundIntro: Things I build on weekends, for the fun of it. None of these are companies. All of them are finished.
previews:
  - key: sibkade
    text: A gift-card business built around customer experience.
  - key: barayand
    text: One question, a panel of models, one answer.
  - key: startup
    title: Startup
    meta: Founder since 2020
    text: Started Sibkade alone at twenty. Still running it.
    glyph: trend
    tint: ["#ff9f0a", "#ff375f"]
  - key: tech
    title: Tech
    meta: Next.js · Postgres · SwiftUI · agents
    text: Twelve production systems in eleven weeks, all live.
    glyph: code
    tint: ["#30d158", "#0a84ff"]
  - key: psychology
    title: Psychology
    meta: Trained as a psychologist
    text: My psychology bot’s best feature is what it refuses to do.
    glyph: psi
    tint: ["#bf5af2", "#5e5ce6"]
---
```

`content/site/about.md`:
```md
---
beliefs:
  - title: Disagreement between models is signal.
    text: Barayand sends one question to a panel of frontier models and writes one answer, with the confidence attached.
  - title: Restraint builds trust.
    text: My psychology bot’s best feature is what it refuses to do. So is my clock app’s.
  - title: Measure it, or you don’t know it.
    text: There was no Persian benchmark, so I built one. The most expensive model came out worse on one track.
timeline:
  - { year: 2019, name: IranSpoti }
  - { year: 2020, name: Sibkade }
  - { year: 2023, name: HelpFinity }
  - { year: 2026, name: Barayand }
timelineTail: and the weekend projects
stack:
  - { label: Product, text: "customer experience, brand and design systems, motion." }
  - { label: Web, text: "PHP and WordPress (twelve production plugins for Sibkade), TypeScript and Next.js with Postgres and Redis (Barayand), Python with FastAPI and Svelte (Bargasht), plain HTML, CSS and JavaScript when nothing else is needed." }
  - { label: Apple, text: "SwiftUI, Apple HIG, Liquid Glass." }
  - { label: AI, text: "multi-model orchestration, agents with tool use, LLM evaluation and benchmarking, model selection by measured cost and quality, Claude Code plugins and skills." }
  - { label: Data, text: "SQL, first-party analytics, RFM and churn modeling." }
  - { label: Growth, text: "Google Ads, referral-driven growth, SMS and Telegram as channels." }
  - { label: Pair, text: "Claude Code, daily." }
personality: Reads Camus. Thinks Apple is the best company on earth.
links:
  - { label: X, handle: "@parsakzn", href: "https://x.com/parsakzn" }
  - { label: Telegram, handle: "@parsa_notes", href: "https://t.me/parsa_notes" }
  - { label: GitHub, handle: heyparsadev, href: "https://github.com/heyparsadev" }
  - { label: Email, handle: me@heyparsa.com, href: "mailto:me@heyparsa.com", copy: me@heyparsa.com }
---

I'm Parsa. I run Sibkade, a digital gift-card business I started in 2020, and I'm building Barayand, a multi-model AI platform for Persian speakers. I trained as a psychologist and write about AI in Persian most days.
```

- [ ] **Step 7: Create `src/content.config.ts`**

```ts
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
```

- [ ] **Step 8: Verify**

Run: `npx astro sync && npm test`
Expected:
- `astro sync` completes with no schema errors;
- Vitest shows `content-privacy.test.ts` (2 passed) and `glyphs.test.ts` (2 passed).

If `contains no private notes or figures` fails, the message names the file and the leaked text. Remove it from the published file. Never delete it from `content/notes/`.

- [ ] **Step 9: Commit (never add `content/notes`)**

```bash
git add content/projects content/playground content/site src/lib/glyphs.ts src/content.config.ts tests/helpers tests/unit
git status --short | grep -q "content/notes" && echo "STOP: notes staged" || true
git commit -m "Structure content into collections and guard private notes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Design tokens, theme, and the Base layout

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/global.css`, `src/scripts/theme.ts`, `src/layouts/Base.astro`, `public/favicon.svg`, `tests/unit/theme.test.ts`, `tests/e2e/theme.spec.ts`
- Modify: `src/pages/index.astro` (use `Base`; replaced again in Task 4)

**Interfaces:**
- Produces:
  - CSS custom properties: `--bg --bg-2 --card --text --text-2 --text-3 --line --accent --lw-line --lw-bg --now-bg --now-fg --backdrop --island-fx --glow-alpha --font-sans --ease-out --wrap`;
  - classes: `.wrap`, `.visually-hidden`, `.skip-link`, `.js` (on `<html>`), `.landed` (on `<main>`, added by the island in Task 8), `.island-ready` / `.island-failed` (on `<html>`);
  - attributes: `[data-island-title]` (hidden until the island drops it), `[data-after-title]` (rises after landing);
  - from `src/scripts/theme.ts`: `Theme`, `THEME_KEY = 'heyparsa-theme'`, `resolveTheme(stored, prefersDark)`, `flipTheme(t)`, `currentTheme(root?)`, `applyTheme(t, root?)`, `saveTheme(t)`;
  - `Base.astro` props `{ title: string; description: string }`, with a default slot inside `<main id="content">` and a named slot `overlay` after `<main>`.
- The inline boot script keeps `data-theme`, `color-scheme` and the classes `js`, `island-ready`, `island-failed` across ClientRouter navigations (on `astro:before-swap`).

- [ ] **Step 1: Write the failing unit test**

`tests/unit/theme.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { resolveTheme, flipTheme, applyTheme, currentTheme } from '../../src/scripts/theme';

describe('theme', () => {
  it('prefers a stored choice', () => {
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('light', true)).toBe('light');
  });
  it('falls back to the system setting', () => {
    expect(resolveTheme(null, true)).toBe('dark');
    expect(resolveTheme('bogus', false)).toBe('light');
  });
  it('flips', () => {
    expect(flipTheme('dark')).toBe('light');
    expect(flipTheme('light')).toBe('dark');
  });
  it('applies to a root element', () => {
    const root = { dataset: {} as Record<string, string>, style: {} as Record<string, string> } as unknown as HTMLElement;
    applyTheme('dark', root);
    expect(root.dataset.theme).toBe('dark');
    expect(root.style.colorScheme).toBe('dark');
    expect(currentTheme(root)).toBe('dark');
  });
});
```

Run: `npm test`
Expected: FAIL, `src/scripts/theme` not found.

- [ ] **Step 2: Implement `src/scripts/theme.ts`**

```ts
export type Theme = 'light' | 'dark';
export const THEME_KEY = 'heyparsa-theme';

export function resolveTheme(stored: string | null, prefersDark: boolean): Theme {
  if (stored === 'light' || stored === 'dark') return stored;
  return prefersDark ? 'dark' : 'light';
}

export function flipTheme(t: Theme): Theme {
  return t === 'dark' ? 'light' : 'dark';
}

export function currentTheme(root: HTMLElement = document.documentElement): Theme {
  return root.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function applyTheme(t: Theme, root: HTMLElement = document.documentElement): void {
  root.dataset.theme = t;
  root.style.colorScheme = t;
}

export function saveTheme(t: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    /* storage blocked (private mode): the choice lasts for this page only */
  }
}
```

Run: `npm test`
Expected: PASS (`theme.test.ts` 4 passed, plus the Task 2 tests).

- [ ] **Step 3: Write the styles**

`src/styles/tokens.css`:
```css
:root {
  --font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Inter, system-ui, sans-serif;
  --ease-out: cubic-bezier(.22, 1, .36, 1);
  --wrap: min(1080px, 88vw);
  --bg: #fbfbfd; --bg-2: #f5f5f7; --card: #fff;
  --text: #1d1d1f; --text-2: #515154; --text-3: #6e6e73;
  --line: rgba(0, 0, 0, .08); --accent: #0066cc;
  --lw-line: rgba(0, 0, 0, .3); --lw-bg: rgba(0, 102, 204, .08);
  --now-bg: rgba(52, 199, 89, .14); --now-fg: #248a3d;
  --backdrop: rgba(0, 0, 0, .28);
  --island-fx: url(#isl-goo) drop-shadow(0 10px 22px rgba(0, 0, 0, .16));
  --glow-alpha: .13;
  color-scheme: light;
}
:root[data-theme="dark"] {
  --bg: #000; --bg-2: #0b0b0c; --card: #161617;
  --text: #f5f5f7; --text-2: #a1a1a6; --text-3: #8e8e93;
  --line: rgba(255, 255, 255, .1); --accent: #2997ff;
  --lw-line: rgba(255, 255, 255, .34); --lw-bg: rgba(41, 151, 255, .15);
  --now-bg: rgba(48, 209, 88, .16); --now-fg: #30d158;
  --backdrop: rgba(0, 0, 0, .6);
  --island-fx: url(#isl-goo) drop-shadow(0 0 1px rgba(255, 255, 255, .4));
  --glow-alpha: .24;
  color-scheme: dark;
}
```

`src/styles/global.css`:
```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { background: var(--bg); -webkit-text-size-adjust: 100%; overflow-x: clip; }
body {
  font-family: var(--font-sans); color: var(--text); background: var(--bg); line-height: 1.5;
  -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; overflow-x: clip;
  transition: background-color .5s ease, color .5s ease;
}
a { color: inherit; text-decoration: none; }
button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; -webkit-tap-highlight-color: transparent; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 6px; }
.wrap { width: var(--wrap); margin: 0 auto; }
.visually-hidden { position: absolute !important; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.skip-link { position: fixed; z-index: 100; left: 16px; top: -64px; padding: 10px 16px; border-radius: 999px; background: var(--text); color: var(--bg); font-weight: 600; transition: top .2s ease; }
.skip-link:focus { top: 64px; }

/* The island drops each page title in. Until it does, the title and the lines after it wait (JS only). */
.js [data-island-title] { opacity: 0; }
.js [data-after-title] { opacity: 0; transform: translateY(18px); filter: blur(8px); }
.landed [data-after-title] { animation: hp-rise .9s var(--ease-out) forwards; animation-delay: calc(var(--i, 0) * 110ms); }
.island-failed [data-island-title], .island-failed [data-after-title] { opacity: 1 !important; transform: none !important; filter: none !important; animation: none !important; }
@keyframes hp-rise { to { opacity: 1; transform: none; filter: blur(0); } }

/* Page transitions, referenced by transition:animate on <main> */
@keyframes hp-page-out { to { opacity: 0; } }
@keyframes hp-page-rise { from { opacity: 0; transform: translateY(16px); } }
@keyframes hp-page-fall { from { opacity: 0; transform: translateY(-16px); } }

@media (prefers-reduced-motion: reduce) {
  .js [data-after-title] { transform: none; filter: none; }
  .landed [data-after-title] { animation-duration: .01s; }
}
```

`public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><style>rect{fill:#000}@media (prefers-color-scheme:dark){rect{fill:#fff}}</style><rect x="3" y="10" width="26" height="12" rx="6"/></svg>
```

- [ ] **Step 4: Write `src/layouts/Base.astro`**

```astro
---
import { ClientRouter } from 'astro:transitions';
import '../styles/tokens.css';
import '../styles/global.css';

interface Props {
  title: string;
  description: string;
}
const { title, description } = Astro.props;
const canonical = new URL(Astro.url.pathname, Astro.site);
const ease = 'cubic-bezier(.22, 1, .36, 1)';
const out = { name: 'hp-page-out', duration: '180ms', easing: 'ease-in', fillMode: 'both' };
const pageAnim = {
  forwards: { old: out, new: { name: 'hp-page-rise', duration: '460ms', easing: ease, delay: '80ms', fillMode: 'both' } },
  backwards: { old: out, new: { name: 'hp-page-fall', duration: '460ms', easing: ease, delay: '80ms', fillMode: 'both' } },
};
---
<!doctype html>
<html lang="en" transition:animate="none">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={canonical} />
    <meta name="theme-color" content="#fbfbfd" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
    <script is:inline>
      (() => {
        const root = document.documentElement;
        let t = null;
        try { t = localStorage.getItem('heyparsa-theme'); } catch (e) {}
        if (t !== 'light' && t !== 'dark') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.dataset.theme = t;
        root.style.colorScheme = t;
        root.classList.add('js');
        if (window.__hpBoot) return;
        window.__hpBoot = true;
        setTimeout(() => {
          const r = document.documentElement;
          if (!r.classList.contains('island-ready')) r.classList.add('island-failed');
        }, 4000);
        document.addEventListener('astro:before-swap', (e) => {
          const from = document.documentElement, to = e.newDocument.documentElement;
          to.dataset.theme = from.dataset.theme;
          to.style.colorScheme = from.style.colorScheme;
          for (const c of ['js', 'island-ready', 'island-failed']) if (from.classList.contains(c)) to.classList.add(c);
        });
      })();
    </script>
    <ClientRouter />
  </head>
  <body>
    <a class="skip-link" href="#content">Skip to content</a>
    <main id="content" transition:animate={pageAnim}>
      <slot />
    </main>
    <slot name="overlay" />
  </body>
</html>
```

`src/pages/index.astro` (temporary; Task 4 replaces it):
```astro
---
import Base from '../layouts/Base.astro';
---
<Base title="Parsa Kharazmian" description="Founder & CEO of Sibkade. Now building Barayand.">
  <h1>Parsa Kharazmian.</h1>
</Base>
```

- [ ] **Step 5: Write the e2e test**

`tests/e2e/theme.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('uses the light theme by default', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('html')).toHaveClass(/\bjs\b/);
});

test.describe('dark system setting', () => {
  test.use({ colorScheme: 'dark' });
  test('follows it when nothing is stored', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});

test('a stored choice wins over the system setting', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('heyparsa-theme', 'dark'));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('skip link targets the main content', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('a.skip-link')).toHaveAttribute('href', '#content');
  await expect(page.locator('main#content')).toHaveCount(1);
});
```

- [ ] **Step 6: Verify**

Run: `npm test && npm run test:e2e && npx astro check`
Expected:
- unit tests pass;
- Playwright passes smoke and theme specs on both browsers (10 passed);
- `astro check` reports 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src public tests
git commit -m "Add design tokens, theme boot, and Base layout with ClientRouter

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Home page sections from the collections (static)

**Files:**
- Create: `src/lib/live-line.ts`, `src/components/Hero.astro`, `src/components/WorkSection.astro`, `src/components/WorkCard.astro`, `src/components/Playground.astro`, `src/components/About.astro`, `src/components/Contact.astro`, `tests/unit/live-line.test.ts`, `tests/e2e/home.spec.ts`
- Modify: `src/styles/global.css` (append the shared section styles), `src/pages/index.astro` (replace)

**Interfaces:**
- Consumes:
  - collections `projects`, `playground`, `home`, `about` (Task 2);
  - `Base` (Task 3);
  - the `[data-island-title]` and `[data-after-title]` conventions (Task 3).
- Produces these DOM hooks for the island (Tasks 8–11):
  - Hero:
    - `#top` hero section;
    - `h1[data-island-title]`;
    - `[data-scroll-fade]` wrapper around the hero lines;
    - `[data-hero-glow]` element with a CSS `--glow` colour;
    - live words `[data-word="<key>"]`: `<a href="/<slug>">` for projects that have a page, `<button type="button">` otherwise.
  - Section ids: `#work`, `#playground`, `#about`, `#contact`.
  - Work cards: `article.card[data-card="<id>"]`; page cards contain `a.card-link[href="/<id>"]`; sheet cards contain `button[data-sheet-open="<id>"][aria-controls="sheet-<id>"]`.
  - `parseLiveLine(line): LiveSegment[]` from `src/lib/live-line.ts`.

- [ ] **Step 1: Write the failing parser test**

`tests/unit/live-line.test.ts`:
```ts
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
```

Run: `npm test`
Expected: FAIL, module not found.

- [ ] **Step 2: Implement `src/lib/live-line.ts`**

```ts
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
```

Run: `npm test`
Expected: PASS.

- [ ] **Step 3: Append shared section styles to `src/styles/global.css`**

```css
/* Sections */
.sec { position: relative; padding: clamp(96px, 14vh, 160px) 0; background: var(--bg); transition: background-color .5s ease; }
.sec.alt { background: var(--bg-2); }
.sec:last-of-type { min-height: 80vh; padding-bottom: 180px; }
.sec-title { font-size: clamp(44px, 6.4vw, 88px); font-weight: 700; letter-spacing: -.045em; line-height: 1; margin-bottom: clamp(36px, 6vh, 64px); }
.sec-title.big { font-size: clamp(56px, 11vw, 168px); }
.sec-sub { margin: -24px 0 48px; max-width: 40em; font-size: clamp(19px, 1.7vw, 24px); font-weight: 500; letter-spacing: -.015em; color: var(--text-2); }
.now { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; color: var(--now-fg); background: var(--now-bg); }
.now i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
```

- [ ] **Step 4: Create the components**

`src/components/Hero.astro`:
```astro
---
import { parseLiveLine } from '../lib/live-line';

interface Props {
  name: readonly [string, string];
  lines: readonly [string, string];
  /** live-word key → href, for words that have their own page */
  links: Record<string, string>;
}
const { name, lines, links } = Astro.props;
const parsed = lines.map((l) => parseLiveLine(l));
---
<section class="hero" id="top" aria-labelledby="hero-title">
  <div class="hero-glow" data-hero-glow aria-hidden="true"></div>
  <div class="hero-copy">
    <h1 class="hero-name" id="hero-title" data-island-title><span>{name[0]}</span> <span>{name[1]}</span></h1>
    <div class="hero-lines" data-scroll-fade>
      {parsed.map((segs, i) => (
        <p class:list={['hero-line', { dim: i === 1 }]} data-after-title style={`--i:${i}`}>
          {segs.map((s) =>
            s.kind === 'text' ? s.text
            : links[s.key] ? <a class="lw" href={links[s.key]} data-word={s.key}>{s.text}</a>
            : <button class="lw" type="button" data-word={s.key}>{s.text}</button>,
          )}
        </p>
      ))}
    </div>
  </div>
</section>

<style>
  @property --glow { syntax: '<color>'; inherits: false; initial-value: rgba(0, 0, 0, 0); }
  .hero { position: relative; min-height: 100vh; min-height: 100svh; display: grid; place-items: center; overflow: hidden; }
  .hero-glow { position: absolute; left: 50%; top: 46%; width: min(1100px, 120vw); height: 72vh; transform: translate(-50%, -50%); background: radial-gradient(closest-side, var(--glow), rgba(0, 0, 0, 0)); transition: --glow .7s ease; pointer-events: none; }
  .hero-copy { position: relative; text-align: center; padding: 0 5vw 6vh; }
  .hero-name { font-size: clamp(56px, 10.2vw, 172px); font-weight: 700; letter-spacing: -.052em; line-height: .9; will-change: transform, opacity; }
  .hero-name span { display: block; }
  .hero-line { font-size: clamp(17px, 1.75vw, 26px); font-weight: 500; letter-spacing: -.016em; line-height: 1.4; }
  .hero-line:first-child { margin-top: clamp(22px, 3.6vh, 40px); }
  .hero-line.dim { margin-top: 4px; color: var(--text-3); }
  .lw { font: inherit; color: inherit; letter-spacing: inherit; padding: 0 .1em; margin: 0 -.1em; border-radius: .3em; text-decoration: underline dotted var(--lw-line); text-decoration-thickness: 1.5px; text-underline-offset: .24em; transition: color .2s ease, background-color .2s ease, text-decoration-color .2s ease; }
  .lw:hover, .lw.is-lit, .lw:focus-visible { color: var(--accent); background: var(--lw-bg); text-decoration-style: solid; text-decoration-color: currentColor; outline: none; }
</style>
```

`src/components/WorkCard.astro`:
```astro
---
import type { CollectionEntry } from 'astro:content';

interface Props {
  id: string;
  data: CollectionEntry<'projects'>['data'];
}
const { id, data } = Astro.props;
const text = data.summary ?? data.tagline;
---
<article class="card" data-card={id}>
  <header class="card-head">
    <h3 class="card-title">{data.page ? <a class="card-link" href={`/${id}`}>{data.title}</a> : data.title}</h3>
    {data.status === 'now' && <span class="now"><i aria-hidden="true"></i>Now</span>}
  </header>
  <p class="card-meta">{data.role} · {data.years}</p>
  <p class="card-text">{text}</p>
  {data.page ? (
    <span class="card-btn" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
  ) : (
    <button class="card-btn" type="button" data-sheet-open={id} aria-haspopup="dialog" aria-controls={`sheet-${id}`} aria-label={`More about ${data.title}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
    </button>
  )}
</article>

<style>
  .card { position: relative; display: flex; flex-direction: column; min-height: 260px; padding: 32px; border-radius: 28px; background: var(--card); transition: background-color .5s ease, transform .45s var(--ease-out); }
  .card:hover { transform: translateY(-4px); }
  .card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .card-title { font-size: 28px; font-weight: 700; letter-spacing: -.025em; }
  .card-link::after { content: ""; position: absolute; inset: 0; border-radius: inherit; }
  .card-link:focus-visible { outline: none; }
  .card:has(.card-link:focus-visible) { outline: 2px solid var(--accent); outline-offset: 3px; }
  .card-meta { margin-top: 6px; font-size: 14px; font-weight: 500; color: var(--text-3); }
  .card-text { margin-top: auto; padding: 36px 52px 0 0; font-size: 19px; line-height: 1.4; letter-spacing: -.01em; color: var(--text-2); }
  .card-btn { position: absolute; right: 24px; bottom: 24px; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; color: var(--text); background: var(--bg-2); transition: transform .35s var(--ease-out), background-color .2s ease; }
  .card-btn svg { width: 16px; height: 16px; }
  .card:hover .card-btn { transform: scale(1.08); }
  button.card-btn { z-index: 1; }
  button.card-btn:active { transform: scale(.94); }
</style>
```

`src/components/WorkSection.astro`:
```astro
---
import { getCollection } from 'astro:content';
import WorkCard from './WorkCard.astro';

const projects = (await getCollection('projects')).sort((a, b) => a.data.order - b.data.order);
---
<section class="sec alt" id="work" aria-labelledby="work-title">
  <div class="wrap">
    <h2 class="sec-title" id="work-title">Work</h2>
    <div class="cards">
      {projects.map((p) => <WorkCard id={p.id} data={p.data} />)}
    </div>
  </div>
</section>

<style>
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); gap: 20px; }
</style>
```

`src/components/Playground.astro`:
```astro
---
import { getCollection, render } from 'astro:content';

interface Props {
  intro: string;
}
const { intro } = Astro.props;
const items = (await getCollection('playground')).sort((a, b) => a.data.order - b.data.order);
const rendered = await Promise.all(items.map(async (it) => ({ it, Content: (await render(it)).Content })));
---
<section class="sec" id="playground" aria-labelledby="playground-title">
  <div class="wrap">
    <h2 class="sec-title" id="playground-title">Playground</h2>
    <p class="sec-sub">{intro}</p>
    <ul class="plist">
      {rendered.map(({ it, Content }) => (
        <li class="pitem">
          <div class="pitem-head">
            <h3 class="pitem-title">
              {it.data.url ? <a href={it.data.url} target="_blank" rel="noopener">{it.data.title}<span aria-hidden="true"> ↗</span></a> : it.data.title}
            </h3>
            <span class="pitem-meta">{[it.data.year, it.data.kind].filter(Boolean).join(' · ')}</span>
          </div>
          <div class="pitem-body"><Content /></div>
        </li>
      ))}
    </ul>
  </div>
</section>

<style>
  .plist { list-style: none; border-top: 1px solid var(--line); }
  .pitem { display: grid; grid-template-columns: minmax(180px, 280px) 1fr; gap: 12px 40px; padding: 28px 0; border-bottom: 1px solid var(--line); }
  .pitem-title { font-size: 21px; font-weight: 600; letter-spacing: -.018em; }
  .pitem-title a:hover { color: var(--accent); }
  .pitem-meta { display: block; margin-top: 4px; font-size: 13px; font-weight: 500; color: var(--text-3); font-variant-numeric: tabular-nums; }
  .pitem-body { max-width: 62ch; font-size: 17px; line-height: 1.55; color: var(--text-2); }
  @media (max-width: 720px) { .pitem { grid-template-columns: 1fr; } }
</style>
```

`src/components/About.astro`:
```astro
---
import { getEntry, render } from 'astro:content';

const about = await getEntry('about', 'about');
if (!about) throw new Error('content/site/about.md is missing');
const { Content } = await render(about);
const d = about.data;
---
<section class="sec alt" id="about" aria-labelledby="about-title">
  <div class="wrap">
    <h2 class="sec-title" id="about-title">About</h2>
    <div class="lede"><Content /></div>
    <div class="beliefs">
      {d.beliefs.map((b) => (
        <div class="belief">
          <h3>{b.title}</h3>
          <p>{b.text}</p>
        </div>
      ))}
    </div>
    <p class="timeline">
      {d.timeline.map((t, i) => (
        <>
          <strong>{t.year}</strong> {t.name}{i < d.timeline.length - 1 ? ' · ' : ', '}
        </>
      ))}{d.timelineTail}
    </p>
    <div class="stack">
      <h3 class="stack-title">What I ship with</h3>
      <dl>
        {d.stack.map((s) => (
          <div class="stack-row"><dt>{s.label}</dt><dd>{s.text}</dd></div>
        ))}
      </dl>
    </div>
    <p class="personality">{d.personality}</p>
  </div>
</section>

<style>
  .lede :global(p) { max-width: 24em; font-size: clamp(26px, 3.2vw, 44px); font-weight: 600; letter-spacing: -.03em; line-height: 1.16; }
  .beliefs { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); gap: 32px; margin-top: 72px; }
  .belief h3 { font-size: 21px; font-weight: 600; letter-spacing: -.018em; line-height: 1.25; }
  .belief p { margin-top: 10px; font-size: 17px; line-height: 1.5; color: var(--text-2); }
  .timeline { margin-top: 72px; font-size: 19px; color: var(--text-2); }
  .timeline strong { color: var(--text); font-weight: 600; font-variant-numeric: tabular-nums; }
  .stack { margin-top: 56px; }
  .stack-title { font-size: 21px; font-weight: 600; letter-spacing: -.018em; margin-bottom: 16px; }
  .stack-row { display: grid; grid-template-columns: 120px 1fr; gap: 16px; padding: 14px 0; border-top: 1px solid var(--line); }
  .stack-row dt { font-weight: 600; }
  .stack-row dd { color: var(--text-2); line-height: 1.5; }
  .personality { margin-top: 56px; font-size: 19px; font-weight: 500; color: var(--text-3); }
  @media (max-width: 560px) { .stack-row { grid-template-columns: 1fr; gap: 4px; } }
</style>
```

`src/components/Contact.astro`:
```astro
---
import { getEntry } from 'astro:content';

const about = await getEntry('about', 'about');
if (!about) throw new Error('content/site/about.md is missing');
---
<section class="sec" id="contact" aria-labelledby="contact-title">
  <div class="wrap">
    <h2 class="sec-title big" id="contact-title">Say hello.</h2>
    <ul class="links">
      {about.data.links.map((l) => (
        <li>
          <a href={l.href} {...(l.href.startsWith('http') ? { target: '_blank', rel: 'noopener' } : {})}>
            <span class="l-label">{l.label}</span><span class="l-handle">{l.handle}</span>
          </a>
        </li>
      ))}
    </ul>
  </div>
</section>

<style>
  .links { list-style: none; display: flex; flex-wrap: wrap; gap: 12px; }
  .links a { display: inline-flex; align-items: baseline; gap: 10px; padding: 14px 22px; border-radius: 999px; background: var(--card); font-size: 17px; font-weight: 500; transition: background-color .2s ease, color .2s ease, transform .12s ease; }
  .links a:hover { background: var(--accent); color: #fff; }
  .links a:hover .l-handle { color: rgba(255, 255, 255, .8); }
  .links a:active { transform: scale(.97); }
  .l-handle { color: var(--text-3); }
</style>
```

- [ ] **Step 5: Replace `src/pages/index.astro`**

```astro
---
import { getCollection, getEntry } from 'astro:content';
import Base from '../layouts/Base.astro';
import Hero from '../components/Hero.astro';
import WorkSection from '../components/WorkSection.astro';
import Playground from '../components/Playground.astro';
import About from '../components/About.astro';
import Contact from '../components/Contact.astro';

const home = await getEntry('home', 'home');
if (!home) throw new Error('content/site/home.md is missing');
const projects = await getCollection('projects');
const links = Object.fromEntries(projects.filter((p) => p.data.page).map((p) => [p.id, `/${p.id}`]));
---
<Base title="Parsa Kharazmian" description="Founder & CEO of Sibkade. Now building Barayand. Startup × Tech × Psychology.">
  <Hero name={home.data.name} lines={home.data.lines} links={links} />
  <WorkSection />
  <Playground intro={home.data.playgroundIntro} />
  <About />
  <Contact />
</Base>
```

- [ ] **Step 6: Write the e2e test**

`tests/e2e/home.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('hero shows the name and live words', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText(/Parsa\s*Kharazmian\./);
  await expect(page.locator('[data-word]')).toHaveCount(5);
  await expect(page.locator('a[data-word="sibkade"]')).toHaveAttribute('href', '/sibkade');
  await expect(page.locator('a[data-word="barayand"]')).toHaveAttribute('href', '/barayand');
  await expect(page.locator('button[data-word="psychology"]')).toHaveCount(1);
});

test('work lists four projects in order, as pages or sheets', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#work .card-title')).toHaveText(['Barayand', 'Sibkade', 'HelpFinity', 'IranSpoti']);
  await expect(page.locator('#work a.card-link[href="/barayand"]')).toHaveCount(1);
  await expect(page.locator('#work a.card-link[href="/sibkade"]')).toHaveCount(1);
  await expect(page.locator('#work [data-sheet-open]')).toHaveCount(2);
});

test('playground, about and contact render', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#playground .pitem')).toHaveCount(7);
  await expect(page.locator('#about .belief')).toHaveCount(3);
  await expect(page.locator('#about')).toContainText('Reads Camus.');
  await expect(page.locator('#contact a[href="mailto:me@heyparsa.com"]')).toHaveCount(1);
});

test('home has no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(errors).toEqual([]);
});
```

- [ ] **Step 7: Verify**

Run: `npm test && npm run test:e2e && npx astro check`
Expected: all pass, 0 errors. Then look at the page in the browser pane (`npm run dev`, <http://localhost:4321>). The title and hero lines appear after about 4 s (the `island-failed` fallback), because the island arrives in Task 8.

- [ ] **Step 8: Commit**

```bash
git add src tests
git commit -m "Build home sections from content collections

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Project pages, "Next project", and 404 (static)

**Files:**
- Create: `src/styles/prose.css`, `src/pages/[slug].astro`, `src/components/NextProject.astro`, `src/pages/404.astro`, `tests/e2e/pages.spec.ts`

**Interfaces:**
- Consumes: the `projects` collection (entries with `page: true` get a route); `Base`.
- Produces:
  - routes `/barayand` and `/sibkade`;
  - `h1[data-island-title]` and `[data-scroll-fade]` on each project page;
  - chapter `h2` ids from Astro's heading slugs (e.g. `getting-the-business-started`, `the-idea`);
  - `section[data-next]` containing `a[href="/<next>"]`;
  - global `.prose` styles (reused by the sheets in Task 11);
  - a `404.astro` with `h1[data-island-title]`.
- Next-project order cycles through page projects by `order`: Barayand → Sibkade → Barayand.

- [ ] **Step 1: Write the failing e2e test**

`tests/e2e/pages.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('Sibkade page: title, tagline, chapters, pull quote, next', async ({ page }) => {
  await page.goto('/sibkade');
  await expect(page).toHaveTitle('Sibkade · Parsa Kharazmian');
  await expect(page.locator('h1')).toHaveText('Sibkade');
  await expect(page.locator('.p-tagline')).toHaveText('Building a gift-card business around customer experience.');
  await expect(page.locator('.prose h2')).toHaveText([
    'Getting the business started',
    'Making the experience worth recommending',
    'Staying close to the product',
    'Giving the team better support tools',
    'Understanding the business as it grows',
  ]);
  await expect(page.locator('.prose h2').first()).toHaveAttribute('id', 'getting-the-business-started');
  await expect(page.locator('.prose blockquote')).toHaveCount(1);
  await expect(page.locator('[data-next] a')).toHaveAttribute('href', '/barayand');
});

test('Barayand page: three chapters, link out, next is Sibkade', async ({ page }) => {
  await page.goto('/barayand');
  await expect(page.locator('.prose h2')).toHaveText(['The idea', 'What shipped', 'The benchmark']);
  await expect(page.locator('.p-meta a')).toHaveAttribute('href', 'https://barayand.io');
  await expect(page.locator('[data-next] a')).toHaveAttribute('href', '/sibkade');
});

test('HelpFinity and IranSpoti have no pages', async ({ page }) => {
  for (const path of ['/helpfinity', '/iranspoti']) {
    const res = await page.goto(path);
    expect(res?.status()).toBe(404);
    await expect(page.locator('h1')).toHaveText('Page not found.');
  }
});
```

Run: `npm run test:e2e -- pages.spec.ts`
Expected: FAIL (404 for `/sibkade`).

- [ ] **Step 2: Create `src/styles/prose.css`**

```css
.prose { width: min(680px, 88vw); margin: 0 auto; font-size: 21px; line-height: 1.6; letter-spacing: -.01em; color: var(--text-2); }
.prose > * + * { margin-top: 1.1em; }
.prose h2 { margin-top: 2.6em; color: var(--text); font-size: clamp(32px, 4.2vw, 52px); font-weight: 700; letter-spacing: -.035em; line-height: 1.08; scroll-margin-top: 96px; }
.prose > h2:first-child { margin-top: 0; }
.prose h2 + p { margin-top: .8em; }
.prose strong { color: var(--text); font-weight: 600; }
.prose a { color: var(--accent); }
.prose blockquote { margin: 1.6em 0; }
.prose blockquote p { color: var(--text); font-size: clamp(30px, 3.6vw, 46px); font-weight: 600; letter-spacing: -.03em; line-height: 1.15; }
@media (max-width: 560px) { .prose { font-size: 19px; } }
```

- [ ] **Step 3: Create `src/components/NextProject.astro`**

```astro
---
import type { CollectionEntry } from 'astro:content';

interface Props {
  entry: CollectionEntry<'projects'>;
}
const { entry } = Astro.props;
---
<section class="next" data-next aria-labelledby="next-label">
  <a class="next-link" href={`/${entry.id}`}>
    <span class="next-label" id="next-label">Next project</span>
    <span class="next-title">{entry.data.title}</span>
    <span class="next-tagline">{entry.data.tagline}</span>
    <span class="next-arrow" aria-hidden="true">→</span>
  </a>
</section>

<style>
  .next { padding: 0 0 clamp(120px, 18vh, 200px); }
  .next-link { position: relative; display: block; width: var(--wrap); margin: 0 auto; padding: clamp(40px, 7vw, 72px); border-radius: 32px; background: var(--bg-2); transition: background-color .5s ease, transform .45s var(--ease-out); }
  .next-link:hover { transform: translateY(-4px); }
  .next-label { display: block; font-size: 15px; font-weight: 600; color: var(--text-3); }
  .next-title { display: block; margin-top: 10px; font-size: clamp(48px, 8vw, 112px); font-weight: 700; letter-spacing: -.05em; line-height: .95; }
  .next-tagline { display: block; max-width: 30em; margin-top: 16px; font-size: clamp(18px, 1.8vw, 24px); font-weight: 500; color: var(--text-2); }
  .next-arrow { position: absolute; right: clamp(28px, 5vw, 56px); top: clamp(28px, 5vw, 56px); font-size: 28px; transition: transform .35s var(--ease-out); }
  .next-link:hover .next-arrow { transform: translateX(6px); }
</style>
```

- [ ] **Step 4: Create `src/pages/[slug].astro`**

```astro
---
import { getCollection, render, type CollectionEntry } from 'astro:content';
import Base from '../layouts/Base.astro';
import NextProject from '../components/NextProject.astro';
import '../styles/prose.css';

export async function getStaticPaths() {
  const pages = (await getCollection('projects'))
    .filter((p) => p.data.page)
    .sort((a, b) => a.data.order - b.data.order);
  return pages.map((entry, i) => ({
    params: { slug: entry.id },
    props: { entry, next: pages[(i + 1) % pages.length] },
  }));
}

interface Props {
  entry: CollectionEntry<'projects'>;
  next: CollectionEntry<'projects'>;
}
const { entry, next } = Astro.props;
const { Content } = await render(entry);
const d = entry.data;
const host = d.url ? new URL(d.url).hostname : null;
---
<Base title={`${d.title} · Parsa Kharazmian`} description={d.tagline}>
  <article class="project">
    <header class="p-head">
      <h1 class="p-title" data-island-title>{d.title}</h1>
      <div data-scroll-fade>
        <p class="p-tagline" data-after-title style="--i:0">{d.tagline}</p>
        <p class="p-meta" data-after-title style="--i:1">
          <span>{d.role}</span><span aria-hidden="true">&nbsp;·&nbsp;</span><span>{d.years}</span>
          {d.url && host && (
            <>
              <span aria-hidden="true">&nbsp;·&nbsp;</span><a href={d.url} target="_blank" rel="noopener">{host} ↗</a>
            </>
          )}
          {d.status === 'now' && <span class="now"><i aria-hidden="true"></i>Now</span>}
        </p>
      </div>
    </header>
    <div class="prose"><Content /></div>
  </article>
  <NextProject entry={next} />
</Base>

<style>
  .project { padding: clamp(140px, 22vh, 220px) 0 clamp(96px, 14vh, 160px); }
  .p-head { width: var(--wrap); margin: 0 auto clamp(72px, 12vh, 140px); text-align: center; }
  .p-title { font-size: clamp(64px, 13vw, 208px); font-weight: 700; letter-spacing: -.055em; line-height: .9; will-change: transform, opacity; }
  .p-tagline { max-width: 22em; margin: clamp(22px, 3.6vh, 40px) auto 0; font-size: clamp(22px, 2.6vw, 36px); font-weight: 600; letter-spacing: -.025em; line-height: 1.2; }
  .p-meta { margin-top: 20px; font-size: 15px; font-weight: 500; color: var(--text-3); }
  .p-meta a:hover { color: var(--accent); }
  .p-meta .now { margin-left: 12px; vertical-align: 1px; }
</style>
```

- [ ] **Step 5: Create `src/pages/404.astro`**

```astro
---
import Base from '../layouts/Base.astro';
---
<Base title="Page not found · Parsa Kharazmian" description="This page doesn't exist.">
  <section class="nf">
    <h1 class="nf-title" data-island-title>Page not found.</h1>
    <p class="nf-text" data-after-title style="--i:0">The link may be old, or the page has moved.</p>
    <a class="nf-link" href="/" data-after-title style="--i:1">Back to the home page</a>
  </section>
</Base>

<style>
  .nf { min-height: 100vh; min-height: 100svh; display: grid; place-content: center; justify-items: center; gap: 20px; padding: 0 6vw; text-align: center; }
  .nf-title { font-size: clamp(48px, 9vw, 128px); font-weight: 700; letter-spacing: -.05em; line-height: .95; }
  .nf-text { font-size: clamp(18px, 1.8vw, 24px); color: var(--text-2); }
  .nf-link { display: inline-block; padding: 12px 20px; border-radius: 999px; background: var(--bg-2); font-weight: 500; }
  .nf-link:hover { background: var(--accent); color: #fff; }
</style>
```

- [ ] **Step 6: Verify**

Run: `npm run test:e2e && npx astro check`
Expected:
- all e2e tests pass on both browsers;
- `astro check` reports 0 errors;
- `dist/` contains `barayand/index.html`, `sibkade/index.html` and `404.html` (check with `ls dist dist/barayand dist/sibkade`).

- [ ] **Step 7: Commit**

```bash
git add src tests
git commit -m "Add project pages, next-project link, and 404

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Island pure logic: spring, view resolver, scroll maths, title motion

Everything here is pure TypeScript with no DOM, built test-first. Later tasks wire it to the page.

**Files:**
- Create: `src/scripts/island/spring.ts`, `src/scripts/island/resolve.ts`, `src/scripts/island/scroll.ts`, `src/scripts/island/title-motion.ts`
- Test: `tests/unit/spring.test.ts`, `tests/unit/resolve.test.ts`, `tests/unit/scroll.test.ts`, `tests/unit/title-motion.test.ts`

**Interfaces:**
- Produces:
  - `spring.ts`:
    - `class Spring { x; v; t; constructor(x, response = 0.4, damping = 1); tune(response, damping): this; step(dt): number; snap(x): void; get settled(): boolean }`;
    - `springEasing(response, damping, maxSeconds = 2): { easing: string; duration: number }`.
  - `resolve.ts`:
    - types `PageKind = 'home' | 'project' | 'notfound'`, `FlashView = 'copied' | 'jump' | 'opening'`, `IntroStep = 'boot' | 'hello' | 'home' | \`d-${string}\``, `ViewName`;
    - `interface IslandState { kind; intro; flash; sheet; contact; menu; word; absorbed; nearEnd }`;
    - `initialState(kind)`, `resolveView(state)`.
  - `scroll.ts`:
    - constants `ABSORB_RANGE = 0.42`, `ABSORB_ON = 0.92`, `ABSORB_OFF = 0.85`, `SECTION_LINE = 0.28`, `NEAR_END_LINE = 0.75`;
    - helpers `clamp`, `seg`, `lerp`, `smoothstep`;
    - `absorbProgress(y, H)`, `nextAbsorbed(prev, p)`;
    - `type SectionTop = { id: string; label: string; top: number }`;
    - `currentSection(tops, y, H)`, `rollDirection(tops, fromId, toId)`, `isNearEnd(endTop, y, H)`, `pageProgress(y, H, docH)`.
  - `title-motion.ts`:
    - `ISLAND_CENTER_Y = 30`, `TITLE_MIN_SCALE = 0.045`;
    - `type TitleOrigin = { cx: number; cy: number }`, `type TitleFrame = { tx; ty; scale; opacity; blur }`;
    - `titleFrame(e, origin, viewportW, scrollY, reduced = false)`, `titleProgress(introE, absorbE)`.

- [ ] **Step 1: Write the failing tests**

`tests/unit/spring.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { Spring, springEasing } from '../../src/scripts/island/spring';

function run(s: Spring, seconds: number): number {
  let max = -Infinity;
  for (let i = 0; i < seconds * 60; i++) {
    s.step(1 / 60);
    max = Math.max(max, s.x);
  }
  return max;
}

describe('Spring', () => {
  it('settles on its target without overshoot when critically damped', () => {
    const s = new Spring(0, 0.4, 1);
    s.t = 100;
    const max = run(s, 3);
    expect(s.x).toBeCloseTo(100, 2);
    expect(max).toBeLessThanOrEqual(100.001);
    expect(s.settled).toBe(true);
  });
  it('overshoots when underdamped', () => {
    const s = new Spring(0, 0.5, 0.5);
    s.t = 100;
    expect(run(s, 3)).toBeGreaterThan(100);
  });
  it('snap jumps to a value at rest', () => {
    const s = new Spring(0, 0.4, 1);
    s.t = 10;
    s.step(0.1);
    s.snap(5);
    expect([s.x, s.t, s.v]).toEqual([5, 5, 0]);
  });
  it('stays stable through a long frame', () => {
    const s = new Spring(0, 0.2, 0.7);
    s.t = 1;
    s.step(1);
    expect(Number.isFinite(s.x)).toBe(true);
    expect(Math.abs(s.x - 1)).toBeLessThan(0.01);
  });
  it('carries existing velocity, so motion can be interrupted', () => {
    const s = new Spring(0, 0.5, 1);
    s.v = 500;
    s.step(1 / 60);
    expect(s.x).toBeGreaterThan(0);
  });
});

describe('springEasing', () => {
  const values = (e: string) => e.slice('linear('.length, -1).split(', ').map(Number);
  it('produces a CSS linear() curve from 0 to 1', () => {
    const { easing, duration } = springEasing(0.5, 1);
    expect(easing.startsWith('linear(0, ')).toBe(true);
    expect(easing.endsWith(', 1)')).toBe(true);
    expect(duration).toBeGreaterThan(200);
    expect(duration).toBeLessThanOrEqual(2000);
  });
  it('overshoots only when underdamped', () => {
    expect(Math.max(...values(springEasing(0.5, 1).easing))).toBeLessThanOrEqual(1.0001);
    expect(Math.max(...values(springEasing(0.5, 0.7).easing))).toBeGreaterThan(1);
  });
});
```

`tests/unit/resolve.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { initialState, resolveView, type IslandState } from '../../src/scripts/island/resolve';

const s = (over: Partial<IslandState>, kind: IslandState['kind'] = 'home'): IslandState => ({ ...initialState(kind), ...over });

describe('resolveView', () => {
  it('shows each page kind at rest', () => {
    expect(resolveView(s({}))).toBe('home');
    expect(resolveView(s({}, 'project'))).toBe('page');
    expect(resolveView(s({}, 'notfound'))).toBe('notfound');
  });
  it('shows the section once the title is absorbed', () => {
    expect(resolveView(s({ absorbed: true }))).toBe('section');
    expect(resolveView(s({ absorbed: true }, 'project'))).toBe('section');
  });
  it('offers the next project near the end of project pages only', () => {
    expect(resolveView(s({ absorbed: true, nearEnd: true }, 'project'))).toBe('next');
    expect(resolveView(s({ absorbed: true, nearEnd: true }))).toBe('section');
  });
  it('lets intro steps win over resting states', () => {
    expect(resolveView(s({ intro: 'hello', absorbed: true }))).toBe('hello');
    expect(resolveView(s({ intro: 'boot' }, 'project'))).toBe('boot');
  });
  it('previews words on home only, and not once absorbed', () => {
    expect(resolveView(s({ word: 'tech', intro: 'hello' }))).toBe('d-tech');
    expect(resolveView(s({ word: 'tech', absorbed: true }))).toBe('section');
    expect(resolveView(s({ word: 'tech' }, 'project'))).toBe('page');
  });
  it('orders menu, contact, sheet and flash', () => {
    expect(resolveView(s({ menu: true, word: 'tech' }))).toBe('menu-home');
    expect(resolveView(s({ menu: true }, 'project'))).toBe('menu-page');
    expect(resolveView(s({ menu: true }, 'notfound'))).toBe('menu-home');
    expect(resolveView(s({ menu: true, contact: true }))).toBe('contact');
    expect(resolveView(s({ contact: true, sheet: 'helpfinity' }))).toBe('sheet');
    expect(resolveView(s({ sheet: 'helpfinity', flash: 'copied' }))).toBe('copied');
  });
});
```

`tests/unit/scroll.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { absorbProgress, nextAbsorbed, currentSection, rollDirection, isNearEnd, pageProgress, type SectionTop } from '../../src/scripts/island/scroll';

const tops: SectionTop[] = [
  { id: 'work', label: 'Work', top: 1000 },
  { id: 'about', label: 'About', top: 2000 },
];

describe('scroll maths', () => {
  it('absorbProgress eases from 0 to 1 over 42% of the viewport', () => {
    expect(absorbProgress(0, 1000)).toBe(0);
    expect(absorbProgress(210, 1000)).toBeCloseTo(0.5, 5);
    expect(absorbProgress(420, 1000)).toBe(1);
    expect(absorbProgress(5000, 1000)).toBe(1);
  });
  it('nextAbsorbed has hysteresis', () => {
    expect(nextAbsorbed(false, 0.91)).toBe(false);
    expect(nextAbsorbed(false, 0.92)).toBe(true);
    expect(nextAbsorbed(true, 0.86)).toBe(true);
    expect(nextAbsorbed(true, 0.84)).toBe(false);
  });
  it('currentSection switches when a section top passes 28% of the viewport', () => {
    expect(currentSection(tops, 0, 1000)).toBeNull();
    expect(currentSection(tops, 719, 1000)).toBeNull();
    expect(currentSection(tops, 720, 1000)?.id).toBe('work');
    expect(currentSection(tops, 1720, 1000)?.id).toBe('about');
  });
  it('rollDirection follows document order', () => {
    expect(rollDirection(tops, null, 'work')).toBe(1);
    expect(rollDirection(tops, 'about', 'work')).toBe(-1);
    expect(rollDirection(tops, 'work', null)).toBe(-1);
  });
  it('isNearEnd triggers when the end block reaches 75% of the viewport', () => {
    expect(isNearEnd(null, 5000, 1000)).toBe(false);
    expect(isNearEnd(2000, 1249, 1000)).toBe(false);
    expect(isNearEnd(2000, 1250, 1000)).toBe(true);
  });
  it('pageProgress is clamped to 0..1', () => {
    expect(pageProgress(0, 1000, 5000)).toBe(0);
    expect(pageProgress(4000, 1000, 5000)).toBe(1);
    expect(pageProgress(9000, 1000, 5000)).toBe(1);
    expect(pageProgress(10, 1000, 500)).toBe(1);
  });
});
```

`tests/unit/title-motion.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { titleFrame, titleProgress, ISLAND_CENTER_Y, TITLE_MIN_SCALE } from '../../src/scripts/island/title-motion';

const origin = { cx: 400, cy: 500 };

describe('titleFrame', () => {
  it('is the identity at e = 0', () => {
    const f = titleFrame(0, origin, 1000, 0);
    expect(f.tx).toBeCloseTo(0);
    expect(f.ty).toBeCloseTo(0);
    expect(f.scale).toBeCloseTo(1);
    expect(f.opacity).toBe(1);
    expect(f.blur).toBe(0);
  });
  it('lands on the island centre at e = 1, whatever the scroll', () => {
    for (const y of [0, 300]) {
      const f = titleFrame(1, origin, 1000, y);
      expect(origin.cx + f.tx).toBeCloseTo(500);
      expect(origin.cy - y + f.ty).toBeCloseTo(ISLAND_CENTER_Y);
      expect(f.scale).toBeCloseTo(TITLE_MIN_SCALE);
      expect(f.opacity).toBe(0);
      expect(f.blur).toBeCloseTo(5);
    }
  });
  it('drops blur under reduced motion', () => {
    expect(titleFrame(1, origin, 1000, 0, true).blur).toBe(0);
  });
  it('overshoots gently below 0', () => {
    const f = titleFrame(-0.04, origin, 1000, 0);
    expect(f.scale).toBeGreaterThan(1);
    expect(f.scale).toBeLessThan(1.05);
    expect(f.opacity).toBe(1);
  });
});

describe('titleProgress', () => {
  it('uses the intro value at the top and the larger value once scrolling', () => {
    expect(titleProgress(-0.02, 0)).toBe(-0.02);
    expect(titleProgress(0.3, 0.5)).toBe(0.5);
    expect(titleProgress(0.9, 0.5)).toBe(0.9);
  });
});
```

Run: `npm test`
Expected: FAIL (modules not found).

- [ ] **Step 2: Implement `src/scripts/island/spring.ts`**

```ts
/** Apple-style spring. `response` is the period (s) of the undamped oscillation; `damping` is the damping ratio (1 = no overshoot). */
export class Spring {
  x: number;
  v = 0;
  t: number;
  private k = 0;
  private c = 0;

  constructor(x: number, response = 0.4, damping = 1) {
    this.x = x;
    this.t = x;
    this.tune(response, damping);
  }

  tune(response: number, damping: number): this {
    const w = (2 * Math.PI) / response;
    this.k = w * w;
    this.c = 2 * damping * w;
    return this;
  }

  /** Advances by `dt` seconds with semi-implicit Euler in substeps of at most 1/240 s. */
  step(dt: number): number {
    const n = Math.max(1, Math.ceil(dt * 240));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      const a = -this.k * (this.x - this.t) - this.c * this.v;
      this.v += a * h;
      this.x += this.v * h;
    }
    return this.x;
  }

  snap(x: number): void {
    this.x = x;
    this.t = x;
    this.v = 0;
  }

  get settled(): boolean {
    return Math.abs(this.x - this.t) < 1e-3 && Math.abs(this.v) < 1e-3;
  }
}

/** Samples a 0 → 1 spring into a CSS `linear()` easing, for Web Animations that should feel like the island. */
export function springEasing(response: number, damping: number, maxSeconds = 2): { easing: string; duration: number } {
  const s = new Spring(0, response, damping);
  s.t = 1;
  const dt = 1 / 60;
  const pts: number[] = [0];
  let t = 0;
  while (t < maxSeconds) {
    s.step(dt);
    t += dt;
    pts.push(s.x);
    if (Math.abs(s.x - 1) < 0.001 && Math.abs(s.v) < 0.01) break;
  }
  pts[pts.length - 1] = 1;
  return { easing: `linear(${pts.map((p) => +p.toFixed(4)).join(', ')})`, duration: Math.round(t * 1000) };
}
```

- [ ] **Step 3: Implement `src/scripts/island/resolve.ts`**

```ts
export type PageKind = 'home' | 'project' | 'notfound';
export type FlashView = 'copied' | 'jump' | 'opening';
export type IntroStep = 'boot' | 'hello' | 'home' | `d-${string}`;
export type ViewName =
  | 'boot' | 'hello' | 'home' | 'page' | 'notfound' | 'section'
  | 'menu-home' | 'menu-page' | 'contact' | 'next' | 'sheet'
  | FlashView | `d-${string}`;

export interface IslandState {
  kind: PageKind;
  intro: IntroStep | null;
  flash: FlashView | null;
  sheet: string | null;
  contact: boolean;
  menu: boolean;
  word: string | null;
  absorbed: boolean;
  nearEnd: boolean;
}

export function initialState(kind: PageKind): IslandState {
  return { kind, intro: null, flash: null, sheet: null, contact: false, menu: false, word: null, absorbed: false, nearEnd: false };
}

/** Exactly one view wins. Priority, highest first: flash, sheet, contact, menu, word, intro, next, section, page kind. */
export function resolveView(s: IslandState): ViewName {
  if (s.flash) return s.flash;
  if (s.sheet) return 'sheet';
  if (s.contact) return 'contact';
  if (s.menu) return s.kind === 'project' ? 'menu-page' : 'menu-home';
  if (s.word && s.kind === 'home' && !s.absorbed) return `d-${s.word}`;
  if (s.intro) return s.intro;
  if (s.kind === 'project' && s.nearEnd) return 'next';
  if (s.absorbed) return 'section';
  if (s.kind === 'home') return 'home';
  return s.kind === 'project' ? 'page' : 'notfound';
}
```

- [ ] **Step 4: Implement `src/scripts/island/scroll.ts`**

```ts
export const ABSORB_RANGE = 0.42;
export const ABSORB_ON = 0.92;
export const ABSORB_OFF = 0.85;
export const SECTION_LINE = 0.28;
export const NEAR_END_LINE = 0.75;

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a), 0, 1);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (t: number) => t * t * (3 - 2 * t);

/** 0 at the top of the page; 1 once the title should be fully inside the island. */
export function absorbProgress(scrollY: number, viewportH: number): number {
  return smoothstep(seg(scrollY, 0, viewportH * ABSORB_RANGE));
}

/** Hysteresis, so the island doesn't flicker at the threshold. */
export function nextAbsorbed(prev: boolean, progress: number): boolean {
  return prev ? progress >= ABSORB_OFF : progress >= ABSORB_ON;
}

export interface SectionTop {
  id: string;
  label: string;
  top: number;
}

/** The last section whose top has passed SECTION_LINE of the viewport, or null before the first one. */
export function currentSection(tops: SectionTop[], scrollY: number, viewportH: number): SectionTop | null {
  let hit: SectionTop | null = null;
  for (const t of tops) if (t.top - scrollY <= viewportH * SECTION_LINE) hit = t;
  return hit;
}

export function rollDirection(tops: SectionTop[], fromId: string | null, toId: string | null): 1 | -1 {
  const index = (id: string | null) => (id === null ? -1 : tops.findIndex((t) => t.id === id));
  return index(toId) >= index(fromId) ? 1 : -1;
}

/** True once the end block's top is within NEAR_END_LINE of the viewport. */
export function isNearEnd(endTop: number | null, scrollY: number, viewportH: number): boolean {
  return endTop !== null && endTop - scrollY <= viewportH * NEAR_END_LINE;
}

export function pageProgress(scrollY: number, viewportH: number, docH: number): number {
  return clamp(scrollY / Math.max(1, docH - viewportH), 0, 1);
}
```

- [ ] **Step 5: Implement `src/scripts/island/title-motion.ts`**

```ts
import { seg } from './scroll';

export const ISLAND_CENTER_Y = 30;
export const TITLE_MIN_SCALE = 0.045;

/** Title centre in page coordinates, measured with no transform applied. */
export interface TitleOrigin {
  cx: number;
  cy: number;
}

export interface TitleFrame {
  tx: number;
  ty: number;
  scale: number;
  opacity: number;
  blur: number;
}

/** e = 0: the title sits in place. e = 1: it is shrunk into the island's centre. Values below 0 overshoot gently. */
export function titleFrame(e: number, origin: TitleOrigin, viewportW: number, scrollY: number, reduced = false): TitleFrame {
  const tx = (viewportW / 2 - origin.cx) * e;
  const ty = (ISLAND_CENTER_Y - (origin.cy - scrollY)) * (e < 0 ? e * 0.5 : e);
  const scale = e >= 0 ? Math.exp(Math.log(TITLE_MIN_SCALE) * e) : 1 - e * 0.5;
  const opacity = 1 - seg(e, 0.66, 0.94);
  const blur = reduced ? 0 : seg(e, 0.3, 1) * 5;
  return { tx, ty, scale, opacity, blur };
}

/** At the very top the intro spring rules (so it may overshoot); once scrolling, whichever is further in wins. */
export function titleProgress(introE: number, absorbE: number): number {
  return absorbE > 0 ? Math.max(introE, absorbE) : introE;
}
```

- [ ] **Step 6: Verify**

Run: `npm test`
Expected: PASS. All four new test files are green, plus the earlier ones.

- [ ] **Step 7: Commit**

```bash
git add src/scripts/island tests/unit
git commit -m "Add island springs, view resolver, scroll and title maths

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Island markup, page context, and site map

The island is rendered once by `Base.astro` and persisted across navigations. Each page carries its own `#page-ctx` JSON inside `<main>`. The island has no behaviour yet; Task 8 adds it.

**Files:**
- Create: `src/lib/page-ctx.ts`, `src/components/PageCtx.astro`, `src/components/Island.astro`, `tests/unit/page-ctx.test.ts`, `tests/e2e/island-markup.spec.ts`
- Modify: `src/lib/glyphs.ts` (add `hexToRgb`), `tests/unit/glyphs.test.ts`, `src/layouts/Base.astro` (render `<Island />`), `src/pages/index.astro`, `src/pages/[slug].astro`, `src/pages/404.astro` (render `<PageCtx />`)

**Interfaces:**
- Consumes:
  - `GlyphName`, `Tint`, `glyphSvg`, `tintBackground` (Task 2);
  - `PageKind` (Task 6);
  - the collections.
- Produces:
  - `src/lib/page-ctx.ts`:
    - types `SectionRef`, `PageLink`, `PageCtx`, `SiteMap`, `ProjectInfo`;
    - constants `HOME_LINK`, `HOME_SECTIONS`;
    - functions `linkFor(p)`, `homeCtx()`, `projectCtx(p, chapters, next)`, `notFoundCtx()`, `buildSiteMap(pages)`, `normalizePath(pathname)`, `parseCtx(text)`.
  - `hexToRgb(hex): string` (e.g. `"10, 132, 255"`) in `src/lib/glyphs.ts`.
  - Island DOM contract, used by Task 8 onwards:
    - Root `#island[data-island]` (persisted as `island`), containing the SVG filter `#isl-goo`, `[data-goo-pill]`, `[data-goo-dot]`, `nav.isl[data-isl]` (tabindex 0), `button.isl-dot[data-dot]` with `circle[data-prg]`, and `script#site-map` (JSON `SiteMap`).
    - Views are `[data-view="<ViewName>"]`. Fixed-size views carry `--w`/`--h`; measured views carry `data-size="auto"`.
    - Slots `[data-slot="…"]`: `glyph`, `title`, `status`, `section-glyph`, `mp-glyph`, `mp-title`, `mp-list`, `copied`, `jump`, `jump-ico`, `open-glyph`, `open-title`, `next-link`, `next-glyph`, `next-title`, `sheet-glyph`, `sheet-title`.
    - `[data-roll]` holds the rolling label.
    - Actions: `[data-action="contact" | "theme" | "close-sheet"]`, `[data-nav="<section id>"]`, `[data-copy="<text>"]`.
    - Views with a tint carry `data-glow="r, g, b"`.

- [ ] **Step 1: Write the failing unit tests**

`tests/unit/page-ctx.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { normalizePath, parseCtx, projectCtx, homeCtx, buildSiteMap, type ProjectInfo } from '../../src/lib/page-ctx';

const barayand: ProjectInfo = { id: 'barayand', title: 'Barayand', glyph: 'resultant', tint: ['#0a84ff', '#5e5ce6'], status: 'now', years: '2026 – present' };
const sibkade: ProjectInfo = { id: 'sibkade', title: 'Sibkade', glyph: 'gift', tint: ['#ffb340', '#ff7a00'], status: 'active', years: '2020 – present' };

describe('page context', () => {
  it('normalizes paths', () => {
    expect(normalizePath('/')).toBe('/');
    expect(normalizePath('/sibkade/')).toBe('/sibkade');
    expect(normalizePath('/sibkade/index.html')).toBe('/sibkade');
    expect(normalizePath('')).toBe('/');
  });
  it('builds project contexts with a status label and next link', () => {
    const c = projectCtx(barayand, [{ id: 'the-idea', label: 'The idea' }], sibkade);
    expect(c).toMatchObject({ kind: 'project', key: 'barayand', statusLabel: 'Now', next: { href: '/sibkade', title: 'Sibkade' } });
    expect(projectCtx(sibkade, [], barayand).statusLabel).toBe('2020 – present');
  });
  it('builds the home context with its four sections', () => {
    expect(homeCtx().sections.map((s) => s.id)).toEqual(['work', 'playground', 'about', 'contact']);
  });
  it('maps every page path', () => {
    expect(Object.keys(buildSiteMap([barayand, sibkade]))).toEqual(['/', '/barayand', '/sibkade']);
  });
  it('parses valid context JSON and rejects anything else', () => {
    expect(parseCtx(JSON.stringify(homeCtx()))?.key).toBe('home');
    expect(parseCtx('{"kind":1}')).toBeNull();
    expect(parseCtx('not json')).toBeNull();
    expect(parseCtx(null)).toBeNull();
  });
});
```

Append to `tests/unit/glyphs.test.ts` (and add `hexToRgb` to its import list):
```ts
import { hexToRgb } from '../../src/lib/glyphs';

describe('hexToRgb', () => {
  it('converts long and short hex', () => {
    expect(hexToRgb('#0a84ff')).toBe('10, 132, 255');
    expect(hexToRgb('#fff')).toBe('255, 255, 255');
  });
});
```

Run: `npm test`
Expected: FAIL (`page-ctx` missing, `hexToRgb` not exported).

- [ ] **Step 2: Add `hexToRgb` to `src/lib/glyphs.ts`**

```ts
/** "#0a84ff" → "10, 132, 255", for rgba() glows. */
export function hexToRgb(hex: string): string {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}
```

- [ ] **Step 3: Create `src/lib/page-ctx.ts`**

```ts
import type { GlyphName, Tint } from './glyphs';
import type { PageKind } from '../scripts/island/resolve';

export interface SectionRef {
  id: string;
  label: string;
}

export interface PageLink {
  href: string;
  title: string;
  glyph: GlyphName;
  tint: Tint;
}

/** What the island needs to know about the page it is on. Rendered as JSON in #page-ctx inside <main>. */
export interface PageCtx {
  kind: PageKind;
  key: string;
  title: string;
  glyph: GlyphName;
  tint: Tint;
  status?: 'now' | 'active' | 'past';
  statusLabel?: string;
  sections: SectionRef[];
  next?: PageLink;
}

export type SiteMap = Record<string, PageLink>;

export interface ProjectInfo {
  id: string;
  title: string;
  glyph: GlyphName;
  tint: Tint;
  status: 'now' | 'active' | 'past';
  years: string;
}

const NEUTRAL: Tint = ['#8e8e93', '#48484a'];

export const HOME_LINK: PageLink = { href: '/', title: 'Home', glyph: 'home', tint: NEUTRAL };

export const HOME_SECTIONS: SectionRef[] = [
  { id: 'work', label: 'Work' },
  { id: 'playground', label: 'Playground' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
];

export function linkFor(p: ProjectInfo): PageLink {
  return { href: `/${p.id}`, title: p.title, glyph: p.glyph, tint: p.tint };
}

export function homeCtx(): PageCtx {
  return { kind: 'home', key: 'home', title: 'Parsa Kharazmian', glyph: 'home', tint: NEUTRAL, sections: HOME_SECTIONS };
}

export function projectCtx(p: ProjectInfo, chapters: SectionRef[], next: ProjectInfo): PageCtx {
  return {
    kind: 'project',
    key: p.id,
    title: p.title,
    glyph: p.glyph,
    tint: p.tint,
    status: p.status,
    statusLabel: p.status === 'now' ? 'Now' : p.years,
    sections: chapters,
    next: linkFor(next),
  };
}

export function notFoundCtx(): PageCtx {
  return { kind: 'notfound', key: 'notfound', title: 'Page not found', glyph: 'alert', tint: NEUTRAL, sections: [] };
}

/** Pathname → link info for every page, so the island can show where a navigation is heading before it lands. */
export function buildSiteMap(pages: ProjectInfo[]): SiteMap {
  const map: SiteMap = { '/': HOME_LINK };
  for (const p of pages) map[`/${p.id}`] = linkFor(p);
  return map;
}

export function normalizePath(pathname: string): string {
  const p = pathname.replace(/\/index\.html$/, '').replace(/\/+$/, '');
  return p === '' ? '/' : p;
}

export function parseCtx(text: string | null | undefined): PageCtx | null {
  if (!text) return null;
  try {
    const v = JSON.parse(text);
    return v && typeof v.kind === 'string' && typeof v.key === 'string' && Array.isArray(v.sections) ? (v as PageCtx) : null;
  } catch {
    return null;
  }
}
```

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Create `src/components/PageCtx.astro`**

```astro
---
import type { PageCtx } from '../lib/page-ctx';

interface Props {
  ctx: PageCtx;
}
const json = JSON.stringify(Astro.props.ctx).replace(/</g, '\\u003c');
---
<script type="application/json" id="page-ctx" set:html={json}></script>
```

- [ ] **Step 5: Create `src/components/Island.astro`**

```astro
---
import { getCollection, getEntry } from 'astro:content';
import { glyphSvg, tintBackground, hexToRgb, type GlyphName, type Tint } from '../lib/glyphs';
import { buildSiteMap } from '../lib/page-ctx';

const home = await getEntry('home', 'home');
const about = await getEntry('about', 'about');
if (!home || !about) throw new Error('content/site is incomplete');
const projects = (await getCollection('projects')).sort((a, b) => a.data.order - b.data.order);
const byId = new Map(projects.map((p) => [p.id, p.data]));
const building = projects.find((p) => p.data.title === home.data.building)?.data;
if (!building) throw new Error('home.md "building" must match a project title');

interface Preview { key: string; title: string; meta: string; text: string; glyph: GlyphName; tint: Tint; live: boolean }
const previews: Preview[] = home.data.previews.map((pv) => {
  const p = byId.get(pv.key);
  const title = pv.title ?? p?.title;
  const meta = pv.meta ?? (p ? `${p.role} · ${p.years}` : undefined);
  const glyph = pv.glyph ?? p?.glyph;
  const tint = pv.tint ?? p?.tint;
  if (!title || !meta || !glyph || !tint) throw new Error(`Preview "${pv.key}" needs title, meta, glyph and tint`);
  return { key: pv.key, title, meta, text: pv.text, glyph, tint, live: p?.status === 'now' };
});
const siteMap = buildSiteMap(projects.filter((p) => p.data.page).map((p) => ({ id: p.id, ...p.data })));
const siteMapJson = JSON.stringify(siteMap).replace(/</g, '\\u003c');
const bg = (t: Tint) => `background:${tintBackground(t)}`;
const arrow = '<path d="M12 5v14M6 13l6 6 6-6"/>';
---
<div class="isl-wrap" id="island" data-island transition:persist="island" transition:name="island" transition:animate="none">
  <svg class="isl-defs" width="0" height="0" aria-hidden="true" focusable="false">
    <filter id="isl-goo" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b" />
      <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -11" />
    </filter>
  </svg>
  <div class="isl-goo" aria-hidden="true"><i class="goo-pill" data-goo-pill></i><i class="goo-dot" data-goo-dot></i></div>

  <nav class="isl" data-isl aria-label="Site" tabindex="0">
    <div class="iv" data-view="hello" data-glow="94, 92, 230" style="--w:330px;--h:76px">
      <span class="ava lg">PK</span>
      <span class="stack"><strong>{home.data.greeting}</strong><small>{home.data.greetingSub}</small></span>
    </div>

    <div class="iv compact" data-view="home" style="--w:236px;--h:36px">
      <span class="glyph sm" style={bg(building.tint)} set:html={glyphSvg(building.glyph)}></span>
      <span class="grow">Building <strong>{building.title}</strong></span>
      <span class="live" aria-hidden="true"></span>
    </div>

    <div class="iv compact" data-view="page" data-size="auto" style="--h:36px">
      <span class="glyph sm" data-slot="glyph"></span>
      <strong data-slot="title"></strong>
      <span class="status" data-slot="status"></span>
    </div>

    <div class="iv compact" data-view="notfound" data-size="auto" style="--h:40px">
      <span class="glyph sm" style={bg(['#8e8e93', '#48484a'])} set:html={glyphSvg('alert')}></span>
      <strong>Page not found</strong>
      <a class="pill-link" href="/">Home</a>
    </div>

    <div class="iv compact" data-view="section" data-size="auto" style="--h:36px">
      <span class="ava sm" data-slot="section-glyph">PK</span>
      <span class="roll" data-roll></span>
    </div>

    <div class="iv" data-view="menu-home" data-size="auto" style="--h:52px">
      <a class="ava md" href="/#top" data-nav="top" aria-label="Top of the page">PK</a>
      <span class="menu">
        <a href="/#work" data-nav="work">Work</a>
        <a href="/#playground" data-nav="playground">Playground</a>
        <a href="/#about" data-nav="about">About</a>
        <button type="button" data-action="contact">Contact</button>
      </span>
      <button type="button" class="theme-btn" data-action="theme" aria-label="Switch light or dark appearance">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></svg>
      </button>
    </div>

    <div class="iv col" data-view="menu-page" style="--w:320px">
      <div class="mp-head"><span class="glyph sm" data-slot="mp-glyph"></span><strong data-slot="mp-title"></strong></div>
      <span class="iv-h">On this page</span>
      <div class="mp-list" data-slot="mp-list"></div>
      <div class="mp-foot">
        <a href="/" class="mp-home">← Home</a>
        <button type="button" data-action="contact">Contact</button>
        <button type="button" class="theme-btn" data-action="theme" aria-label="Switch light or dark appearance">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></svg>
        </button>
      </div>
    </div>

    <div class="iv col" data-view="contact" style="--w:360px">
      <span class="iv-h">Say hello</span>
      {about.data.links.map((l) =>
        l.copy ? (
          <button class="row" type="button" data-copy={l.copy}>{l.label}<span>{l.handle} · Copy</span></button>
        ) : (
          <a class="row" href={l.href} target="_blank" rel="noopener">{l.label}<span>{l.handle} ↗</span></a>
        ),
      )}
    </div>

    <div class="iv center" data-view="copied" style="--w:188px;--h:40px">
      <span class="ok"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
      <strong data-slot="copied">Email copied</strong>
    </div>

    <div class="iv center" data-view="jump" data-size="auto" style="--h:40px">
      <svg data-slot="jump-ico" class="jump-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" set:html={arrow}></svg>
      <strong data-slot="jump">Work</strong>
    </div>

    <div class="iv compact" data-view="opening" data-size="auto" style="--h:40px">
      <span class="glyph sm" data-slot="open-glyph"></span>
      <strong data-slot="open-title"></strong>
      <span class="spinner" aria-hidden="true"></span>
    </div>

    <div class="iv compact" data-view="next" data-size="auto" style="--h:40px">
      <a class="next-link" data-slot="next-link" href="/">
        <span class="muted">Next</span>
        <span class="glyph sm" data-slot="next-glyph"></span>
        <strong data-slot="next-title"></strong>
        <span aria-hidden="true">→</span>
      </a>
    </div>

    <div class="iv compact" data-view="sheet" data-size="auto" style="--h:40px">
      <span class="glyph sm" data-slot="sheet-glyph"></span>
      <strong data-slot="sheet-title"></strong>
      <button type="button" class="pill-btn" data-action="close-sheet">Close</button>
    </div>

    {previews.map((p) => (
      <div class="iv" data-view={`d-${p.key}`} data-glow={hexToRgb(p.tint[0])} style={`--w:${p.live ? 440 : 420}px;--h:96px`}>
        <span class="glyph app" style={bg(p.tint)} set:html={glyphSvg(p.glyph)}></span>
        <span class="stack"><strong>{p.title}</strong><small>{p.meta}</small><span class="txt">{p.text}</span></span>
        {p.live && <span class="badge"><i class="live"></i>Now</span>}
      </div>
    ))}
  </nav>

  <button class="isl-dot" type="button" data-dot aria-label="Back to top" tabindex="-1">
    <svg viewBox="0 0 36 36" aria-hidden="true"><circle class="trk" cx="18" cy="18" r="11" /><circle class="prg" data-prg cx="18" cy="18" r="11" transform="rotate(-90 18 18)" /><path class="up" d="M18 22.5v-9m-4 4 4-4 4 4" /></svg>
  </button>
  <script type="application/json" id="site-map" set:html={siteMapJson}></script>
</div>

<style is:global>
  .isl-wrap { position: fixed; z-index: 40; top: 12px; left: 50%; width: 0; height: 0; }
  .isl-defs { position: absolute; width: 0; height: 0; }
  .isl-goo { position: absolute; left: -330px; top: -30px; width: 660px; height: 320px; pointer-events: none; filter: var(--island-fx); }
  .goo-pill, .goo-dot { position: absolute; left: 0; top: 0; background: #000; will-change: transform; }
  .goo-pill { width: 36px; height: 36px; border-radius: 18px; transform: translate3d(312px, 30px, 0); }
  .goo-dot { width: 36px; height: 36px; border-radius: 50%; transform: translate3d(312px, 30px, 0) scale(.55); }
  .isl { position: absolute; left: 0; top: 0; width: 36px; height: 36px; border-radius: 18px; overflow: hidden; color: #f5f5f7; cursor: pointer; outline: none; transform: translate3d(-18px, 0, 0); will-change: transform; -webkit-tap-highlight-color: transparent; }
  .isl:focus-visible { box-shadow: 0 0 0 3px rgba(0, 113, 227, .55); }
  .iv { position: absolute; left: 50%; top: 50%; width: min(var(--w, 300px), calc(100vw - 24px)); height: var(--h, auto); display: flex; align-items: center; gap: 10px; padding: 0 16px; font-size: 13px; font-weight: 500; letter-spacing: -.005em; white-space: nowrap; opacity: 0; visibility: hidden; filter: blur(4px); transform: translate(-50%, -50%) scale(.93); transition: opacity .12s ease, filter .12s ease, transform .18s ease, visibility 0s linear .12s; pointer-events: none; }
  .iv[data-size="auto"] { width: max-content; max-width: calc(100vw - 24px); }
  .iv.is-on { opacity: 1; visibility: visible; filter: blur(0); transform: translate(-50%, -50%); transition: opacity .28s ease .08s, filter .28s ease .08s, transform .5s var(--ease-out) .04s, visibility 0s; pointer-events: auto; }
  .iv.center { justify-content: center; }
  .iv.compact { padding: 0 14px 0 7px; }
  .iv strong { font-weight: 600; }
  .iv.col { flex-direction: column; align-items: stretch; justify-content: center; gap: 0; padding: 14px 18px; white-space: normal; }
  .iv-h { font-size: 12px; font-weight: 500; color: #98989d; margin: 2px 0 6px; }
  .stack { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .stack strong { font-size: 15px; letter-spacing: -.012em; }
  .stack small { font-size: 12px; font-weight: 500; color: #98989d; }
  .stack .txt { margin-top: 2px; font-size: 12.5px; line-height: 1.3; color: #d1d1d6; white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .ava { flex: none; display: grid; place-items: center; border-radius: 50%; color: #fff; font-weight: 600; background: linear-gradient(140deg, #5e5ce6, #bf5af2); }
  .ava.lg { width: 46px; height: 46px; font-size: 14px; }
  .ava.md { width: 32px; height: 32px; font-size: 11px; }
  .ava.sm { width: 24px; height: 24px; font-size: 9px; letter-spacing: .02em; }
  .glyph { flex: none; display: grid; place-items: center; color: #fff; }
  .glyph.sm { width: 22px; height: 22px; border-radius: 50%; }
  .glyph.app { width: 46px; height: 46px; border-radius: 13px; align-self: flex-start; margin-top: 23px; }
  .glyph svg { width: 58%; height: 58%; }
  .grow { flex: 1; min-width: 0; }
  .status { color: #98989d; }
  .status.is-now { display: inline-flex; align-items: center; gap: 6px; color: #30d158; }
  .status.is-now::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
  .live { flex: none; width: 8px; height: 8px; border-radius: 50%; background: #30d158; animation: isl-live 1.8s ease-out infinite; }
  @keyframes isl-live { from { box-shadow: 0 0 0 0 rgba(48, 209, 88, .6); } to { box-shadow: 0 0 0 8px rgba(48, 209, 88, 0); } }
  .badge { flex: none; align-self: flex-start; margin-top: 25px; display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 600; color: #30d158; }
  .badge .live { width: 6px; height: 6px; }
  .menu { display: flex; gap: 2px; }
  .menu a, .menu button, .mp-foot a, .mp-foot button, .pill-link, .pill-btn { padding: 7px 12px; border-radius: 999px; font-size: 13.5px; font-weight: 500; color: rgba(255, 255, 255, .86); transition: background-color .15s ease, transform .12s ease; }
  .menu a:hover, .menu button:hover, .mp-foot a:hover, .mp-foot button:hover, .pill-link:hover, .pill-btn:hover { background: rgba(255, 255, 255, .14); }
  .menu .is-here, .mp-list .is-here { background: rgba(255, 255, 255, .2); color: #fff; }
  .isl a:active, .isl button:active { transform: scale(.96); }
  .theme-btn { display: grid; place-items: center; width: 32px; height: 32px; padding: 0; border-radius: 50%; color: rgba(255, 255, 255, .86); }
  .theme-btn:hover { background: rgba(255, 255, 255, .14); }
  .theme-btn svg { width: 17px; height: 17px; }
  .mp-head { display: flex; align-items: center; gap: 10px; padding: 2px 0 10px; font-size: 15px; }
  .mp-list { display: flex; flex-direction: column; gap: 2px; margin: 0 -10px; }
  .mp-list a { padding: 8px 10px; border-radius: 11px; font-size: 14px; color: rgba(255, 255, 255, .9); line-height: 1.25; }
  .mp-list a:hover { background: rgba(255, 255, 255, .1); }
  .mp-foot { display: flex; align-items: center; gap: 2px; margin: 10px -10px 0; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, .12); }
  .mp-foot .theme-btn { margin-left: auto; }
  .row { display: flex; justify-content: space-between; align-items: center; gap: 16px; width: calc(100% + 20px); margin: 0 -10px; padding: 8px 10px; border-radius: 11px; font-size: 14px; font-weight: 500; text-align: left; transition: background-color .15s ease, transform .12s ease; }
  .row span { color: #98989d; }
  .row:hover { background: rgba(255, 255, 255, .1); }
  .ok { flex: none; width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; background: #30d158; color: #000; }
  .ok svg { width: 12px; height: 12px; }
  .jump-ico { width: 14px; height: 14px; transition: transform .3s ease; }
  .spinner { width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(255, 255, 255, .25); border-top-color: #fff; animation: isl-spin .7s linear infinite; }
  @keyframes isl-spin { to { transform: rotate(360deg); } }
  .next-link { display: inline-flex; align-items: center; gap: 8px; color: #f5f5f7; }
  .next-link .muted { color: #98989d; }
  .roll { position: relative; display: block; height: 18px; overflow: hidden; }
  .roll-item { position: absolute; left: 0; top: 0; line-height: 18px; font-size: 13.5px; font-weight: 600; letter-spacing: -.01em; white-space: nowrap; transition: transform .5s var(--ease-out), opacity .3s ease; }
  .isl-dot { position: absolute; left: 0; top: 0; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; opacity: 0; pointer-events: none; will-change: transform, opacity; }
  .isl-dot svg { width: 36px; height: 36px; overflow: visible; }
  .isl-dot .trk { fill: none; stroke: rgba(255, 255, 255, .18); stroke-width: 2.6; }
  .isl-dot .prg { fill: none; stroke: #fff; stroke-width: 2.6; stroke-linecap: round; stroke-dasharray: 69.12; stroke-dashoffset: 69.12; }
  .isl-dot .up { fill: none; stroke: #fff; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; opacity: 0; transition: opacity .2s ease; }
  .isl-dot:hover .up, .isl-dot:focus-visible .up { opacity: 1; }
  @media (max-width: 480px) { .menu a, .menu button { padding: 7px 8px; font-size: 13px; } }
  @media (prefers-reduced-motion: reduce) {
    .iv { filter: none !important; }
    .live, .spinner { animation: none; }
  }
</style>
```

- [ ] **Step 6: Render the island and the page contexts**

In `src/layouts/Base.astro`, add `import Island from '../components/Island.astro';` to the frontmatter, and render the island right after the skip link:
```astro
    <a class="skip-link" href="#content">Skip to content</a>
    <Island />
    <main id="content" transition:animate={pageAnim}>
```

In `src/pages/index.astro`, add `import PageCtx from '../components/PageCtx.astro';` and `import { homeCtx } from '../lib/page-ctx';`, then render `<PageCtx ctx={homeCtx()} />` as the last child inside `<Base>`.

In `src/pages/404.astro`, add the same two kinds of import (`PageCtx`, `notFoundCtx`) and render `<PageCtx ctx={notFoundCtx()} />` as the last child inside `<Base>`.

In `src/pages/[slug].astro`:
- import `PageCtx` and `projectCtx`;
- change `const { Content } = await render(entry);` to `const { Content, headings } = await render(entry);`;
- add:
```ts
const chapters = headings.filter((h) => h.depth === 2).map((h) => ({ id: h.slug, label: h.text }));
const info = (e: CollectionEntry<'projects'>) => ({ id: e.id, ...e.data });
const ctx = projectCtx(info(entry), chapters, info(next));
```
- render `<PageCtx ctx={ctx} />` as the last child inside `<Base>`.

- [ ] **Step 7: Write the e2e test**

`tests/e2e/island-markup.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

const ctxOf = async (page: import('@playwright/test').Page) => JSON.parse((await page.locator('main #page-ctx').textContent()) ?? 'null');

test('every page has the island and a page context', async ({ page }) => {
  for (const [path, kind, key] of [['/', 'home', 'home'], ['/sibkade', 'project', 'sibkade'], ['/nope', 'notfound', 'notfound']] as const) {
    await page.goto(path);
    await expect(page.locator('#island nav.isl')).toHaveCount(1);
    const ctx = await ctxOf(page);
    expect(ctx.kind).toBe(kind);
    expect(ctx.key).toBe(key);
  }
});

test('project context lists chapters and the next project', async ({ page }) => {
  await page.goto('/barayand');
  const ctx = await ctxOf(page);
  expect(ctx.sections.map((s: { id: string }) => s.id)).toEqual(['the-idea', 'what-shipped', 'the-benchmark']);
  expect(ctx.next.href).toBe('/sibkade');
  expect(ctx.statusLabel).toBe('Now');
});

test('site map covers home and the project pages', async ({ page }) => {
  await page.goto('/');
  const map = JSON.parse((await page.locator('#site-map').textContent())!);
  expect(Object.keys(map).sort()).toEqual(['/', '/barayand', '/sibkade']);
});

test('island renders every view', async ({ page }) => {
  await page.goto('/');
  const views = await page.locator('#island [data-view]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.view));
  expect(views).toEqual(expect.arrayContaining([
    'hello', 'home', 'page', 'notfound', 'section', 'menu-home', 'menu-page', 'contact', 'copied', 'jump',
    'opening', 'next', 'sheet', 'd-sibkade', 'd-barayand', 'd-startup', 'd-tech', 'd-psychology',
  ]));
});
```

- [ ] **Step 8: Verify**

Run: `npm test && npm run test:e2e && npx astro check`
Expected: all green, 0 errors. In the dev server, a small black circle sits at the top centre of every page (the island at rest; it has no behaviour yet).

- [ ] **Step 9: Commit**

```bash
git add src tests
git commit -m "Render the persisted island with page contexts and site map

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Island runtime: DOM, core loop, title drop and absorb, intro, menu

The island comes alive:
- the first-visit intro;
- every page title drops out of the island;
- scrolling absorbs the title back in;
- hover, focus or tap opens the menu.

Features plug into a small core, which owns state, springs, the frame loop, hooks and an event bus.

**Files:**
- Create: `src/scripts/island/dom.ts`, `src/scripts/island/core.ts`, `src/scripts/island/features/title.ts`, `src/scripts/island/features/intro.ts`, `src/scripts/island/features/menu.ts`, `src/scripts/island/index.ts`, `tests/e2e/island.spec.ts`
- Modify: `src/components/Island.astro` (load the runtime)

**Interfaces:**
- Consumes:
  - Task 6: `Spring`, `resolveView`, `initialState`, the scroll helpers and `titleFrame` / `titleProgress`;
  - Task 7: the island DOM contract, `parseCtx`, `homeCtx`, `PageCtx`, `PageLink`;
  - Task 3: `.landed` and `.island-ready`.
- Produces:
  - `class IslandDom` with:
    - `root`, `isl`, `current`;
    - `slot(name)`, `show(view)`, `sizeOf(view, maxW)`, `setGlyph(el, glyph, tint)`, `fillPage(ctx)`;
    - `setOpening(link)`, `setNext(link)`, `setSheet(title, glyph, tint)`, `setJump(label, up)`, `setCopied(ok)`;
    - `highlight(id)`, `setLabel(text, dir, animate): boolean`, `render(geometry)`, `setProgress(p)`.
    - `show()` also writes `#island[data-view="<view>"]`; tests read this.
  - `class IslandCore` with:
    - fields `dom`, `reduced`, `state: IslandState`, `ctx: PageCtx`;
    - springs `w h r lean press gulp split`;
    - `onFrame(fn(dt, now))`, `onPage(fn(ctx, first))`, `onInterrupt(fn)`, `interrupt()`;
    - `on(event, fn)`, `emit(event, payload)`;
    - `setPage(ctx, first)`, `resolve(force?)`, `fit()`, `flash(view, ms?)`, `start()`.
  - Core events:
    - `'view'`: payload is the new ViewName;
    - `'lit'`: word key or null;
    - `'action'`: `'contact' | 'theme' | 'close-sheet'`;
    - `'copy'`: text;
    - `'nav'`: `{ id, anchor, event }`;
    - `'close-menu'`: no payload.
  - `installTitle(core): TitleControl` where `TitleControl = { drop(): void; readonly dropped: boolean }`.
  - `installIntro(core, title)` and `installMenu(core)`.
  - Session flag `sessionStorage['heyparsa-intro-seen'] = '1'`.

- [ ] **Step 1: Write the failing e2e test**

`tests/e2e/island.spec.ts`:
```ts
import { test, expect, type Page } from '@playwright/test';

const island = (page: Page) => page.locator('#island');
const skipIntro = (page: Page) => page.addInitScript(() => sessionStorage.setItem('heyparsa-intro-seen', '1'));

test('first visit: hello, the name drops out, two previews, then rest', async ({ page }) => {
  await page.goto('/');
  await expect(island(page)).toHaveAttribute('data-view', 'hello', { timeout: 2000 });
  await expect(page.locator('main')).toHaveClass(/landed/, { timeout: 4000 });
  await expect(page.locator('h1')).toHaveCSS('opacity', '1', { timeout: 4000 });
  await expect(island(page)).toHaveAttribute('data-view', 'd-sibkade', { timeout: 5000 });
  await expect(island(page)).toHaveAttribute('data-view', 'home', { timeout: 6000 });
});

test('the full intro runs once per session', async ({ page }) => {
  await page.goto('/');
  await expect(island(page)).toHaveAttribute('data-view', 'hello');
  await page.reload();
  await expect(island(page)).toHaveAttribute('data-view', 'home', { timeout: 1500 });
  await expect(page.locator('h1')).toHaveCSS('opacity', '1', { timeout: 3000 });
});

test('hovering the island opens the menu, leaving closes it', async ({ page }) => {
  await skipIntro(page);
  await page.goto('/');
  await expect(island(page)).toHaveAttribute('data-view', 'home');
  await page.locator('#island nav.isl').hover();
  await expect(island(page)).toHaveAttribute('data-view', 'menu-home');
  await page.mouse.move(12, 600);
  await expect(island(page)).toHaveAttribute('data-view', 'home');
});

test('scrolling absorbs the title into the island and back out', async ({ page }) => {
  await skipIntro(page);
  await page.goto('/');
  await expect(page.locator('h1')).toHaveCSS('opacity', '1');
  await page.evaluate(() => scrollTo(0, innerHeight * 0.6));
  await expect(island(page)).toHaveAttribute('data-view', 'section');
  await expect(page.locator('h1')).toHaveCSS('opacity', '0');
  await page.evaluate(() => scrollTo(0, 0));
  await expect(island(page)).toHaveAttribute('data-view', 'home');
  await expect(page.locator('h1')).toHaveCSS('opacity', '1');
});

test('landing on a project page drops its title out of the island', async ({ page }) => {
  await page.goto('/sibkade');
  await expect(island(page)).toHaveAttribute('data-view', 'page');
  await expect(page.locator('#island [data-slot="title"]')).toHaveText('Sibkade');
  await expect(page.locator('h1')).toHaveCSS('opacity', '1');
  await expect(page.locator('html')).toHaveClass(/island-ready/);
});
```

Run: `npm run test:e2e -- island.spec.ts`
Expected: FAIL (`data-view` is never set).

- [ ] **Step 2: Create `src/scripts/island/dom.ts`**

```ts
import type { ViewName } from './resolve';
import type { PageCtx, PageLink } from '../../lib/page-ctx';
import { glyphSvg, tintBackground, type GlyphName, type Tint } from '../../lib/glyphs';

/** The goo layer's box starts 330px left of and 30px above the island's anchor (see .isl-goo). */
export const GOO_OX = 330;
export const GOO_OY = 30;
export const DOT = 36;
export const DOT_GAP = 10;

export interface Geometry {
  w: number;
  h: number;
  r: number;
  x0: number;
  scale: number;
  dotX: number;
  dotScale: number;
  dotOpacity: number;
}

/** All DOM reads and writes for the island live here. */
export class IslandDom {
  readonly root: HTMLElement;
  readonly isl: HTMLElement;
  readonly dot: HTMLButtonElement;
  readonly views = new Map<string, HTMLElement>();
  current: ViewName | null = null;
  private readonly pill: HTMLElement;
  private readonly dotBg: HTMLElement;
  private readonly prg: SVGCircleElement;
  private readonly roll: HTMLElement;
  private readonly slots = new Map<string, HTMLElement>();
  private readonly ruler = document.createElement('canvas').getContext('2d');
  private labelText = '';
  private dotFocusable = false;

  constructor(root: HTMLElement) {
    const q = <T extends Element>(sel: string): T => {
      const el = root.querySelector<T>(sel);
      if (!el) throw new Error(`island: missing ${sel}`);
      return el;
    };
    this.root = root;
    this.isl = q<HTMLElement>('[data-isl]');
    this.pill = q<HTMLElement>('[data-goo-pill]');
    this.dotBg = q<HTMLElement>('[data-goo-dot]');
    this.dot = q<HTMLButtonElement>('[data-dot]');
    this.prg = q<SVGCircleElement>('[data-prg]');
    this.roll = q<HTMLElement>('[data-roll]');
    for (const v of root.querySelectorAll<HTMLElement>('[data-view]')) this.views.set(v.dataset.view ?? '', v);
    for (const s of root.querySelectorAll<HTMLElement>('[data-slot]')) this.slots.set(s.dataset.slot ?? '', s);
  }

  slot(name: string): HTMLElement {
    const s = this.slots.get(name);
    if (!s) throw new Error(`island: missing slot ${name}`);
    return s;
  }

  show(name: ViewName): void {
    this.current = name;
    for (const [k, v] of this.views) v.classList.toggle('is-on', k === name);
    this.root.dataset.view = name;
  }

  /** Target size of a view: `--w`/`--h` when declared, otherwise measured. Never wider than maxW. */
  sizeOf(name: ViewName, maxW: number): { w: number; h: number } {
    const v = this.views.get(name);
    if (!v) return { w: DOT, h: DOT };
    const fw = parseFloat(v.style.getPropertyValue('--w'));
    const fh = parseFloat(v.style.getPropertyValue('--h'));
    const w = v.dataset.size === 'auto' || !Number.isFinite(fw) ? v.offsetWidth : fw;
    const h = Number.isFinite(fh) ? fh : v.offsetHeight;
    return { w: Math.min(w, maxW), h };
  }

  setGlyph(el: HTMLElement, glyph: GlyphName, tint: Tint): void {
    el.innerHTML = glyphSvg(glyph);
    el.style.background = tintBackground(tint);
  }

  /** Fills the views that depend on the current page. */
  fillPage(ctx: PageCtx): void {
    this.setGlyph(this.slot('glyph'), ctx.glyph, ctx.tint);
    this.slot('title').textContent = ctx.title;
    const status = this.slot('status');
    status.textContent = ctx.statusLabel ?? '';
    status.classList.toggle('is-now', ctx.status === 'now');
    this.setGlyph(this.slot('mp-glyph'), ctx.glyph, ctx.tint);
    this.slot('mp-title').textContent = ctx.title;
    this.slot('mp-list').replaceChildren(
      ...ctx.sections.map((s) => {
        const a = document.createElement('a');
        a.href = `#${s.id}`;
        a.dataset.nav = s.id;
        a.textContent = s.label;
        return a;
      }),
    );
    const sg = this.slot('section-glyph');
    if (ctx.kind === 'home') {
      sg.className = 'ava sm';
      sg.removeAttribute('style');
      sg.textContent = 'PK';
    } else {
      sg.className = 'glyph sm';
      this.setGlyph(sg, ctx.glyph, ctx.tint);
    }
    this.setNext(ctx.next);
    this.labelText = '';
  }

  setOpening(link: PageLink): void {
    this.setGlyph(this.slot('open-glyph'), link.glyph, link.tint);
    this.slot('open-title').textContent = link.title;
  }

  setNext(link: PageLink | undefined): void {
    if (!link) return;
    (this.slot('next-link') as HTMLAnchorElement).href = link.href;
    this.setGlyph(this.slot('next-glyph'), link.glyph, link.tint);
    this.slot('next-title').textContent = link.title;
  }

  setSheet(title: string, glyph: GlyphName, tint: Tint): void {
    this.setGlyph(this.slot('sheet-glyph'), glyph, tint);
    this.slot('sheet-title').textContent = title;
  }

  setJump(label: string, up: boolean): void {
    this.slot('jump').textContent = label;
    this.slot('jump-ico').style.transform = up ? 'rotate(180deg)' : '';
  }

  setCopied(ok: boolean): void {
    this.slot('copied').textContent = ok ? 'Email copied' : 'Copy blocked';
  }

  highlight(id: string | null): void {
    for (const a of this.root.querySelectorAll<HTMLElement>('.menu [data-nav], .mp-list [data-nav]')) {
      a.classList.toggle('is-here', a.dataset.nav === id);
    }
  }

  /** Rolls the section label up (dir 1) or down (dir -1). Returns false when the text is unchanged. */
  setLabel(text: string, dir: 1 | -1, animate: boolean): boolean {
    if (text === this.labelText) return false;
    this.labelText = text;
    let width = text.length * 8;
    if (this.ruler) {
      this.ruler.font = `600 13.5px ${getComputedStyle(this.root).fontFamily}`;
      width = Math.ceil(this.ruler.measureText(text).width) + 2;
    }
    this.roll.style.width = `${width}px`;
    const old = [...this.roll.querySelectorAll<HTMLElement>('.roll-item:not(.out)')];
    const item = document.createElement('span');
    item.className = 'roll-item';
    item.textContent = text;
    if (animate) {
      item.style.transform = `translateY(${dir * 100}%)`;
      item.style.opacity = '0';
      this.roll.appendChild(item);
      void item.offsetWidth;
      item.style.transform = '';
      item.style.opacity = '';
      for (const o of old) {
        o.classList.add('out');
        o.style.transform = `translateY(${-dir * 100}%)`;
        o.style.opacity = '0';
        window.setTimeout(() => o.remove(), 520);
      }
    } else {
      for (const o of old) o.remove();
      this.roll.appendChild(item);
    }
    return true;
  }

  render(g: Geometry): void {
    const px = (n: number) => `${n.toFixed(2)}px`;
    for (const el of [this.pill, this.isl]) {
      el.style.width = px(g.w);
      el.style.height = px(g.h);
      el.style.borderRadius = px(g.r);
    }
    const sc = g.scale.toFixed(4);
    this.pill.style.transform = `translate3d(${px(GOO_OX + g.x0)}, ${px(GOO_OY)}, 0) scale(${sc})`;
    this.isl.style.transform = `translate3d(${px(g.x0)}, 0, 0) scale(${sc})`;
    this.dotBg.style.transform = `translate3d(${px(GOO_OX + g.dotX - DOT / 2)}, ${px(GOO_OY)}, 0) scale(${g.dotScale.toFixed(3)})`;
    this.dot.style.transform = `translate3d(${px(g.dotX - DOT / 2)}, 0, 0)`;
    this.dot.style.opacity = g.dotOpacity.toFixed(3);
    const focusable = g.dotOpacity > 0.8;
    if (focusable !== this.dotFocusable) {
      this.dotFocusable = focusable;
      this.dot.style.pointerEvents = focusable ? 'auto' : 'none';
      this.dot.tabIndex = focusable ? 0 : -1;
    }
  }

  setProgress(p: number): void {
    this.prg.style.strokeDashoffset = (69.12 * (1 - p)).toFixed(2);
  }
}
```

- [ ] **Step 3: Create `src/scripts/island/core.ts`**

```ts
import { Spring } from './spring';
import { initialState, resolveView, type FlashView, type IslandState } from './resolve';
import { IslandDom, DOT, DOT_GAP } from './dom';
import { clamp, lerp, seg } from './scroll';
import type { PageCtx } from '../../lib/page-ctx';

type FrameHook = (dt: number, now: number) => void;
type PageHook = (ctx: PageCtx, first: boolean) => void;
type Listener = (payload?: unknown) => void;

/** Owns island state and motion. Features plug in through hooks and a tiny event bus. */
export class IslandCore {
  readonly dom: IslandDom;
  readonly reduced: boolean;
  state: IslandState;
  ctx: PageCtx;
  readonly w = new Spring(DOT, 0.5, 0.72);
  readonly h = new Spring(DOT, 0.5, 0.72);
  readonly r = new Spring(DOT / 2, 0.5, 0.85);
  readonly lean = new Spring(0, 0.5, 0.9);
  readonly press = new Spring(1, 0.25, 0.6);
  readonly gulp = new Spring(1, 0.38, 0.45);
  readonly split = new Spring(0, 0.55, 0.66);
  private readonly frames: FrameHook[] = [];
  private readonly pages: PageHook[] = [];
  private readonly interrupts: (() => void)[] = [];
  private readonly listeners = new Map<string, Listener[]>();
  private flashTimer = 0;
  private last = 0;

  constructor(dom: IslandDom, ctx: PageCtx, reduced: boolean) {
    this.dom = dom;
    this.ctx = ctx;
    this.reduced = reduced;
    this.state = initialState(ctx.kind);
    if (reduced) for (const s of [this.w, this.h, this.r, this.lean, this.split, this.gulp]) s.tune(0.3, 1);
  }

  onFrame(fn: FrameHook): void { this.frames.push(fn); }
  onPage(fn: PageHook): void { this.pages.push(fn); }
  onInterrupt(fn: () => void): void { this.interrupts.push(fn); }
  interrupt(): void { for (const fn of this.interrupts) fn(); }

  on(event: string, fn: Listener): void {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), fn]);
  }

  emit(event: string, payload?: unknown): void {
    for (const fn of this.listeners.get(event) ?? []) fn(payload);
  }

  /** New page: transient flags reset, but an in-flight flash (e.g. 'opening') survives until a feature clears it. */
  setPage(ctx: PageCtx, first: boolean): void {
    this.ctx = ctx;
    this.state = { ...initialState(ctx.kind), flash: this.state.flash };
    this.dom.fillPage(ctx);
    for (const fn of this.pages) fn(ctx, first);
    this.resolve(true);
  }

  resolve(force = false): void {
    const view = resolveView(this.state);
    if (!force && view === this.dom.current) return;
    this.dom.show(view);
    this.fit();
    this.split.t = view === 'section' ? 1 : 0;
    this.emit('view', view);
  }

  /** Re-measures the current view and retargets the size springs; call after changing a view's content. */
  fit(): void {
    const view = this.dom.current;
    if (!view) return;
    const size = view === 'boot' ? { w: DOT, h: DOT } : this.dom.sizeOf(view, innerWidth - 24);
    this.w.t = size.w;
    this.h.t = size.h;
    this.r.t = Math.min(size.h / 2, 32);
  }

  flash(view: FlashView | null, ms = 0): void {
    clearTimeout(this.flashTimer);
    this.state.flash = view;
    this.resolve();
    if (view && ms > 0) {
      this.flashTimer = window.setTimeout(() => {
        if (this.state.flash !== view) return;
        this.state.flash = null;
        this.resolve();
      }, ms);
    }
  }

  start(): void {
    this.last = performance.now();
    requestAnimationFrame(this.frame);
  }

  private frame = (now: number): void => {
    const dt = clamp((now - this.last) / 1000, 0, 1 / 20);
    this.last = now;
    for (const fn of this.frames) fn(dt, now);
    for (const s of [this.w, this.h, this.r, this.lean, this.press, this.gulp, this.split]) s.step(dt);
    const w = Math.max(0, this.w.x);
    const h = Math.max(0, this.h.x);
    const k = this.split.x;
    this.dom.render({
      w,
      h,
      r: clamp(this.r.x, 0, h / 2),
      x0: -w / 2 + this.lean.x,
      scale: this.press.x * this.gulp.x,
      dotX: lerp(w / 2 - DOT / 2 - 2, w / 2 + DOT_GAP + DOT / 2, clamp(k, -0.2, 1.3)) + this.lean.x,
      dotScale: lerp(0.55, 1, clamp(k, 0, 1)),
      dotOpacity: seg(k, 0.6, 1),
    });
    requestAnimationFrame(this.frame);
  };
}
```

- [ ] **Step 4: Create `src/scripts/island/features/title.ts`**

```ts
import type { IslandCore } from '../core';
import { Spring } from '../spring';
import { absorbProgress, nextAbsorbed, seg } from '../scroll';
import { titleFrame, titleProgress, type TitleOrigin } from '../title-motion';

export interface TitleControl {
  drop(): void;
  readonly dropped: boolean;
}

const LAND_DELAY = 380;

/** Every page's h1 lives in the island: it drops out on arrival and is absorbed back as the page scrolls. */
export function installTitle(core: IslandCore): TitleControl {
  const intro = new Spring(1, 0.75, 0.84);
  if (core.reduced) intro.tune(0.3, 1);
  let el: HTMLElement | null = null;
  let fades: HTMLElement[] = [];
  let origin: TitleOrigin = { cx: 0, cy: 0 };
  let dropped = false;
  let lastKey = '';
  let lastY = -1;

  const measure = () => {
    if (!el) return;
    const keep = el.style.transform;
    el.style.transform = 'none';
    const b = el.getBoundingClientRect();
    el.style.transform = keep;
    origin = { cx: b.left + b.width / 2, cy: b.top + b.height / 2 + scrollY };
    lastKey = '';
    lastY = -1;
  };

  core.onPage(() => {
    el = document.querySelector<HTMLElement>('main [data-island-title]');
    fades = [...document.querySelectorAll<HTMLElement>('main [data-scroll-fade]')];
    dropped = false;
    intro.snap(1);
    measure();
  });
  addEventListener('resize', measure);
  void document.fonts?.ready.then(measure);

  core.onFrame((dt) => {
    intro.step(dt);
    const y = scrollY;
    const H = innerHeight;
    const eS = absorbProgress(y, H);
    const absorbed = nextAbsorbed(core.state.absorbed, eS);
    if (absorbed !== core.state.absorbed) {
      core.state.absorbed = absorbed;
      if (!core.reduced) core.gulp.v += absorbed ? 3.2 : 2;
      if (absorbed) core.interrupt();
      core.resolve();
    }
    if (y !== lastY) {
      lastY = y;
      for (const f of fades) {
        f.style.opacity = (1 - seg(y, 0, H * 0.32)).toFixed(3);
        f.style.transform = `translate3d(0, ${(-y * 0.18).toFixed(2)}px, 0)`;
      }
    }
    if (!el) return;
    const e = titleProgress(intro.x, eS);
    const key = `${e.toFixed(4)}|${Math.round(y)}`;
    if (key === lastKey) return;
    lastKey = key;
    const f = titleFrame(e, origin, innerWidth, y, core.reduced);
    el.style.transform = `translate3d(${f.tx.toFixed(2)}px, ${f.ty.toFixed(2)}px, 0) scale(${f.scale.toFixed(4)})`;
    el.style.opacity = f.opacity.toFixed(3);
    el.style.filter = f.blur > 0.05 ? `blur(${f.blur.toFixed(2)}px)` : 'none';
  });

  return {
    drop() {
      if (dropped) return;
      dropped = true;
      intro.t = 0;
      if (!core.reduced) core.gulp.v += 3;
      const main = document.querySelector('main');
      window.setTimeout(() => main?.classList.add('landed'), core.reduced ? 0 : LAND_DELAY);
    },
    get dropped() {
      return dropped;
    },
  };
}
```

- [ ] **Step 5: Create `src/scripts/island/features/intro.ts`**

```ts
import type { IslandCore } from '../core';
import type { IntroStep } from '../resolve';
import type { TitleControl } from './title';

const SEEN_KEY = 'heyparsa-intro-seen';

function seen(): boolean {
  try { return sessionStorage.getItem(SEEN_KEY) === '1'; } catch { return true; }
}

function markSeen(): void {
  try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* storage blocked */ }
}

/** First visit to home: hello → the name drops out → two live-word previews. Every other arrival only drops the title. */
export function installIntro(core: IslandCore, title: TitleControl): void {
  let timers: number[] = [];
  const at = (ms: number, fn: () => void) => { timers.push(window.setTimeout(fn, ms)); };
  const clear = () => { for (const t of timers) clearTimeout(t); timers = []; };
  const step = (view: IntroStep | null, lit: string | null = null) => {
    core.state.intro = view;
    core.emit('lit', lit);
    core.resolve();
  };

  core.onInterrupt(() => {
    if (!core.state.intro && title.dropped) return;
    clear();
    core.state.intro = null;
    core.emit('lit', null);
    title.drop();
    core.resolve();
  });

  core.onPage((ctx, first) => {
    clear();
    const full = first && ctx.kind === 'home' && !seen() && !core.reduced && scrollY < 8;
    markSeen();
    if (first) {
      core.w.snap(36);
      core.h.snap(36);
      core.r.snap(18);
      core.state.intro = 'boot';
    }
    if (full) {
      at(150, () => step('hello'));
      at(1500, () => { title.drop(); step('home'); });
      at(3000, () => step('d-sibkade', 'sibkade'));
      at(4700, () => step('d-barayand', 'barayand'));
      at(6400, () => step(null));
    } else {
      at(first ? 150 : 40, () => { title.drop(); step(null); });
    }
  });
}
```

- [ ] **Step 6: Create `src/scripts/island/features/menu.ts`**

```ts
import type { IslandCore } from '../core';

const OPEN_DELAY = 70;
const CLOSE_DELAY = 380;

/** Hover (mouse), focus (keyboard) or tap (touch) opens the menu. Clicks inside the island become core events. */
export function installMenu(core: IslandCore): void {
  const { isl, root } = core.dom;
  let openT = 0;
  let closeT = 0;

  const open = () => {
    if (core.state.sheet) return;
    core.interrupt();
    core.state.word = null;
    core.emit('lit', null);
    core.state.menu = true;
    core.resolve();
  };
  const close = () => {
    core.state.menu = false;
    core.state.contact = false;
    core.resolve();
  };

  isl.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse') return;
    clearTimeout(closeT);
    openT = window.setTimeout(open, OPEN_DELAY);
  });
  isl.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'mouse') return;
    clearTimeout(openT);
    closeT = window.setTimeout(close, CLOSE_DELAY);
  });
  isl.addEventListener('focusin', () => {
    clearTimeout(closeT);
    if (!core.state.menu && !core.state.contact) open();
  });
  isl.addEventListener('focusout', (e) => {
    if (!isl.contains(e.relatedTarget as Node | null)) close();
  });
  isl.addEventListener('pointerdown', () => { core.press.t = 0.96; });
  addEventListener('pointerup', () => { core.press.t = 1; });
  addEventListener('pointercancel', () => { core.press.t = 1; });
  isl.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    close();
    isl.blur();
  });

  isl.addEventListener('click', (e) => {
    const t = e.target as Element;
    const action = t.closest<HTMLElement>('[data-action]');
    if (action) { e.preventDefault(); core.emit('action', action.dataset.action); return; }
    const copy = t.closest<HTMLElement>('[data-copy]');
    if (copy) { e.preventDefault(); core.emit('copy', copy.dataset.copy); return; }
    const nav = t.closest<HTMLAnchorElement>('[data-nav]');
    if (nav) { core.emit('nav', { id: nav.dataset.nav, anchor: nav, event: e }); return; }
    if (t.closest('a[href]')) { close(); return; }
    if (core.state.sheet) { core.emit('action', 'close-sheet'); return; }
    if (!core.state.menu && !core.state.contact) open();
  });

  document.addEventListener('pointerdown', (e) => {
    if (!root.contains(e.target as Node) && (core.state.menu || core.state.contact)) close();
  }, true);
  core.on('close-menu', close);
}
```

- [ ] **Step 7: Create `src/scripts/island/index.ts` and load it**

```ts
import { IslandDom } from './dom';
import { IslandCore } from './core';
import { homeCtx, parseCtx } from '../../lib/page-ctx';
import { installTitle } from './features/title';
import { installIntro } from './features/intro';
import { installMenu } from './features/menu';

const root = document.querySelector<HTMLElement>('[data-island]');

if (root && !root.dataset.booted) {
  root.dataset.booted = 'true';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const readCtx = () => parseCtx(document.querySelector('main #page-ctx')?.textContent) ?? homeCtx();
  const core = new IslandCore(new IslandDom(root), readCtx(), reduced);
  const title = installTitle(core);
  installIntro(core, title);
  installMenu(core);

  // Client-side navigations: the island persists, the page context changes.
  let navigating = false;
  document.addEventListener('astro:before-preparation', () => { navigating = true; });
  document.addEventListener('astro:page-load', () => {
    if (!navigating) return;
    navigating = false;
    core.setPage(readCtx(), false);
  });

  core.setPage(core.ctx, true);
  core.start();
  document.documentElement.classList.add('island-ready');
}
```

At the end of `src/components/Island.astro`, after the closing `</div>` of `.isl-wrap` and before `<style is:global>`, add:
```astro
<script>
  import '../scripts/island/index';
</script>
```

- [ ] **Step 8: Verify**

Run: `npm test && npm run test:e2e && npx astro check`
Expected: all green, including the 5 new island tests on both browsers.

Then open <http://localhost:4321> in the browser pane (`npm run dev`) and check against `docs/prototypes/island-hero.html`:
- The island says hello.
- The name drops out with a small bounce.
- The two previews play.
- Hovering the island opens the menu.
- Scrolling absorbs the name.
- The split dot appears when the section view is showing.

- [ ] **Step 9: Commit**

```bash
git add src tests
git commit -m "Bring the island to life: core loop, title drop and absorb, intro, menu

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Home interactions: live words, contact and copy, theme toggle, section labels, progress dot, in-page jumps

**Files:**
- Create: `src/scripts/island/features/words.ts`, `src/scripts/island/features/contact.ts`, `src/scripts/island/features/theme.ts`, `src/scripts/island/features/sections.ts`, `tests/e2e/island-home.spec.ts`
- Modify: `src/scripts/island/index.ts` (install the four features)

**Interfaces:**
- Consumes:
  - core events `'lit' 'view' 'action' 'copy' 'nav'`;
  - `core.lean`, `core.dom.setLabel/highlight/setJump/setCopied/setProgress/dot/views`;
  - page hooks: `[data-word]`, `[data-hero-glow]`, the section ids from `ctx.sections`;
  - `applyTheme`, `currentTheme`, `flipTheme`, `saveTheme` (Task 3);
  - `normalizePath` (Task 7).
- Produces:
  - `installWords(core)`, `installContact(core)`, `installThemeToggle(core)`, `installSections(core)`;
  - core event `'theme'` (payload: the new theme).
- Chapter behaviour on project pages comes for free: `installSections` works from `ctx.sections`, whatever the page kind.

- [ ] **Step 1: Write the failing e2e test**

`tests/e2e/island-home.spec.ts`:
```ts
import { test, expect, type Page } from '@playwright/test';

const island = (page: Page) => page.locator('#island');
const label = (page: Page) => page.locator('#island [data-roll] .roll-item:not(.out)');
const skipIntro = (page: Page) => page.addInitScript(() => sessionStorage.setItem('heyparsa-intro-seen', '1'));

test.beforeEach(async ({ page }) => {
  await skipIntro(page);
  await page.goto('/');
  await expect(island(page)).toHaveAttribute('data-view', 'home');
});

test('hovering a live word previews it and lights the word', async ({ page }) => {
  await page.locator('[data-word="tech"]').hover();
  await expect(island(page)).toHaveAttribute('data-view', 'd-tech');
  await expect(page.locator('[data-word="tech"]')).toHaveClass(/is-lit/);
  await page.mouse.move(12, 700);
  await expect(island(page)).toHaveAttribute('data-view', 'home');
  await expect(page.locator('[data-word="tech"]')).not.toHaveClass(/is-lit/);
});

test('Contact opens inside the island and the email copies', async ({ page, context, browserName }) => {
  if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.locator('#island nav.isl').hover();
  await expect(island(page)).toHaveAttribute('data-view', 'menu-home');
  await page.locator('#island [data-view="menu-home"] [data-action="contact"]').click();
  await expect(island(page)).toHaveAttribute('data-view', 'contact');
  await page.locator('#island [data-copy]').click();
  await expect(island(page)).toHaveAttribute('data-view', 'copied');
  if (browserName === 'chromium') {
    await expect(page.locator('#island [data-slot="copied"]')).toHaveText('Email copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('me@heyparsa.com');
  }
});

test('the theme toggle switches and remembers the appearance', async ({ page }) => {
  await page.locator('#island nav.isl').hover();
  await expect(island(page)).toHaveAttribute('data-view', 'menu-home');
  await page.locator('#island [data-view="menu-home"] [data-action="theme"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('scrolling names the current section and fills the progress dot', async ({ page }) => {
  await page.evaluate(() => scrollTo(0, innerHeight * 0.5));
  await expect(island(page)).toHaveAttribute('data-view', 'section');
  await expect(label(page)).toHaveText('Parsa Kharazmian');
  await page.evaluate(() => scrollTo(0, document.getElementById('playground')!.offsetTop));
  await expect(label(page)).toHaveText('Playground');
  await expect(page.locator('#island [data-dot]')).toHaveCSS('opacity', '1');
});

test('menu links scroll to their section on the home page', async ({ page }) => {
  await page.locator('#island nav.isl').hover();
  await page.locator('#island .menu [data-nav="about"]').click();
  await expect(page).toHaveURL(/#about$/);
  await expect
    .poll(() => page.evaluate(() => Math.abs(document.getElementById('about')!.getBoundingClientRect().top)))
    .toBeLessThan(40);
  await expect(label(page)).toHaveText('About');
});
```

Run: `npm run test:e2e -- island-home.spec.ts`
Expected: FAIL (no previews, no contact, no labels yet).

- [ ] **Step 2: Create `src/scripts/island/features/words.ts`**

```ts
import type { IslandCore } from '../core';
import { clamp } from '../scroll';

const LEAVE_DELAY = 150;

/** Hero live words preview themselves in the island. Desktop: hover or focus. Touch: the first tap previews, a second tap follows a link. */
export function installWords(core: IslandCore): void {
  let words: HTMLElement[] = [];
  let glow: HTMLElement | null = null;
  let leaveT = 0;
  let lastPointer = 'mouse';

  const lit = (key: string | null) => {
    for (const w of words) w.classList.toggle('is-lit', w.dataset.word === key);
    const el = key ? words.find((w) => w.dataset.word === key) : undefined;
    if (el && !core.reduced) {
      const b = el.getBoundingClientRect();
      core.lean.t = clamp((b.left + b.width / 2 - innerWidth / 2) * 0.035, -14, 14);
    } else {
      core.lean.t = 0;
    }
  };
  const set = (key: string) => {
    clearTimeout(leaveT);
    core.interrupt();
    core.state.word = key;
    lit(key);
    core.resolve();
  };
  const clear = () => {
    core.state.word = null;
    lit(null);
    core.resolve();
  };
  const clearSoon = () => {
    clearTimeout(leaveT);
    leaveT = window.setTimeout(clear, LEAVE_DELAY);
  };

  core.on('lit', (key) => lit(typeof key === 'string' ? key : null));

  core.on('view', (view) => {
    if (!glow) return;
    const rgb = core.dom.views.get(String(view))?.dataset.glow;
    const alpha = getComputedStyle(document.documentElement).getPropertyValue('--glow-alpha').trim() || '0.13';
    glow.style.setProperty('--glow', rgb ? `rgba(${rgb}, ${alpha})` : 'rgba(0, 0, 0, 0)');
  });

  document.addEventListener('pointerdown', (e) => {
    lastPointer = e.pointerType || 'mouse';
    if (lastPointer !== 'mouse' && core.state.word && !(e.target as Element).closest('[data-word]')) clear();
  }, true);

  core.onPage(() => {
    clearTimeout(leaveT);
    words = [...document.querySelectorAll<HTMLElement>('main [data-word]')];
    glow = document.querySelector<HTMLElement>('main [data-hero-glow]');
    for (const w of words) {
      const key = w.dataset.word ?? '';
      let wasActive = false;
      w.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') set(key); });
      w.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') clearSoon(); });
      w.addEventListener('focus', () => set(key));
      w.addEventListener('blur', clearSoon);
      w.addEventListener('pointerdown', () => { wasActive = core.state.word === key; });
      w.addEventListener('click', (e) => {
        if (lastPointer === 'mouse') return;
        if (wasActive) {
          if (w instanceof HTMLAnchorElement) return;
          clear();
          w.blur();
          return;
        }
        e.preventDefault();
        set(key);
      });
    }
  });
}
```

- [ ] **Step 3: Create `src/scripts/island/features/contact.ts`**

```ts
import type { IslandCore } from '../core';

/** Contact opens inside the island; tapping the email copies it and confirms like a system notice. */
export function installContact(core: IslandCore): void {
  core.on('action', (action) => {
    if (action !== 'contact') return;
    core.state.menu = true;
    core.state.contact = true;
    core.resolve();
  });

  core.on('copy', async (text) => {
    let ok = true;
    try {
      await navigator.clipboard.writeText(String(text));
    } catch {
      ok = false;
    }
    core.dom.setCopied(ok);
    core.state.menu = false;
    core.state.contact = false;
    (document.activeElement as HTMLElement | null)?.blur?.();
    core.flash('copied', 1500);
  });
}
```

- [ ] **Step 4: Create `src/scripts/island/features/theme.ts`**

```ts
import type { IslandCore } from '../core';
import { applyTheme, currentTheme, flipTheme, saveTheme } from '../../theme';

export function installThemeToggle(core: IslandCore): void {
  core.on('action', (action) => {
    if (action !== 'theme') return;
    const next = flipTheme(currentTheme());
    applyTheme(next);
    saveTheme(next);
    core.emit('theme', next);
  });
}
```

- [ ] **Step 5: Create `src/scripts/island/features/sections.ts`**

```ts
import type { IslandCore } from '../core';
import { currentSection, pageProgress, rollDirection, type SectionTop } from '../scroll';
import { normalizePath } from '../../../lib/page-ctx';

const SETTLE_MS = 180;
const CHAPTER_OFFSET = 96;

/** Names the section (home) or chapter (project) being read, drives the progress dot, and smooth-scrolls in-page links. */
export function installSections(core: IslandCore): void {
  let tops: SectionTop[] = [];
  let current: string | null = null;
  let jumping = false;
  let lastMove = 0;
  let lastY = -1;
  let docH = 1;

  const measure = () => {
    tops = [];
    for (const s of core.ctx.sections) {
      const el = document.getElementById(s.id);
      if (el) tops.push({ id: s.id, label: s.label, top: el.getBoundingClientRect().top + scrollY });
    }
    docH = document.documentElement.scrollHeight;
    lastY = -1;
  };
  const labelOf = (id: string | null) => tops.find((t) => t.id === id)?.label ?? core.ctx.title;

  const sync = (animate: boolean) => {
    const hit = currentSection(tops, scrollY, innerHeight);
    const id = hit ? hit.id : null;
    if (id === current) return;
    const dir = rollDirection(tops, current, id);
    current = id;
    core.dom.highlight(id);
    const showing = core.dom.current === 'section';
    if (core.dom.setLabel(labelOf(id), dir, animate && showing) && showing) core.fit();
  };

  const jump = (id: string, target: number) => {
    core.dom.setJump(id === 'top' ? 'Top' : labelOf(id), target < scrollY);
    core.state.menu = false;
    core.state.contact = false;
    (document.activeElement as HTMLElement | null)?.blur?.();
    jumping = true;
    lastMove = performance.now();
    core.flash('jump');
    scrollTo({ top: target, behavior: core.reduced ? 'auto' : 'smooth' });
    history.replaceState(history.state, '', id === 'top' ? location.pathname : `#${id}`);
  };

  core.onPage(() => {
    jumping = false;
    current = null;
    measure();
    core.dom.setLabel(core.ctx.title, 1, false);
    core.dom.highlight(null);
    sync(false);
  });
  addEventListener('resize', measure);
  addEventListener('load', measure);
  void document.fonts?.ready.then(measure);

  core.on('nav', (payload) => {
    const { id, anchor, event } = payload as { id: string; anchor: HTMLAnchorElement; event: MouseEvent };
    if (normalizePath(new URL(anchor.href, location.href).pathname) !== normalizePath(location.pathname)) return;
    const el = document.getElementById(id);
    if (!el) return;
    event.preventDefault();
    const offset = core.ctx.kind === 'project' && id !== 'top' ? CHAPTER_OFFSET : 0;
    jump(id, Math.max(0, el.getBoundingClientRect().top + scrollY - offset));
  });
  core.dom.dot.addEventListener('click', () => jump('top', 0));

  core.onFrame((_dt, now) => {
    const y = scrollY;
    if (jumping) {
      if (Math.abs(y - lastY) > 0.5) lastMove = now;
      else if (now - lastMove > SETTLE_MS) {
        jumping = false;
        sync(false);
        core.flash(null);
      }
    }
    if (y !== lastY) {
      if (!jumping) sync(true);
      core.dom.setProgress(pageProgress(y, innerHeight, docH));
    }
    lastY = y;
  });
}
```

- [ ] **Step 6: Install the features in `src/scripts/island/index.ts`**

Add the imports:
```ts
import { installWords } from './features/words';
import { installContact } from './features/contact';
import { installThemeToggle } from './features/theme';
import { installSections } from './features/sections';
```
and, right after `installMenu(core);`:
```ts
  installWords(core);
  installContact(core);
  installThemeToggle(core);
  installSections(core);
```

- [ ] **Step 7: Verify**

Run: `npm test && npm run test:e2e && npx astro check`
Expected: all green.

Then check by hand in the browser pane:
- The live words preview with a lean and a tinted glow.
- Contact → Copy.
- The theme toggle.
- Section names roll up and down as you scroll.
- The progress bubble splits off, and tapping it goes back to the top.

- [ ] **Step 8: Commit**

```bash
git add src tests
git commit -m "Add live-word previews, contact and copy, theme toggle, section labels and jumps

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Across pages: "opening" state, chapter labels, "Next" near the end, back navigation

**Files:**
- Create: `src/scripts/island/features/router.ts`, `src/scripts/island/features/next.ts`, `tests/e2e/navigation.spec.ts`
- Modify: `src/scripts/island/index.ts` (replace the inline navigation code with `installRouter`; install `installNext`)

**Interfaces:**
- Consumes:
  - `#site-map` (Task 7);
  - `main [data-next]` (Task 5);
  - `isNearEnd` (Task 6);
  - `core.dom.setOpening`, `core.flash`, `core.setPage`;
  - Astro events `astro:before-preparation` (`event.to: URL`) and `astro:page-load`.
- Produces:
  - `readCtx(): PageCtx` and `installRouter(core)` from `features/router.ts`;
  - `installNext(core)`;
  - the `'opening'` flash, shown for at least 350 ms.

- [ ] **Step 1: Write the failing e2e test**

`tests/e2e/navigation.spec.ts`:
```ts
import { test, expect, type Page } from '@playwright/test';

const island = (page: Page) => page.locator('#island');
const label = (page: Page) => page.locator('#island [data-roll] .roll-item:not(.out)');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('heyparsa-intro-seen', '1'));
});

test('opening a project card: the island shows it, then the page takes over', async ({ page }) => {
  await page.goto('/');
  await expect(island(page)).toHaveAttribute('data-view', 'home');
  await page.locator('#work a.card-link[href="/sibkade"]').click();
  await expect(page).toHaveURL(/\/sibkade$/);
  await expect(island(page)).toHaveAttribute('data-view', 'page');
  await expect(page.locator('#island [data-slot="title"]')).toHaveText('Sibkade');
  await expect(page.locator('h1')).toHaveText('Sibkade');
  await expect(page.locator('h1')).toHaveCSS('opacity', '1');
});

test('the island element persists across navigation', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { (document.getElementById('island') as HTMLElement & { marker?: number }).marker = 42; });
  await page.locator('#work a.card-link[href="/barayand"]').click();
  await expect(page).toHaveURL(/\/barayand$/);
  expect(await page.evaluate(() => (document.getElementById('island') as HTMLElement & { marker?: number }).marker)).toBe(42);
});

test('a project page names its chapters and offers the next project at the end', async ({ page }) => {
  await page.goto('/sibkade');
  await expect(island(page)).toHaveAttribute('data-view', 'page');
  await page.evaluate(() => {
    const h = document.getElementById('staying-close-to-the-product')!;
    scrollTo(0, h.getBoundingClientRect().top + scrollY - 100);
  });
  await expect(island(page)).toHaveAttribute('data-view', 'section');
  await expect(label(page)).toHaveText('Staying close to the product');
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await expect(island(page)).toHaveAttribute('data-view', 'next');
  await expect(page.locator('#island [data-slot="next-title"]')).toHaveText('Barayand');
  await page.locator('#island [data-slot="next-link"]').click();
  await expect(page).toHaveURL(/\/barayand$/);
  await expect(island(page)).toHaveAttribute('data-view', 'page');
});

test('the project menu lists chapters and jumps to them', async ({ page }) => {
  await page.goto('/barayand');
  await expect(island(page)).toHaveAttribute('data-view', 'page');
  await page.locator('#island nav.isl').hover();
  await expect(island(page)).toHaveAttribute('data-view', 'menu-page');
  await expect(page.locator('#island .mp-list a')).toHaveText(['The idea', 'What shipped', 'The benchmark']);
  await page.locator('#island .mp-list a[data-nav="the-benchmark"]').click();
  await expect(page).toHaveURL(/#the-benchmark$/);
  await expect(label(page)).toHaveText('The benchmark');
});

test('back returns the island to the home page state', async ({ page }) => {
  await page.goto('/');
  await page.locator('#work a.card-link[href="/sibkade"]').click();
  await expect(island(page)).toHaveAttribute('data-view', 'page');
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(island(page)).toHaveAttribute('data-view', /^(home|section)$/);
  await expect(page.locator('#island [data-slot="title"]')).toHaveText('Parsa Kharazmian');
});

test('the chosen theme survives navigation', async ({ page }) => {
  await page.goto('/');
  await page.locator('#island nav.isl').hover();
  await page.locator('#island [data-view="menu-home"] [data-action="theme"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.mouse.move(12, 700);
  await page.locator('#work a.card-link[href="/sibkade"]').click();
  await expect(page).toHaveURL(/\/sibkade$/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
```

Run: `npm run test:e2e -- navigation.spec.ts`
Expected: FAIL. There is no "next" view yet, and the opening flash is missing.

- [ ] **Step 2: Create `src/scripts/island/features/router.ts`**

```ts
import type { TransitionBeforePreparationEvent } from 'astro:transitions/client';
import type { IslandCore } from '../core';
import { homeCtx, normalizePath, parseCtx, type PageCtx, type SiteMap } from '../../../lib/page-ctx';

const MIN_OPENING_MS = 350;

export function readCtx(): PageCtx {
  return parseCtx(document.querySelector('main #page-ctx')?.textContent) ?? homeCtx();
}

/** Keeps the island in step with client-side navigations: it shows where you're heading, then takes the new page's context. */
export function installRouter(core: IslandCore): void {
  let siteMap: SiteMap = {};
  try {
    siteMap = JSON.parse(document.getElementById('site-map')?.textContent || '{}') as SiteMap;
  } catch {
    siteMap = {};
  }
  let navigating = false;
  let openedAt = 0;

  document.addEventListener('astro:before-preparation', (e) => {
    navigating = true;
    const to = normalizePath((e as TransitionBeforePreparationEvent).to.pathname);
    if (to === normalizePath(location.pathname)) return;
    const link = siteMap[to];
    if (!link) return;
    core.dom.setOpening(link);
    core.state.menu = false;
    core.state.contact = false;
    core.state.word = null;
    core.emit('lit', null);
    openedAt = performance.now();
    core.flash('opening');
  });

  document.addEventListener('astro:page-load', () => {
    if (!navigating) return;
    navigating = false;
    core.setPage(readCtx(), false);
    if (core.state.flash !== 'opening') return;
    const wait = core.reduced ? 0 : Math.max(0, MIN_OPENING_MS - (performance.now() - openedAt));
    window.setTimeout(() => {
      if (core.state.flash === 'opening') core.flash(null);
    }, wait);
  });
}
```

- [ ] **Step 3: Create `src/scripts/island/features/next.ts`**

```ts
import type { IslandCore } from '../core';
import { isNearEnd } from '../scroll';

/** Near the end of a project page, the island offers the next project. */
export function installNext(core: IslandCore): void {
  let end: HTMLElement | null = null;
  let endTop: number | null = null;
  const measure = () => {
    endTop = end ? end.getBoundingClientRect().top + scrollY : null;
  };

  core.onPage((ctx) => {
    end = ctx.kind === 'project' ? document.querySelector<HTMLElement>('main [data-next]') : null;
    measure();
  });
  addEventListener('resize', measure);
  addEventListener('load', measure);

  core.onFrame(() => {
    if (core.ctx.kind !== 'project') return;
    const near = isNearEnd(endTop, scrollY, innerHeight);
    if (near === core.state.nearEnd) return;
    core.state.nearEnd = near;
    core.resolve();
  });
}
```

- [ ] **Step 4: Replace `src/scripts/island/index.ts`**

```ts
import { IslandDom } from './dom';
import { IslandCore } from './core';
import { installTitle } from './features/title';
import { installIntro } from './features/intro';
import { installMenu } from './features/menu';
import { installWords } from './features/words';
import { installContact } from './features/contact';
import { installThemeToggle } from './features/theme';
import { installSections } from './features/sections';
import { installNext } from './features/next';
import { installRouter, readCtx } from './features/router';

const root = document.querySelector<HTMLElement>('[data-island]');

if (root && !root.dataset.booted) {
  root.dataset.booted = 'true';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const core = new IslandCore(new IslandDom(root), readCtx(), reduced);
  const title = installTitle(core);
  installIntro(core, title);
  installMenu(core);
  installWords(core);
  installContact(core);
  installThemeToggle(core);
  installSections(core);
  installNext(core);
  installRouter(core);
  core.setPage(core.ctx, true);
  core.start();
  document.documentElement.classList.add('island-ready');
}
```

- [ ] **Step 5: Verify**

Run: `npm test && npm run test:e2e && npx astro check`
Expected: all green on both browsers.

In the browser pane, check:
- Home → Sibkade card: the island becomes "Sibkade" (spinner) and the big title drops out of it.
- Scrolling rolls the chapter names.
- At the bottom the island offers "Next · Barayand →".
- Back springs the island to its home state.

- [ ] **Step 6: Commit**

```bash
git add src tests
git commit -m "Sync the island with navigation: opening state, chapters, next project, back

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Sheets for HelpFinity and IranSpoti, synced with the island

**What it does:**
- The "+" on a card opens that project's sheet. The sheet grows out of the card (FLIP, with spring easing) and shrinks back into it on close.
- While it's open, `<main>` is inert and the page doesn't scroll. The island shows the project and can close the sheet.
- The URL hash is `#helpfinity` or `#iranspoti`. Loading with that hash opens the sheet.
- Without JavaScript, the sheets render as plain sections at the end of the page. This is a deliberate change from the spec, which said "under the card"; Step 6 updates the spec.

**Files:**
- Create: `src/components/ProjectSheet.astro`, `src/styles/sheet.css`, `src/scripts/sheet.ts`, `src/scripts/island/features/sheet-sync.ts`, `tests/e2e/sheet.spec.ts`
- Modify:
  - `src/pages/index.astro` (render the sheets in the `overlay` slot);
  - `src/layouts/Base.astro` (load `sheet.ts`);
  - `src/scripts/island/index.ts` (install sheet sync);
  - `docs/superpowers/specs/2026-09-26-portfolio-site-design.md` (no-JS fallback wording).

**Interfaces:**
- Consumes:
  - `button[data-sheet-open]` and `article[data-card]` (Task 4);
  - `springEasing` (Task 6);
  - `core.dom.setSheet`, core event `'action' → 'close-sheet'` (Tasks 7–8);
  - the `.prose` styles (Task 5).
- Produces:
  - DOM: `[data-sheet-layer]` holding `[data-sheet-backdrop]`, and `section.sheet#sheet-<id>[data-sheet][data-title][data-glyph][data-tint]` with a `[data-sheet-close]` button.
  - `openSheet(id, trigger)` and `closeSheet()` from `src/scripts/sheet.ts`.
  - Document events: `island:sheet` (detail `{ id, title, glyph, tint } | null`) and `sheet:close`.
  - `installSheetSync(core)`.

- [ ] **Step 1: Write the failing e2e test**

`tests/e2e/sheet.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('heyparsa-intro-seen', '1'));
});

test('the + button opens HelpFinity in a sheet and the island follows', async ({ page }) => {
  await page.goto('/');
  const btn = page.locator('[data-sheet-open="helpfinity"]');
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  const sheet = page.locator('#sheet-helpfinity');
  await expect(sheet).toBeVisible();
  await expect(sheet).toHaveAttribute('role', 'dialog');
  await expect(sheet).toContainText('Coda, 2026.');
  await expect(page).toHaveURL(/#helpfinity$/);
  await expect(page.locator('#island')).toHaveAttribute('data-view', 'sheet');
  await expect(page.locator('#island [data-slot="sheet-title"]')).toHaveText('HelpFinity');
  await expect(page.locator('main')).toHaveAttribute('inert', '');
});

test('Escape closes the sheet and returns focus to the + button', async ({ page }) => {
  await page.goto('/');
  const btn = page.locator('[data-sheet-open="helpfinity"]');
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  const sheet = page.locator('#sheet-helpfinity');
  await expect(sheet).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(btn).toBeFocused();
  await expect(page.locator('main')).not.toHaveAttribute('inert', '');
  expect(page.url()).not.toContain('#helpfinity');
});

test('the island closes the sheet', async ({ page }) => {
  await page.goto('/');
  const btn = page.locator('[data-sheet-open="iranspoti"]');
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  await expect(page.locator('#island')).toHaveAttribute('data-view', 'sheet');
  await page.locator('#island [data-action="close-sheet"]').click();
  await expect(page.locator('#sheet-iranspoti')).toBeHidden();
  await expect(page.locator('#island')).not.toHaveAttribute('data-view', 'sheet');
});

test('a #iranspoti link opens that sheet on load', async ({ page }) => {
  await page.goto('/#iranspoti');
  await expect(page.locator('#sheet-iranspoti')).toBeVisible();
  await expect(page.locator('#sheet-iranspoti')).toContainText('The first draft of Sibkade.');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('titles and sheet text are still readable', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#sheet-helpfinity')).toBeVisible();
    await expect(page.locator('#sheet-helpfinity')).toContainText('Mind Mirror');
  });
});
```

Run: `npm run test:e2e -- sheet.spec.ts`
Expected: FAIL (`#sheet-helpfinity` does not exist).

- [ ] **Step 2: Create `src/components/ProjectSheet.astro` and `src/styles/sheet.css`**

`src/components/ProjectSheet.astro`:
```astro
---
import { render, type CollectionEntry } from 'astro:content';

interface Props {
  entry: CollectionEntry<'projects'>;
}
const { entry } = Astro.props;
const { Content } = await render(entry);
const d = entry.data;
const titleId = `sheet-${entry.id}-title`;
---
<section class="sheet" id={`sheet-${entry.id}`} data-sheet={entry.id} data-title={d.title} data-glyph={d.glyph} data-tint={d.tint.join(',')} aria-labelledby={titleId} tabindex="-1">
  <div class="sheet-inner">
    <button class="sheet-close" type="button" data-sheet-close aria-label={`Close ${d.title}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
    </button>
    <p class="sheet-meta">{d.role} · {d.years}</p>
    <h2 class="sheet-title" id={titleId}>{d.title}</h2>
    <p class="sheet-tagline">{d.tagline}</p>
    <div class="prose sheet-body"><Content /></div>
  </div>
</section>
```

`src/styles/sheet.css`:
```css
.sheet-layer { position: fixed; inset: 0; z-index: 30; display: grid; place-items: center; padding: 72px 16px 24px; }
.js .sheet-layer:not(.is-open) { display: none; }
.sheet-backdrop { position: absolute; inset: 0; background: var(--backdrop); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); opacity: 0; transition: opacity .35s ease; }
.sheet-layer.is-shown .sheet-backdrop { opacity: 1; }
.sheet { position: relative; width: min(720px, 100%); max-height: calc(100vh - 96px); max-height: calc(100svh - 96px); overflow: auto; overscroll-behavior: contain; border-radius: 32px; background: var(--card); box-shadow: 0 30px 80px rgba(0, 0, 0, .25); transform-origin: top left; outline: none; }
.js .sheet:not(.is-active) { display: none; }
.sheet-inner { padding: clamp(32px, 6vw, 64px); }
.js .sheet .sheet-inner { opacity: 0; transition: opacity .25s ease .05s; }
.js .sheet.is-settled .sheet-inner { opacity: 1; }
.sheet-close { position: sticky; top: 0; z-index: 1; float: right; width: 36px; height: 36px; margin: -8px -8px 0 16px; border-radius: 50%; display: grid; place-items: center; color: var(--text); background: var(--bg-2); }
.sheet-close svg { width: 16px; height: 16px; }
.sheet-meta { font-size: 14px; font-weight: 500; color: var(--text-3); }
.sheet-title { margin-top: 8px; font-size: clamp(40px, 6vw, 72px); font-weight: 700; letter-spacing: -.045em; line-height: 1; }
.sheet-tagline { margin-top: 14px; font-size: clamp(20px, 2.2vw, 28px); font-weight: 600; letter-spacing: -.02em; line-height: 1.25; }
.sheet-body.prose { width: auto; margin-top: 32px; font-size: 19px; }
.sheet-lock, .sheet-lock body { overflow: hidden; }

/* Without JavaScript the sheets are ordinary sections at the end of the page. */
html:not(.js) .sheet-layer { position: static; display: block; padding: 0 0 80px; }
html:not(.js) .sheet-backdrop, html:not(.js) .sheet-close { display: none; }
html:not(.js) .sheet { width: var(--wrap); max-height: none; margin: 0 auto 24px; box-shadow: none; background: var(--bg-2); }
```

- [ ] **Step 3: Create `src/scripts/sheet.ts`**

```ts
import { springEasing } from './island/spring';

const OPEN = springEasing(0.5, 0.86);
const CLOSE = springEasing(0.38, 1);

interface Opened {
  id: string;
  sheet: HTMLElement;
  card: HTMLElement | null;
  trigger: HTMLElement | null;
}

let opened: Opened | null = null;
let busy = false;

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const layer = () => document.querySelector<HTMLElement>('[data-sheet-layer]');

/** The transform that makes an element laid out at `base` appear at `target` (transform-origin: top left). */
function transformFor(target: DOMRect, base: DOMRect): string {
  return `translate(${target.left - base.left}px, ${target.top - base.top}px) scale(${target.width / base.width}, ${target.height / base.height})`;
}

function tell(detail: { id: string; title: string; glyph: string; tint: string[] } | null): void {
  document.dispatchEvent(new CustomEvent('island:sheet', { detail }));
}

function cleanup(): void {
  if (!opened) return;
  const { sheet, card } = opened;
  for (const a of sheet.getAnimations()) a.cancel();
  sheet.classList.remove('is-active', 'is-settled');
  sheet.removeAttribute('role');
  sheet.removeAttribute('aria-modal');
  if (card) card.style.visibility = '';
  layer()?.classList.remove('is-open', 'is-shown');
  document.querySelector('main')?.removeAttribute('inert');
  document.documentElement.classList.remove('sheet-lock');
  opened = null;
  tell(null);
}

export async function openSheet(id: string, trigger: HTMLElement | null): Promise<void> {
  const l = layer();
  const sheet = document.getElementById(`sheet-${id}`);
  if (busy || opened || !l || !sheet) return;
  busy = true;
  const card = document.querySelector<HTMLElement>(`[data-card="${id}"]`);
  opened = { id, sheet, card, trigger };
  l.classList.add('is-open');
  sheet.classList.add('is-active');
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  document.querySelector('main')?.setAttribute('inert', '');
  document.documentElement.classList.add('sheet-lock');
  history.replaceState(history.state, '', `#${id}`);
  tell({ id, title: sheet.dataset.title ?? id, glyph: sheet.dataset.glyph ?? 'alert', tint: (sheet.dataset.tint ?? '#8e8e93,#48484a').split(',') });
  requestAnimationFrame(() => l.classList.add('is-shown'));
  if (card && !reduced()) {
    const from = card.getBoundingClientRect();
    const to = sheet.getBoundingClientRect();
    card.style.visibility = 'hidden';
    await sheet
      .animate([{ transform: transformFor(from, to), borderRadius: '28px' }, { transform: 'none', borderRadius: '32px' }], { duration: OPEN.duration, easing: OPEN.easing })
      .finished.catch(() => undefined);
  }
  sheet.classList.add('is-settled');
  sheet.focus({ preventScroll: true });
  busy = false;
}

export async function closeSheet(): Promise<void> {
  if (busy || !opened) return;
  busy = true;
  const { sheet, card, trigger } = opened;
  sheet.classList.remove('is-settled');
  layer()?.classList.remove('is-shown');
  if (card && !reduced()) {
    const to = card.getBoundingClientRect();
    const from = sheet.getBoundingClientRect();
    await sheet
      .animate([{ transform: 'none', borderRadius: '32px' }, { transform: transformFor(to, from), borderRadius: '28px' }], { duration: CLOSE.duration, easing: CLOSE.easing, fill: 'forwards' })
      .finished.catch(() => undefined);
  }
  cleanup();
  history.replaceState(history.state, '', location.pathname + location.search);
  trigger?.focus({ preventScroll: true });
  busy = false;
}

document.addEventListener('click', (e) => {
  const t = e.target as Element;
  const openBtn = t.closest<HTMLElement>('[data-sheet-open]');
  if (openBtn) {
    e.preventDefault();
    void openSheet(openBtn.dataset.sheetOpen ?? '', openBtn);
    return;
  }
  if (opened && (t.closest('[data-sheet-close]') || t.closest('[data-sheet-backdrop]'))) void closeSheet();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && opened) void closeSheet();
});
document.addEventListener('sheet:close', () => void closeSheet());
document.addEventListener('astro:before-swap', () => {
  cleanup();
  busy = false;
});
document.addEventListener('astro:page-load', () => {
  const id = location.hash.slice(1);
  if (id && document.getElementById(`sheet-${id}`)) void openSheet(id, document.querySelector<HTMLElement>(`[data-sheet-open="${id}"]`));
});
```

- [ ] **Step 4: Create `src/scripts/island/features/sheet-sync.ts`**

```ts
import type { IslandCore } from '../core';
import type { GlyphName, Tint } from '../../../lib/glyphs';

interface SheetDetail {
  id: string;
  title: string;
  glyph: GlyphName;
  tint: Tint;
}

/** While a sheet is open the island shows it, and tapping the island closes it. */
export function installSheetSync(core: IslandCore): void {
  document.addEventListener('island:sheet', (e) => {
    const d = (e as CustomEvent<SheetDetail | null>).detail;
    if (d) {
      core.dom.setSheet(d.title, d.glyph, d.tint);
      core.state.sheet = d.id;
      core.state.menu = false;
      core.state.contact = false;
      core.state.word = null;
      core.emit('lit', null);
    } else {
      core.state.sheet = null;
    }
    core.resolve(true);
  });
  core.on('action', (action) => {
    if (action === 'close-sheet') document.dispatchEvent(new CustomEvent('sheet:close'));
  });
}
```

- [ ] **Step 5: Wire it up**

`src/pages/index.astro`:
- add `import ProjectSheet from '../components/ProjectSheet.astro';` and `import '../styles/sheet.css';`;
- compute `const sheets = projects.filter((p) => !p.data.page).sort((a, b) => a.data.order - b.data.order);`;
- inside `<Base>` (after `<PageCtx … />`), add:
```astro
  <Fragment slot="overlay">
    <div class="sheet-layer" data-sheet-layer>
      <div class="sheet-backdrop" data-sheet-backdrop></div>
      {sheets.map((entry) => <ProjectSheet entry={entry} />)}
    </div>
  </Fragment>
```

`src/layouts/Base.astro`: before `</body>`, add:
```astro
    <script>
      import '../scripts/sheet';
    </script>
```

`src/scripts/island/index.ts`: add `import { installSheetSync } from './features/sheet-sync';` and call `installSheetSync(core);` after `installRouter(core);`.

- [ ] **Step 6: Update the spec's no-JS wording**

In `docs/superpowers/specs/2026-09-26-portfolio-site-design.md` §5.8, replace
`Sheets without JS fall back to their text rendered inline under the card.`
with
`Sheets without JS fall back to plain sections at the end of the home page (they live outside <main> so the open sheet can make <main> inert).`

- [ ] **Step 7: Verify**

Run: `npm test && npm run test:e2e && npx astro check`
Expected: all green on both browsers.

In the browser pane:
- The "+" on HelpFinity grows the card into the sheet.
- The island shows "HelpFinity · Close".
- Esc, the backdrop and the island each shrink it back into the card.

- [ ] **Step 8: Commit**

```bash
git add src tests docs/superpowers/specs
git commit -m "Open HelpFinity and IranSpoti in sheets that grow from their cards

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Accessibility, reduced motion, phone checks, build privacy guard, README

**Files:**
- Create: `tests/e2e/a11y.spec.ts`, `tests/build/privacy-dist.test.ts`, `README.md`

**Interfaces:**
- Consumes: everything above. This task only adds verification and documentation. If a test fails, fix the feature file named in its failure message, using the behaviour described in the spec.

- [ ] **Step 1: Write the e2e checks**

`tests/e2e/a11y.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('skips the long intro and shows the title without blur', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#island')).toHaveAttribute('data-view', 'home', { timeout: 1500 });
    await expect(page.locator('h1')).toHaveCSS('opacity', '1');
    await expect(page.locator('h1')).toHaveCSS('filter', 'none');
  });
});

test('keyboard: skip link first, then the island opens its menu on focus', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Safari skips links on Tab unless the user enables it');
  await page.addInitScript(() => sessionStorage.setItem('heyparsa-intro-seen', '1'));
  await page.goto('/');
  await expect(page.locator('#island')).toHaveAttribute('data-view', 'home');
  await page.keyboard.press('Tab');
  await expect(page.locator('a.skip-link')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#island nav.isl')).toBeFocused();
  await expect(page.locator('#island')).toHaveAttribute('data-view', 'menu-home');
  await page.keyboard.press('Escape');
  await expect(page.locator('#island')).toHaveAttribute('data-view', 'home');
});

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('tap opens the menu; a live word previews on the first tap and opens on the second', async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem('heyparsa-intro-seen', '1'));
    await page.goto('/');
    await expect(page.locator('#island')).toHaveAttribute('data-view', 'home');
    await page.locator('#island nav.isl').tap();
    await expect(page.locator('#island')).toHaveAttribute('data-view', 'menu-home');
    await page.locator('h1').tap();
    await expect(page.locator('#island')).toHaveAttribute('data-view', 'home');
    await page.locator('a[data-word="sibkade"]').tap();
    await expect(page.locator('#island')).toHaveAttribute('data-view', 'd-sibkade');
    await expect(page).toHaveURL(/\/$/);
    await page.locator('a[data-word="sibkade"]').tap();
    await expect(page).toHaveURL(/\/sibkade$/);
  });

  test('nothing overflows the screen horizontally', async ({ page }) => {
    for (const path of ['/', '/sibkade', '/barayand']) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    }
  });
});
```

- [ ] **Step 2: Write the build privacy test**

`tests/build/privacy-dist.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { NOTES_DIR, listFiles, privateMarkers, readPrivateText } from '../helpers/private-markers';

describe('built site', () => {
  it('exists', () => {
    expect(existsSync('dist/index.html')).toBe(true);
  });

  it.skipIf(!existsSync(NOTES_DIR))('contains no private notes or figures', () => {
    const markers = privateMarkers(readPrivateText());
    const files = listFiles('dist', ['.html', '.js', '.css', '.json', '.txt', '.xml']);
    expect(files.length).toBeGreaterThan(3);
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      for (const m of markers) expect(text.includes(m), `${file} leaks: ${m.slice(0, 60)}`).toBe(false);
    }
  });
});
```

- [ ] **Step 3: Run the checks**

Run: `npm run test:build && npm run test:e2e && npx astro check`
Expected: all green. If a phone or keyboard check fails, fix the relevant feature: `menu.ts` for focus/tap, `words.ts` for taps, `Island.astro` CSS for overflow.

- [ ] **Step 4: Check the island bundle size**

Run:
```bash
for f in dist/_astro/*.js; do printf "%6d  %s\n" "$(gzip -c "$f" | wc -c)" "$f"; done | sort -n
```
Expected: the island bundle (the file that contains `island-ready`; find it with `grep -l island-ready dist/_astro/*.js`) is under 25000 bytes gzipped.

- [ ] **Step 5: Write `README.md`**

````markdown
# heyparsa.com

Personal site of Parsa Kharazmian. Astro 7, static output, no framework, no web fonts.
The Dynamic Island at the top is the navigation. It persists across pages (`transition:persist="island"`) and moves on springs.

## Run

```bash
npm install
npm run dev        # http://localhost:4321
npm test           # unit tests (Vitest)
npm run test:e2e   # browser tests (Playwright: Chromium + WebKit) against a production build
npm run test:build # build, then check dist/ for private-note leaks
npm run check      # astro check (types)
```

## Edit the text

All copy lives in `content/`:

| Path | What |
|---|---|
| `content/site/home.md` | hero name and lines (`[Word](key)` makes a live word), island greeting, word previews, playground intro |
| `content/site/about.md` | about text, beliefs, timeline, "What I ship with", links |
| `content/projects/*.md` | one file per project. `page: true` gets its own page (`/slug`); `page: false` opens as a sheet from its card. `##` headings become chapters in the island; a `>` blockquote is a pull quote |
| `content/playground/*.md` | weekend projects, in `order` |
| `content/notes/` | private notes. Git-ignored, never loaded, and `npm run test:build` fails if any of it reaches the site |

## Deploy

The output is plain static files in `dist/`.

- **Vercel:** import the repo; the Astro preset is detected automatically (build `npm run build`, output `dist`).
- **Own server (nginx):**
  ```nginx
  root /var/www/heyparsa/dist;
  location / { try_files $uri $uri/ =404; }
  error_page 404 /404.html;
  ```

## How the island works

- `src/components/Island.astro`: the markup, one view per state.
- `src/scripts/island/`:
  - pure logic, unit-tested: `spring.ts`, `resolve.ts` (which view wins), `scroll.ts`, `title-motion.ts`;
  - the runtime: `dom.ts`, `core.ts`, and one file per feature in `features/`.
- Each page ships its island context as JSON in `main #page-ctx`.
- Design reference: `docs/superpowers/specs/2026-09-26-portfolio-site-design.md` and the prototype in `docs/prototypes/`.
````

- [ ] **Step 6: Final manual pass in the browser pane**

Start `npm run dev` and open <http://localhost:4321>. Check each item in light and dark mode, and at desktop width and at 390 px (use the pane's viewport menu):
- The first-visit intro plays.
- Live words preview on hover, and on tap on phone widths.
- The menu opens, Contact works, and the email copies.
- Section names roll as you scroll; the progress bubble splits off and goes to the top.
- Home → Sibkade card → chapter names → "Next · Barayand" → back.
- The HelpFinity and IranSpoti sheets open and close.
- The theme persists across pages.

Note anything that feels off (spring speed, sizes) and adjust the constants listed under Global Constraints.

- [ ] **Step 7: Commit**

```bash
git add tests README.md
git commit -m "Add accessibility, phone and build privacy checks, and README

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Spec coverage

| Spec section | Task |
|---|---|
| §2 decisions: stack, hosting, typography only, English, pages | 1, 3, 4, 5 |
| §3 information architecture | 4, 5 |
| §4 content model, notes privacy, pull quotes, Barayand chapters | 2, 5, 12 |
| §5.1–5.2 island anatomy, state, resolver | 6, 7, 8 |
| §5.3 views | 7 (markup), 8–11 (behaviour) |
| §5.4 motion rules, title rule, intro once per session, reduced motion | 6, 8, 12 |
| §5.5 navigation choreography, theme across swaps, page transitions | 3, 10 |
| §5.6 live words | 4, 9 |
| §5.7 sheets | 11 |
| §5.8 accessibility | 3, 8, 11, 12 |
| §6 page design | 3, 4, 5 |
| §8 testing, privacy, performance targets | every task, 12 |
