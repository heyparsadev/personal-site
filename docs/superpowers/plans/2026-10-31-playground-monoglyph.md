# Playground in Monoglyph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the home page's Playground list with a black Monoglyph band in which every project has its own glyph stage drawn from real values. Keep the current list one content switch away.

**Architecture:**
- **Content:** a `stage` block in each `content/playground/*.md`, validated per scene at build time.
- **Section:** a new `PlaygroundStage.astro` renders the band and its HUDs as HTML.
- **Engine:** a small client engine (pure math plus a cell buffer) and one module per scene draw onto each stage's canvas.
- **Wiring:** `index.astro` picks `PlaygroundStage` or the untouched `Playground` from `playgroundStyle` in `home.md`.

**Tech Stack:** Astro 7 (static, `ClientRouter`), TypeScript, Canvas 2D, zod (`astro/zod`, build time only), Vitest (node), Playwright (Chromium only).

**Spec:** `docs/superpowers/specs/2026-10-31-playground-monoglyph-design.md`. The visual and behavioural reference is `docs/prototypes/playground-monoglyph.html`, layout 2. Its `SCENES` object and `Stage` class are the reference bodies for Tasks 2, 3 and 5. Do not read or touch `docs/prototypes/ascii-samples.html`.

## Global Constraints

**Scope**
- Only the Playground section changes. The hero, the island's markup and behaviour, the other sections and the project pages stay as they are. The one exception is the island filter override in Task 6.
- `src/components/Playground.astro` stays byte-for-byte unchanged. It is the `list` style.
- `playgroundStyle: stage | list` in `content/site/home.md`, defaulting to `stage`.

**Content rules**
- Every mark on a stage is a value. Simulated content says so: Bargasht's range reads "two months, simulated".

**Colours**
- The band is `#000` in both themes.
- Stage tokens: ink `#fff`, text `#f5f5f7`, muted `rgba(255, 255, 255, .62)`, hud `.5`, label `.45`, edge `.16`. The stage border is white at `.12`.
- In dark, the band's top and bottom edges are 1px `var(--line)`.

**Glyph engine**
- 12px Geist Mono glyphs on 15px rows; a column is `measureText('0').width` wide.
- Ramp `' .:-=+*#%@'`. Level = clamp(round(ink × 9), 1, 9); alpha = 0.16 + 0.84 × level ÷ 9. Ink ≤ 0.03 draws nothing.

**Motion**
- **Opening:** 16 chunks × 45ms, with the newest chunk drawn in noise from `#%&@$*+=/\<>?!`.
- **Shimmer:** ±0.05 ink, re-rolled per cell at `floor(now/1000 × 0.8 + hash(c, r, 9) × 8)`.
- **Frame rate:** about 11fps (90ms); the planet runs at 30fps.
- **Off screen:** no drawing.
- **Reduced motion:** a still frame, with no opening, shimmer or decode.
- **Decode:** 42ms steps, digits only.

**Fonts**
- Self-hosted in `public/fonts/` with `font-display: swap`, and no preload.
- No request to `fonts.googleapis.com` or `fonts.gstatic.com` at runtime.

**Hooks existing tests rely on**
- `section#playground` with `aria-labelledby="playground-title"`, and `h2#playground-title` whose text is "Playground".
- Each project is `li.pitem`, its title `.pitem-title` (an `h3`, linked when `url`), and Delta's Source link `a.pitem-src`, whose accessible name is "Source code for Delta on GitHub".
- 8 items, in content `order`.

**Storage and verification**
- Every `localStorage` access is wrapped in `try`/`catch`.
- E2E runs Chromium only: `npm run test:e2e -- --project=chromium`. WebKit segfaults on this machine.

**Git**
- Work on branch `playground-monoglyph`, and do not push.
- Commits: an imperative subject, a short "why" body, and a final line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Narrow phones:** a 375px viewport gives stages of about 40 × 12 cells. Every scene must draw without throwing and without labels running off the grid. Test: Task 3's small-grid case.
2. **Fonts that never arrive** (blocked or offline): stages must still draw in `ui-monospace` after the 2.5s timeout. Test: Task 5's blocked-fonts case.
3. **Leaving home and coming back** through the `ClientRouter`: stages must remount once, with no duplicate loops, and `island-on-stage` must not stick on another page. Test: Task 6's navigation case.
4. **Keyboard focus on black:** the site's accent outline is `#0066cc`, about 3.3:1 on `#000`, which is weak. Inside the band, focus rings are white. Test: Task 4's focus-ring case.
5. **Storage that throws** (private mode, blocked site data): the pause toggle must still work for the visit. Test: Task 6's throwing-storage case.

