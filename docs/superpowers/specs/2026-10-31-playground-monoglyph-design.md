# heyparsa.com — Playground in Monoglyph: design

Date: 2026-10-31. Branch: `playground-monoglyph`. Visual reference: `docs/prototypes/playground-monoglyph.html`, layout 2 (switch at the bottom of the page). Design system: Monoglyph, https://claude.ai/artifact/Eah6LaH8jsv7hg1EPqaxRM; read its `project/README.md` with the Artifact tool.

## 1. Intent

Parsa likes the ASCII trend (daoho.dev, jwahn.com, the Devault and ASCII Magic generators, HorizonX's "Imago ASCII Login") and built his own monochrome design system for it, Monoglyph, for a product called Hindsight. He wants it on heyparsa.com, but only in one section, so that the site's own identity stays intact.

That identity is the Dynamic Island, the Apple-like type and system fonts. The Playground holds his weekend projects and is the natural place to experiment.

The section becomes a black Monoglyph band. Every project gets its own small stage, drawn in monospace characters from something real about that project.

## 2. Decided by Parsa

- **Scope:** only the Playground section of the home page. Not the hero, the island, the other sections or the project pages.
- **Layout:** layout 2 of the prototype. The whole section is a black band, and each project gets its own stage beside its text. Layout 1 (one sticky stage beside the list) was rejected.
- **Starting point:** built from scratch, from Monoglyph and the references above. The untracked `docs/prototypes/ascii-samples.html` from another session is to be ignored entirely: don't read it, build on it or commit it.
- **Going back:** the current Playground must stay one step away (section 7).
- **Process:** it ships only after he approves this document, on a branch, and goes live only when he says so.

## 3. Goals, non-goals, anti-goals

**Goals**
- The section reads as Monoglyph: black stage, monochrome glyph ramp, uppercase mono HUD, pixel type for names and numbers.
- Every mark on a stage is a value (Monoglyph's core rule). Each drawing shows something true about its project.
- It works on phones, in both themes and with reduced motion. The home page stays fast: Lighthouse at least 95, as in the v1 spec.
- Data and copy live in `content/`, so Parsa or Claude can change numbers without touching code.

**Non-goals**
- ASCII anywhere else on the site, including the og image.
- New projects, or changes to the projects' descriptions (except item 1 in section 12, if Parsa decides it).
- Persian letters in the glyph ramp. This was an earlier idea of Claude's and was not asked for.

**Anti-goals: these count as failure even if everything technically works**
- Glyphs used as decoration, or anything that looks like a generic ASCII template.
- The island getting lost, or looking broken, over the band.
- The hero's first paint waiting on the new fonts or scripts.
- Inventing data. Simulated content must say it is simulated.

## 4. The section

Each item below is copied from the prototype's layout 2.

- **Band.** `section#playground` gets the stage's black (`#000`) as its background in both themes, full width.
  - In dark theme the page is also black, so a 1px `var(--line)` hairline marks the band's top and bottom edges.
  - Text inside uses Monoglyph's stage tokens: `stage-ink` #fff, `stage-text` #f5f5f7, `stage-muted` white at 0.62, `stage-hud` white at 0.5, `stage-label` white at 0.45, `stage-edge` white at 0.16.
- **Header.**
  - A HUD row in 11px uppercase mono with 0.06em tracking, at `stage-hud`: "8 projects" and "weekends" on the left, "all finished" on the right. The count comes from the collection.
  - The title: the DOM text stays "Playground" with `id="playground-title"`. It shows lowercase, in Geist Pixel, at `clamp(64px, 11vw, 148px)`.
  - The intro (`playgroundIntro`) in `stage-muted`.
- **Rows.**
  - Each project is an `li` with a two-column grid: the stage on the left (`minmax(0, 1.15fr)`, height `clamp(300px, 30vw, 360px)`, 1px border at white 0.12, square corners), the text on the right.
  - The text column holds:
    - the index (`01`…) in mono;
    - the title as an `h3`, linked when the entry has a `url`;
    - meta in uppercase mono: year, kind, and a Source link when the entry has `repo`;
    - the description;
    - the stat: a label in the site sans at 13px and a value in Geist Pixel at 44px.
  - Rows are divided by `stage-edge` hairlines.
  - Below 760px the row stacks: stage on top at `clamp(290px, 84vw, 350px)`, then the text.
- **Stage anatomy** (Monoglyph's Stage and Hud components):
  - top HUD: the project name lowercase in Geist Pixel 19px on the left, kind and year on the right;
  - a canvas filling the stage;
  - bottom HUD: a legend explaining the glyphs (keys in `stage-ink`, dim keys in `stage-label`) on the left and a range or caption on the right;
  - an optional hover readout, using Monoglyph's Readout style.
- **Glyph engine** (Monoglyph's `stage.js`):
  - 12px Geist Mono glyphs on 15px rows; a column is as wide as "0".
  - Ramp ` .:-=+*#%@`. One ink value picks both the glyph (level = round(ink × 9)) and its alpha: 0.16 + 0.84 × level ÷ 9. Ink at or under 0.03 draws nothing.
  - Cells are buffered per frame; the higher priority wins a cell, so lines and labels don't overprint.
- **Motion.**
  - **Opening:** when a stage first scrolls into view, its columns print left to right in 16 chunks, one every 45ms. The newest chunk flashes noise from `#%&@$*+=/\<>?!`.
  - **Idle:** glyphs shimmer by ±0.05 ink, each cell re-rolling about every 1.25s. A stage redraws at about 11 frames a second, and the planet at 30 so it can follow the pointer smoothly.
  - **Value changes:** Monoglyph's decode (changed digits flicker and settle left to right in 42ms steps).
  - **Off screen:** a stage that isn't on screen doesn't draw.
  - **Reduced motion:** each scene draws one still frame, with no opening, no shimmer and no decode.
- **Pausing.** The loops run for as long as a stage is on screen, so the band needs a way to stop them (WCAG 2.2.2, Level A).
  - The control: one toggle at the right end of the band's HUD row, in the HUD's own style. It reads "pause motion" or "play motion", and is a real `<button>` with `aria-pressed`.
  - What stops: every stage holds its current frame. The opening, shimmer, loops, readouts that follow the pointer, and live values (the Sisyphus countdown, the Mars clock) all stop.
  - Memory: the choice is remembered per visitor in `localStorage`, every access wrapped in `try`/`catch`.
  - With reduced motion, the band starts paused with still frames. Pressing "play motion" is an explicit choice and is honoured.

## 5. The eight drawings

The prototype's code is the reference for each one.

| Project | Scene id | What is drawn (the values) | Stat |
|---|---|---|---|
| Bargasht | `archive` | Saves stacked per day, newest on the right, one texture per kind (▓ reels, ▒ podcasts, ░ screenshots, # book pages, : voice notes). Every ~4s an older save lights up with a scanline and a readout ("screenshot, saved 24 days ago, back on your phone now"). **Simulated**: the HUD says "two months, simulated". | Kinds of saves it files: 5 |
| ApplyBot | `agent-run` | The agent's run as lanes (interview, search, read, write, submit), one tool active at a time. A budget bar of 18 `█`/`░` cells runs down. The submit lane is always hatched `/` and never fills. | Applications it submits for you: 0 |
| Apsis | `planet` | A shaded sphere on real Mars Coordinated Time: a 24-hour ring of dots, a bright `+` at the current Mars hour, and the time written above it. The planet follows the pointer late, as if it had mass. | A Martian day runs: +37 min |
| The Descent | `tree` | A binary tree converging downwards from 64 tips ("now") to one root ("3.8 billion years ago"). Your line is lit, and a dot travels it. Sibling lines brighten as they merge, and the bottom HUD counts "1.42b years ago". | Your scrollbar spans: 3.8B years |
| Delta | `river` | x is time, 2019 to 2026 on a `+`-ticked axis; the sea is past the end. IranSpoti meanders, with its oxbow lake left above, until 2020; Sibkade is the main stem from 2020; HelpFinity splits off in Dec 2023 and dries (`.`) by 2025; Barayand braids into three from Jun 2026. Hover shows the month and which channels were running. | Channels in the river: 4 |
| Sisyphus | `push` | A mountain with no summit, the boulder (a shaded sphere with a one-cell gap around it) and a 5-glyph figure. Cycle: a 60s push, then a 2.4s roll down, then a 15s break walking down. The stat counts down live. | Time left on this push: 1:00 (live) |
| Persian LLM Eval | `leaderboard` | The 17 runs of the persian-llm-eval README's "All models on public_eval and hard" table, by rank, scaled 0.80 to 0.98. Each bar is Monoglyph terrain up to its combined score, then fog above it for its 95% interval (σ = 0.0108). Gridlines at 0.85, 0.90 and 0.95; hover shows the run's name, score and both splits. | Top combined score: 0.945 |
| Claude Code plugins | `plugins` | Venture's five inputs flowing into one workspace (`▓`); Idea Validator's ten stages lighting in turn before a hatched wall; Liquid Glass's nine screens (box-drawing frames) with light sweeping across. | Plugins, learned by building: 3 |
| (any new entry) | `name` | Fallback: the project's title rasterised into the grid and filled with the ramp. | Its year |

## 6. Content model

**`content/playground/*.md`** gets an optional `stage` block.

```yaml
stage:
  scene: leaderboard          # archive | agent-run | planet | tree | river | push | leaderboard | plugins | name
  stat: { label: Top combined score, value: "0.945", sub: optional, used only for screen readers }
  legend: [["@%", combined score], [".:", 95% interval, dim]]
  range: v1.1 leaderboard
  params: { ... }             # scene-specific data, validated per scene
```

**What goes in `params`, per scene:**
- `leaderboard`: the 17 runs, each `[name, public_eval, hard, combined]`, as listed in the persian-llm-eval README (2026-10-31).
- `river`: the channels, each `{ name, from, to, fate }`, where `fate` is `oxbow`, `main`, `dries` or `braids`. The years are fractional (HelpFinity from 2023.95; Barayand from 2026.42).
- `push`: the push, roll and break lengths in seconds.
- `tree`: the span label ("3.8 billion years").
- `archive`: the kinds and their textures.
- `agent-run`: the lane names and which lane never fills.
- `plugins`: the three groups and their counts.
- `planet`: nothing.

**Defaults:**
- A missing `stage` block, or an unknown scene, falls back to `name`.
- Scene code holds geometry and motion only; numbers and words come from content.

**`content/site/home.md`** gets `playgroundStyle: stage`. The schema accepts `stage | list` and defaults to `stage`.

## 7. Going back

- The current `src/components/Playground.astro` stays unchanged as the `list` style.
- The new section is a new component, `PlaygroundStage.astro`. `src/pages/index.astro` renders one or the other according to `playgroundStyle`.
- To go back, set `playgroundStyle: list` in `home.md` and redeploy.
- Git tag `playground-classic` marks main before this work. It is local now and gets pushed with the merge.
- The README's "Edit the text" section documents the switch.

## 8. Fonts

- Self-host Geist Mono (400 and 500, or the variable font) and Geist Pixel (400) as latin-subset `woff2` files in `public/fonts/`, with their OFL 1.1 licence beside them.
- No request goes to Google Fonts at runtime.
- `font-display: swap`. Only this section uses them, and nothing preloads them, so the hero never waits.
- The canvas waits for `document.fonts.load` of the mono face, with a 2.5s timeout falling back to `ui-monospace`, before it measures cells.
- The rest of the site keeps its system fonts, and so do the prose and stat labels in this section.

## 9. The island over the band

The island is a black pill, so in the light theme it disappears against the band.

- While the band covers the island's strip (the top ~60px of the viewport), `<html>` gets the class `island-on-stage`.
- That class switches the island's filter to the dark theme's edge: `url(#isl-goo) drop-shadow(0 0 1px rgba(255,255,255,.4))`.
- The class is removed when the band leaves the strip and on navigation away from home (the island persists across pages).
- Nothing else in the island changes. It still names the section "Playground".

## 10. Accessibility and performance

- **Screen readers:**
  - Canvases, HUDs and readouts are `aria-hidden`. The project text stays real HTML.
  - Live stat values (Sisyphus) are `aria-hidden`. Each stat has a static text equivalent for screen readers, using `stat.sub` or the label and value.
- **Links:** every link stays keyboard-reachable. The existing jump-then-Tab test (focus lands inside `#playground`) must keep passing.
- **Pausing:** the pause toggle (section 4) is the band's only control. It covers WCAG 2.2.2 for all eight stages.
- **Contrast:** text on black meets 4.5:1. `stage-muted` is 7.9:1. `stage-label` (4.4:1) is used only for canvas labels, as in Monoglyph.
- **Performance:**
  - One shared engine module with a small scene module per drawing, bundled by Astro.
  - Canvas backing store capped at 2× DPR. Drawing pauses off screen, and pointer-only interaction never blocks scroll (`touch-action: pan-y`).

## 11. Testing

**Keep the existing hooks** so current tests hold for both styles:
- `#playground` and `h2#playground-title`;
- each project as `.pitem`, its title as `.pitem-title`, the Source link as `a.pitem-src`;
- 8 items, in content order.

**Unit (Vitest)**, for the pure parts moved out of the prototype:
- Mars time for a fixed date;
- the normal CDF;
- leaderboard value-to-row mapping;
- river year-to-column mapping;
- the countdown format;
- the scene registry's fallback;
- the content schema, including every `stage` block in `content/playground`.

**E2E (Chromium)** checks:
- the band is black in both themes;
- 8 stages, each with an `aria-hidden` canvas that has drawn something (non-black pixels) after scrolling into view, including under `reducedMotion: 'reduce'`;
- no requests to `fonts.googleapis.com` or `fonts.gstatic.com`;
- the island has `island-on-stage` inside the band and not above or below it;
- the pause toggle:
  - pressing it sets `aria-pressed`, and a stage's pixels stay the same over a second;
  - pressing it again resumes;
  - the choice survives a reload;
  - under reduced motion the band starts paused;
- the existing home, a11y, island and theme specs still pass.

**Also check:**
- One build with `playgroundStyle: list` passes the home e2e specs.
- Lighthouse on `/` is at least 95.
- Screenshots in light, dark and at 390px wide.

## 12. Open, for Parsa

1. The benchmark's description says "300 items across 10 tracks", but the repo's README now describes v1.1 as 544 scored items across 21 tracks. Keep the current text, or update it?

## 13. Left to the builder

- File and module layout, and the exact scene parameter shapes.
- How the band is detected under the island.
- The fallback scene's rasterisation.
- Tuning of scene geometry at small sizes.
- Whether the prototype file is committed next to `island-hero.html` as a visual reference. Claude's call: yes, since it is the reference this document points to.

## 14. Calls Claude made

Parsa did not decide these; check them while reading:
- the `playgroundStyle` switch, the unchanged old component and the git tag as the way back;
- self-hosted fonts, and site sans for prose;
- data in frontmatter, plus the `name` fallback;
- the island edge over the band;
- one remembered pause toggle for the whole band, after the builder check raised WCAG 2.2.2;
- the lowercase pixel title;
- the HUD row's words;
- Bargasht drawn as a labelled simulation;
- a one-minute demo push for Sisyphus;
- the combined leaderboard, with its fog width taken from the README's ±3 pp per split.