---

### Task 1: Stage content model

**Files:**
- Create: `src/lib/playground-stage.ts`
- Modify: `src/content.config.ts` (the playground and home schemas)
- Modify: all 8 files in `content/playground/`, and `content/site/home.md`
- Test: `tests/unit/playground-content.test.ts`

**Interfaces:**
- Produces, in `src/lib/playground-stage.ts`:
  - `SCENE_IDS = ['archive', 'agent-run', 'planet', 'tree', 'river', 'push', 'leaderboard', 'plugins', 'name'] as const`
  - `type SceneId`
  - `stageSchema`: a zod discriminated union on `scene`. Every branch shares:
    - `stat: { label: string; value: string; sub?: string }`
    - `legend: { key: string; text: string; dim?: boolean }[]`
    - `range: string`
  - The branches' `params`:
    - `archive`: `{ kinds: { glyph: string; name: string }[] }` (exactly 5)
    - `agent-run`: `{ lanes: string[]; never: string }` (`never` must be one of `lanes`)
    - `planet`: `{}`
    - `tree`: `{ years: number }`
    - `river`: `{ sea: number; channels: { name: string; from: number; to?: number; fate: 'oxbow' | 'main' | 'dries' | 'braids' }[] }`
    - `push`: `{ push: number; roll: number; rest: number }`
    - `leaderboard`: `{ low: number; high: number; interval: number; runs: [string, number, number, number][] }`
    - `plugins`: `{ venture: number; validator: number; glass: number }`
    - `name`: `{}`
  - `type StageConfig = z.infer<typeof stageSchema>`
  - `PLAYGROUND_STYLES = ['stage', 'list'] as const`
- Content behaviour:
  - An unknown `scene` fails validation, so a typo shows up at build time.
  - A missing `stage` block is allowed and means the `name` fallback.

- [ ] **Step 1: Write the failing test.** `tests/unit/playground-content.test.ts` reads each `content/playground/*.md` frontmatter with `js-yaml` (`load` of the text between the first two `---` lines). Its cases:
  - `every stage block validates`: `stageSchema.safeParse(fm.stage).success` is true for all 8.
  - `each project uses its scene`:
    - `bargasht→archive`, `applybot→agent-run`, `apsis→planet`, `the-descent→tree`;
    - `delta→river`, `sisyphus→push`, `persian-llm-eval→leaderboard`, `claude-code-plugins→plugins`.
  - `the leaderboard holds the README's 17 runs`:
    - `runs.length === 17`;
    - `runs[0]` equals `['gpt-5.5 + thinking (high)', 0.9702, 0.9197, 0.945]`;
    - every score is in [0, 1].
  - `an unknown scene is rejected`: `stageSchema.safeParse({ ...valid, scene: 'riverr' }).success === false`.
  - `home picks the stage style`: `home.md` frontmatter `playgroundStyle === 'stage'`, and that value is in `PLAYGROUND_STYLES`.
- [ ] **Step 2:** Run `npx vitest run tests/unit/playground-content.test.ts`. Expected: FAIL, because the module is missing.
- [ ] **Step 3: Implement `src/lib/playground-stage.ts`,** then wire up the content:
  - In `content.config.ts`, add `stage: stageSchema.optional()` to the playground schema, and `playgroundStyle: z.enum(PLAYGROUND_STYLES).default('stage')` to the home schema.
  - Add `playgroundStyle: stage  # list = the previous plain list` to `home.md`.
  - Add these `stage` blocks, values exactly as given:

```yaml
# bargasht.md
stage:
  scene: archive
  stat: { label: Kinds of saves it files, value: "5", sub: "It files five kinds of saves: reels, podcasts, screenshots, book pages and voice notes." }
  legend: [{ key: "▓", text: reels }, { key: "▒", text: podcasts }, { key: "░", text: screens }, { key: "#", text: pages }, { key: ":", text: voice }]
  range: two months, simulated
  params: { kinds: [{ glyph: "▓", name: reel }, { glyph: "▒", name: podcast }, { glyph: "░", name: screenshot }, { glyph: "#", name: book page }, { glyph: ":", name: voice note }] }
# applybot.md
stage:
  scene: agent-run
  stat: { label: Applications it submits for you, value: "0", sub: "It interviews, searches, reads the admissions pages and writes, and never submits an application for you." }
  legend: [{ key: "%#", text: a tool at work }, { key: "//", text: never, dim: true }]
  range: one run, on a budget
  params: { lanes: [interview, search, read, write, submit], never: submit }
# apsis.md
stage:
  scene: planet
  stat: { label: A Martian day runs, value: "+37 min", sub: "A Martian day runs 37 minutes longer than ours." }
  legend: [{ key: "@%", text: day side }, { key: ".", text: night side, dim: true }, { key: "+", text: the hour on mars }]
  range: mars time
  params: {}
# the-descent.md
stage:
  scene: tree
  stat: { label: Your scrollbar spans, value: "3.8B years", sub: "The scrollbar spans 3.8 billion years, back to the last universal common ancestor." }
  legend: [{ key: "@", text: you }, { key: "#", text: your line }, { key: "/|\\", text: lines that merge into it, dim: true }]
  range: now
  params: { years: 3.8 }
# delta.md
stage:
  scene: river
  stat: { label: Channels in the river, value: "4", sub: "Four channels: IranSpoti, Sibkade, HelpFinity and Barayand, from 2019 to today." }
  legend: [{ key: "%#", text: a project, running }, { key: ".", text: dried up, dim: true }]
  range: 2019 – 2026
  params:
    sea: 2026.86
    channels:
      - { name: iranspoti, from: 2019, to: 2020, fate: oxbow }
      - { name: sibkade, from: 2020, fate: main }
      - { name: helpfinity, from: 2023.95, to: 2025.55, fate: dries }
      - { name: barayand, from: 2026.42, fate: braids }
# sisyphus.md
stage:
  scene: push
  stat: { label: Time left on this push, value: "1:00", sub: "A one-minute push runs here; when it ends, the boulder rolls back down." }
  legend: [{ key: "@", text: the boulder }, { key: "%#", text: a mountain with no summit }]
  range: push, roll, walk down
  params: { push: 60, roll: 2.4, rest: 15 }
# persian-llm-eval.md
stage:
  scene: leaderboard
  stat: { label: Top combined score, value: "0.945", sub: "The top combined score on public_eval and hard is 0.945, across 17 runs." }
  legend: [{ key: "@%", text: combined score }, { key: ".:", text: 95% interval, dim: true }]
  range: v1.1 leaderboard
  params:
    low: 0.8
    high: 0.98
    interval: 0.03   # ±3 pp per split, 95% (README)
    runs:            # [run, public_eval, hard, combined], README "All models on public_eval and hard", 2026-10-31
      - ["gpt-5.5 + thinking (high)", 0.9702, 0.9197, 0.9450]
      - ["gpt-5.5", 0.9622, 0.9183, 0.9403]
      - ["gpt-5.5 + thinking (medium)", 0.9651, 0.9147, 0.9399]
      - ["gpt-5", 0.9659, 0.8903, 0.9281]
      - ["gpt-5-mini", 0.9558, 0.8979, 0.9269]
      - ["claude-sonnet-4-6", 0.9318, 0.9090, 0.9204]
      - ["gpt-5 + thinking (medium)", 0.9479, 0.8774, 0.9127]
      - ["claude-opus-5.5, low", 0.9269, 0.8969, 0.9119]
      - ["claude-opus-5.5, high", 0.9239, 0.8881, 0.9060]
      - ["claude-opus-4-7", 0.9296, 0.8766, 0.9031]
      - ["claude-opus-5.5, medium", 0.9246, 0.8730, 0.8988]
      - ["gpt-5-nano", 0.9397, 0.8502, 0.8950]
      - ["claude-sonnet-5.5, high", 0.9164, 0.8617, 0.8890]
      - ["claude-sonnet-5.5, no thinking", 0.8961, 0.8562, 0.8762]
      - ["claude-sonnet-5.5, medium", 0.8680, 0.8806, 0.8743]
      - ["claude-sonnet-5.5, low", 0.8708, 0.8680, 0.8694]
      - ["claude-haiku-4-5", 0.8434, 0.8219, 0.8326]
# claude-code-plugins.md
stage:
  scene: plugins
  stat: { label: Plugins, learned by building, value: "3", sub: "Three open-source plugins: Venture, Idea Validator and Liquid Glass." }
  legend: [{ key: "::", text: inputs }, { key: "▓", text: one workspace }, { key: "//", text: the line it won’t cross, dim: true }]
  range: open source
  params: { venture: 5, validator: 10, glass: 9 }
```

- [ ] **Step 4:** Run `npx vitest run tests/unit/playground-content.test.ts && npm run check`. Expected: PASS, with 0 errors.
- [ ] **Step 5:** Commit: "Give each Playground project a stage block in its content".

### Task 2: Glyph math and the draw context

**Files:**
- Create: `src/scripts/playground/math.ts`, `src/scripts/playground/engine.ts`
- Test: `tests/unit/playground-math.test.ts`, `tests/unit/playground-engine.test.ts`

**Interfaces:**
- Produces, in `math.ts`:
  - `RAMP`, `NOISE`
  - `clamp(x, lo, hi)`, `lerp(a, b, t)`, `smooth(e0, e1, x)`, `norm3(x, y, z): [number, number, number]`
  - `hash(x, y, z): number`, in [0, 1), as in Monoglyph
  - `vnoise(x, y): number`
  - `phi(z): number`, the standard normal CDF
  - `clock(sec): string`, ceil to whole seconds, `m:ss`, never negative
  - `marsHours(epochMs): number`, in [0, 24), from MSD = (JD_TT − 2405522.0028779) ÷ 1.0274912517, with JD_TT = epochMs ÷ 86400000 + 2440587.5 + 69.184 ÷ 86400
  - `marsTime(epochMs): string`, `HH:MM`
  - `inkLevel(v): number` (1–9) and `inkAlpha(level): number`
- Produces, in `engine.ts`:
  - `LINE = 15`, `GLYPH_PX = 12`
  - `STYLE: { ink: string[]; bright; label; grid; scan; loss }`, white at 1 for bright, .45 for label, .16 for grid, .35 for scan and .24 for loss
  - `interface Grid { cols: number; rows: number; cw: number }`
  - `interface Cell { style: string; ch: string; c: number; r: number; pri: number }`
  - `interface Draw extends Grid`, with:
    - `t`, `now`, `still: boolean`, `hover: { c: number; r: number } | null`
    - `put(style, ch, c, r, pri = 1)`
    - `ink(c, r, v, pri?)`, `glyph(ch, c, r, v, pri?)`, where the default `pri` is the level
    - `text(s, c, r, style = STYLE.label, pri = 40)`
    - `bright(ch, c, r, pri = 60)`
  - `createDraw(grid, frame: { t; now; still; hover }): { g: Draw; cells: Map<number, Cell> }`
  - `stroke(g, c0, r0, c1, r1, v, pri?, glyph?)`
  - `interface Readout { c: number; r: number; html: string }`
  - `interface Status { label?: string; value?: string }`
  - `interface Scene<S = any>` with `fps?`, `stillT?`, `init(grid): S`, `draw(g, s)`, `readout?(g, s)`, `status?(s)`, `range?(s)`, and `pointer?(s, x: number | null, y: number | null, size: { w: number; h: number })`

- [ ] **Step 1: Write the failing tests.**
  - `playground-math.test.ts`:
    - `phi(0)` is 0.5 (±1e-6); `phi(1.96)` is 0.975 (±1e-3).
    - `clock`: `clock(60)` is `'1:00'`; `clock(59.2)` is `'1:00'`; `clock(0.4)` is `'0:01'`; `clock(0)` and `clock(-3)` are `'0:00'`.
    - `marsHours(Date.UTC(2000, 0, 6))` is within 0.02h of midnight: `Math.min(h, 24 - h) < 0.02`, Mars24's MSD 44796.0 epoch.
    - `marsTime` matches `/^\d\d:\d\d$/`.
    - `hash` is deterministic and in [0, 1).
    - `inkLevel(0.5)` is 5; `inkLevel(2)` is 9; `inkLevel(0.01)` is 1.
    - `inkAlpha(9)` is 1; `inkAlpha(1)` is ≈ 0.2533.
  - `playground-engine.test.ts`:
    - a higher `pri` wins a cell and a lower one doesn't replace it;
    - out-of-grid puts and `' '` are dropped;
    - `ink(c, r, 0.03)` draws nothing;
    - `ink` with `still: true` maps 0.5 to `RAMP[5]`;
    - `text('ab', 3, 2)` fills cells (3,2) and (4,2);
    - `stroke` picks `|` for a vertical line, `-` for a horizontal one, `\` for down-right and `/` for down-left, with `cw = 7.2`.
- [ ] **Step 2:** Run `npx vitest run tests/unit/playground-math.test.ts tests/unit/playground-engine.test.ts`. Expected: FAIL, because the modules are missing.
- [ ] **Step 3: Implement both modules.** Port the bodies from the prototype: `hash`, `vnoise`, `erf` and `phi`, `clock`, `marsHours`, `marsTime`, `stroke`, and the `put`/`ink`/`glyph`/`text`/`bright` closures in `Stage.draw`. `createDraw` is those closures over a fresh `Map`, with no canvas.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5:** Commit: "Add the glyph math and the draw context for the Playground stages".

### Task 3: The nine scenes and the registry

**Files:**
- Create: `src/scripts/playground/scenes/{archive,agent-run,planet,tree,river,push,leaderboard,plugins,name}.ts` and `src/scripts/playground/scenes/index.ts`
- Test: `tests/unit/playground-scenes.test.ts`

**Interfaces:**
- Consumes: Task 2's `Draw`, `Scene`, `createDraw`, `stroke`, `STYLE` and the math helpers. Param types mirror Task 1's branches; these modules don't import zod.
- Produces:
  - Each module exports one factory, for example `export function river(p: RiverParams): Scene`.
  - `scenes/index.ts` exports `interface StagePayload { scene: string; params: Record<string, unknown>; title: string; year: number }` and `sceneFor(p: StagePayload): Scene`. An unknown id gets `name({ title, year })`.
- Scene behaviour:
  - Port each scene from the prototype's `SCENES` entry, reading the values from params instead of constants:
    - Bargasht's kinds come from `kinds`;
    - ApplyBot's lanes from `lanes`, with `never` hatched;
    - Delta's channels from `channels` and its `sea`, with the axis running from the first `from` to `sea + 0.64`;
    - Sisyphus's timing from `push`, `roll` and `rest`;
    - the leaderboard's data from `runs`, `low` and `high`, with σ = `interval / 1.96 / Math.SQRT2`;
    - the plugins' counts from `venture`, `validator` and `glass`;
    - the tree's counter from `years`.
  - Two pieces are new, with no prototype: `name` rasterises the title into the grid with an `OffscreenCanvas` when one exists, falling back to drawing the title as `text`; the planet's range is `` `mars time ${marsTime(Date.now())}` ``.
  - Bargasht's readout says "saved N days ago", where N is counted from the drawing.

- [ ] **Step 1: Write the failing tests** in `playground-scenes.test.ts`, building each scene from the real content params (read as in Task 1) and drawing with `createDraw`:
  - `every scene draws on a wide and a narrow grid`:
    - grids `{cols: 72, rows: 20, cw: 7.2}` and `{cols: 40, rows: 12, cw: 7.2}`;
    - draw at `t = 3`, with `still` both false and true;
    - each draw is at least 20 cells and nothing throws.
  - `the registry falls back to the name scene`: `sceneFor({ scene: 'nope', params: {}, title: 'Test', year: 2026 })` draws cells, and at least one is a letter of "Test" when the text fallback is in use.
  - `the push counts down, rolls, then rests`, with the content params. Run `draw` then `status`:
    - at t = 30 the status is `{ label: 'Time left on this push', value: '0:30' }`;
    - at t = 61 the label is `'Time is up'`;
    - at t = 70 it is `{ label: 'Your break: the walk down', value: '0:08' }`.
  - `the descent's counter`: the range after drawing at t = 5 (`still: false`) is `'1.90b years ago'`.
  - `the leaderboard's readout names the run under the pointer`: on a 72 × 20 grid with `hover: { c: 1, r: 5 }`, the readout HTML contains `0.9450` and `gpt-5.5 + thinking (high)`.
  - `the river's readout lists the channels running then`: on the 72 × 20 grid, hover on column `c = Math.round((2024.4 - 2019) / 8.5 * 71)`, which is year 2024.4 on the 2019 to 2027.5 axis. The readout contains `sibkade` and `helpfinity`, but not `iranspoti`.
- [ ] **Step 2:** Run `npx vitest run tests/unit/playground-scenes.test.ts`. Expected: FAIL, because the modules are missing.
- [ ] **Step 3: Implement the nine factories and the registry.** Labels are clamped into the grid, as the prototype's Delta `label()` does, so narrow grids never lose text off the edge.
- [ ] **Step 4:** Run the same command, then `npm test`. Expected: all PASS.
- [ ] **Step 5:** Commit: "Draw each Playground project from its own data".

### Task 4: The band, its fonts and the style switch

**Files:**
- Create:
  - `src/components/PlaygroundStage.astro`
  - `public/fonts/geist-mono-latin.woff2`, from the URL in Google's css2 response for Geist Mono latin (23,108 bytes)
  - `public/fonts/geist-mono-symbols.woff2`, Geist Mono's symbols2 subset (5,892 bytes)
  - `public/fonts/geist-pixel-latin.woff2`, Geist Pixel latin (16,880 bytes)
  - `public/fonts/OFL.txt`, Geist's licence from `google/fonts` (`ofl/geistmono/OFL.txt`; append Geist Pixel's copyright line if it differs)
- Modify: `src/pages/index.astro`
- Test: `tests/e2e/playground.spec.ts` (new)

**Interfaces:**
- Consumes: Task 1's `StageConfig` and `playgroundStyle`.
- Produces this markup, for Tasks 5 and 6:
  - `section#playground.pg-band[data-style="stage"]`
  - `.pg-hud`, a header row: "8 projects" and "weekends" on the left, "all finished" on the right. Task 6 adds the toggle as its last item.
  - Per item `li.pitem`:
    - `.pg-stage[data-stage='<json StagePayload>']`, holding `canvas[aria-hidden="true"]`, `.mg-hud-top` (`.mg-wordmark` with the lowercase title, and meta spans for kind and year), `.mg-readout[hidden][aria-hidden="true"]` and `.mg-hud-bottom` (the legend, and `[data-range]`)
    - `.pg-text`, holding `.pg-idx`, `h3.pitem-title`, `.pg-meta` (with `a.pitem-src` when `repo`), `.pg-body` (the rendered markdown) and `.pg-stat`
    - `.pg-stat` holds `[data-stat-label]`, `[data-stat-value][aria-hidden="true"]`, and a `.visually-hidden` sentence: `stat.sub`, or else "`label`: `value`."
- Design values: copy the prototype's `.pg2-*` CSS and section 4 of the spec. Three additions:
  - the title keeps "Playground" in the DOM and shows lowercase through `text-transform: lowercase`;
  - `#playground :focus-visible { outline-color: #fff; }`
  - the `@font-face` rules: `"Geist Mono"` at weight `400 500` from the two mono files, with the latin and symbols2 `unicode-range`s copied from Google's css2 response; `"Geist Pixel"` at weight 400. These go in `<style is:global>` inside the component.

- [ ] **Step 1: Write the failing e2e tests** in `tests/e2e/playground.spec.ts`:
  - `the playground is a black band in both themes`: `#playground`'s computed `background-color` is `rgb(0, 0, 0)` in light and in dark (dark via `addInitScript(() => localStorage.setItem('heyparsa-theme', 'dark'))`).
  - `it keeps the list's hooks, in content order`:
    - 8 `li.pitem` with `.pg-stage` canvases;
    - `.pitem-title` texts in this order: Bargasht, ApplyBot, Apsis, The Descent, Delta, Sisyphus, Persian LLM Eval, Claude Code plugins;
    - `h2#playground-title` has the text "Playground".
  - `fonts come from the site, never from Google`:
    - record every request URL;
    - after scrolling `#playground` into view, none contain `fonts.googleapis.com` or `fonts.gstatic.com`;
    - one ends with `/fonts/geist-mono-latin.woff2`.
  - `focus rings are white on the band`: Tab to `#playground .pitem-title a`; its computed `outline-color` is `rgb(255, 255, 255)`.
- [ ] **Step 2:** Run `npm run test:e2e -- --project=chromium tests/e2e/playground.spec.ts`. Expected: FAIL, because the band doesn't exist yet.
- [ ] **Step 3: Download the three font files and the licence** (approved by Parsa on 2026-10-31). Then build the component and the switch in `index.astro`:

```astro
{home.data.playgroundStyle === 'list'
  ? <Playground intro={home.data.playgroundIntro} />
  : <PlaygroundStage intro={home.data.playgroundIntro} />}
```

- [ ] **Step 4:** Run `npm run check && npm run test:e2e -- --project=chromium`. Expected: the new spec and every existing spec pass, including home's Playground links, the a11y jump-then-Tab check and the island label check.
- [ ] **Step 5:** Commit: "Render the Playground as a black Monoglyph band, with self-hosted Geist fonts".

### Task 5: Stages come alive

**Files:**
- Create: `src/scripts/playground/stage.ts` and `src/scripts/playground/band.ts`
- Modify: `src/components/PlaygroundStage.astro`, adding `<script>import '../scripts/playground/band';</script>`
- Test: extend `tests/e2e/playground.spec.ts`

**Interfaces:**
- Consumes: `sceneFor` from Task 3, and `createDraw`, `LINE`, `STYLE` and `inkLevel` from Task 2. Its DOM comes from Task 4.
- Produces:
  - `class Stage`:
    - `constructor(root: HTMLElement, scene: Scene, parts: { range: HTMLElement | null; statLabel: HTMLElement | null; statValue: HTMLElement | null })`
    - `setPaused(paused: boolean): void`
    - `destroy(): void`
  - `decodeTo(el, text, { duration = 480 })`, Monoglyph's decode.
  - `band.ts`, a side-effect module:
    - on `astro:page-load`, it mounts one `Stage` per `#playground .pg-stage`;
    - on `astro:before-swap`, it destroys them all.
- Behaviour:
  - Port the prototype's `Stage`: measure on resize, the opening when the stage first enters view (threshold 0.2), the frame loop at the scene's fps, no drawing off screen, pointer readouts, and range and stat refresh every 250ms.
  - The plot runs from the top HUD's height + 4 to the stage height − the bottom HUD's height − 2.
  - Before the first measure, it waits for `document.fonts.load('400 12px "Geist Mono"')`, racing a 2500ms timeout.

- [ ] **Step 1: Write the failing e2e tests:**
  - `every stage draws once it scrolls into view`: for each `.pg-stage`, `scrollIntoView`, then poll until its canvas has at least one pixel with alpha > 0 (`getImageData` over the whole canvas).
  - `stages draw a still frame under reduced motion`: run the same check after `page.emulateMedia({ reducedMotion: 'reduce' })`.
  - `stages still draw when the fonts are blocked`:
    - `page.route('**/fonts/*.woff2', r => r.abort())`, then the same check, polling for up to 5s.
  - `a resized stage redraws to its new size`: set the viewport to 390 × 844, and poll until the canvas `width` equals `round(clientWidth × devicePixelRatio)` and the canvas has drawn pixels.
- [ ] **Step 2:** Run `npm run test:e2e -- --project=chromium tests/e2e/playground.spec.ts`. Expected: FAIL, because nothing draws yet.
- [ ] **Step 3: Implement `stage.ts` and `band.ts`,** and add the script import.
- [ ] **Step 4:** Run the full Chromium suite plus `npm test`. Expected: all PASS.
- [ ] **Step 5:** Commit: "Bring the Playground stages to life, after Monoglyph's stage".

### Task 6: The pause toggle and the island over the band

**Files:**
- Modify: `src/scripts/playground/band.ts`, `src/components/PlaygroundStage.astro`, `src/styles/global.css`, and section 4 of the spec (the toggle's naming, as decided below)
- Test: extend `tests/e2e/playground.spec.ts`

**Interfaces:**
- Consumes: `Stage.setPaused` from Task 5.
- Produces:
  - **The toggle:** `button.pg-pause[aria-pressed]` as the last item of `.pg-hud`.
    - Its accessible name is always "Pause motion". Its visible text is "pause motion": `stage-hud` when not pressed, and `stage-ink` with an underline when pressed. This refines the spec's wording so the button's name never changes, which is the correct aria-pressed pattern.
    - It is stored under the `localStorage` key `pg-motion`, as `'paused'` or `'playing'`.
    - At first load, it is pressed if the stored value is `'paused'`, or if nothing is stored and reduced motion is on.
  - **The island:** `html.island-on-stage` is set while `band.getBoundingClientRect()` has `top < 60` and `bottom > 12`. It is checked on scroll (passive, rAF-throttled) and on resize, and cleared on `astro:before-swap`.
  - **In `global.css`:** `html.island-on-stage { --island-fx: url(#isl-goo) drop-shadow(0 0 1px rgba(255, 255, 255, .4)); }`.

- [ ] **Step 1: Write the failing e2e tests:**
  - `the pause toggle stops the stages and starts them again`:
    - click it; `aria-pressed` is `"true"`;
    - two `toDataURL()` reads of a visible canvas 1200ms apart are equal;
    - click again; `"false"`, and within 2s the reads differ.
  - `the pause is remembered`: pause, reload, and `aria-pressed` is `"true"`.
  - `reduced motion starts paused`: with `emulateMedia({ reducedMotion: 'reduce' })` and empty storage, `aria-pressed` is `"true"`.
  - `the toggle works when storage throws`:
    - `addInitScript` replaces `Storage.prototype.getItem` and `setItem` with throwers;
    - pause and resume still flip `aria-pressed`;
    - no page errors.
  - `the island takes its light edge only over the band`:
    - at the top of the page, `html` lacks `island-on-stage`;
    - scrolled to `#playground`'s top + 200, it has the class;
    - scrolled to `#about`, it lacks it.
  - `leaving home and coming back remounts the stages once`:
    - scroll into the band, then click Barayand's card link; `html` lacks `island-on-stage` on `/barayand`;
    - `page.goBack()`, then the stage-draw check passes again;
    - the `.pg-stage canvas` count is still 8.
- [ ] **Step 2:** Run `npm run test:e2e -- --project=chromium tests/e2e/playground.spec.ts`. Expected: the new cases FAIL.
- [ ] **Step 3: Implement it.** Update section 4 of the spec to the toggle wording above.
- [ ] **Step 4:** Run the full Chromium suite plus `npm test`. Expected: all PASS.
- [ ] **Step 5:** Commit: "Let visitors pause the Playground stages, and keep the island visible over the band".

### Task 7: The way back, docs and the final pass

**Files:**
- Modify: `README.md`, in the "Edit the text" section
- Test: none new. This task only verifies.

- [ ] **Step 1: Document it in the README.**
  - The `playgroundStyle` switch and what `list` brings back.
  - The `stage` blocks: where the numbers live, and that a new entry without one gets the name drawing.
  - The self-hosted fonts and their licence.
  - The git tag `playground-classic`.
- [ ] **Step 2: Check the way back.**
  - Set `playgroundStyle: list` and run `npm run test:e2e -- --project=chromium tests/e2e/home.spec.ts tests/e2e/a11y.spec.ts tests/e2e/island-home.spec.ts`. Expected: PASS.
  - Restore `stage`.
- [ ] **Step 3: Run everything.** `npm test && npm run check && npm run test:build && npm run test:e2e -- --project=chromium`. Expected: all PASS.
- [ ] **Step 4: Take screenshots** of `/` at 1440 × 900 (light and dark) and at 390 × 844. Scroll into the band and look at every stage against the prototype's layout 2.
- [ ] **Step 4b: Check Lighthouse.** The spec wants Lighthouse at least 95 on `/`. `npx lighthouse` needs a package download Parsa hasn't approved, so don't run it unless he approves. Otherwise, report it as not run, along with the JS bundle size of `band.ts` from `dist/`.
- [ ] **Step 5:** Commit: "Document the Playground's stage style and the switch back to the list".
