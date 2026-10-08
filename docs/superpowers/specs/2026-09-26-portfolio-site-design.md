# heyparsa.com — portfolio site v1 design

Date: 2026-09-26 · Status: approved in chat, written up for review
Reference prototype: `docs/prototypes/island-hero.html` (the approved hero; open it in a browser to see the island's intended feel)

## 1. Goal

A personal portfolio for Parsa Kharazmian that feels Apple-made: dynamic, interactive, restrained. The Dynamic Island is the signature and the site's navigation. It tells the hero story, previews things, carries each page's title in and out, and follows the visitor across pages.

## 2. Decisions already made

| Topic | Decision |
|---|---|
| Stack | Astro 7, static output, `<ClientRouter />`; the island is persisted across navigations with `transition:persist="island"` |
| Hosting | Vercel first, a personal server later. `dist/` must work behind plain nginx/Caddy; nothing host-specific |
| Hero | Dynamic Island concept (prototype #2, extended version) |
| Navigation | The island is the site-wide nav |
| Visuals | Typography only. No images, screenshots or logos in v1 |
| Language | English only in v1 |
| Pages | Home, `/barayand`, `/sibkade`. HelpFinity and IranSpoti have no pages; their cards open a sheet via a "+" button |

## 3. Information architecture

**Home (`/`)**, in order, with section ids used by the island:

1. `top`: hero (name, two lines with live words).
2. `work`: four cards, active first then newest: Barayand (→ `/barayand`), Sibkade (→ `/sibkade`), HelpFinity (+ sheet), IranSpoti (+ sheet).
3. `playground`: the seven weekend projects, each with a one-paragraph description and an outside link where one exists.
4. `about`: intro, the three beliefs, "What I ship with", the timeline line, the personality line.
5. `contact`: "Say hello." with links.

**Project pages:** `/barayand`, `/sibkade`. "Next project" cycles Barayand → Sibkade → Barayand.

**404:** minimal page; the island shows a "Page not found" state with a way home.

## 4. Content model

`content/` becomes the single source of text. Astro reads it directly (`glob()` loader with `base` outside `src`).

```
content/
  projects/   barayand.md  sibkade.md  helpfinity.md  iranspoti.md   (published)
  playground/ bargasht.md  applybot.md  apsis.md  the-descent.md  sisyphus.md
              persian-llm-eval.md  claude-code-plugins.md            (published)
  site/       home.md  about.md                                      (published)
  notes/      every "Notes (not for publishing)" block, verbatim,
              plus about-notes.md                                    (never loaded, git-ignored)
```

- Publishable text is copied verbatim from today's files. Only structure changes: frontmatter plus body.
- Project frontmatter: `title`, `order`, `role`, `years`, `status` (`now` | `active` | `past`), `tagline` (the bold first line), `summary` (the "Homepage card" short version, where one exists), `page` (true/false), optional `url`, and island metadata: `glyph` and a two-colour `tint`.
- Project body: `##` headings are chapters. A `>` blockquote is a pull quote. Pull quotes repeat a sentence already in the text; they never add new claims.
- Barayand gets three short chapter headings so the island has chapters there: The idea · What shipped · The benchmark. The text under them is unchanged.
- Pull quotes (verbatim from the text):
  - Sibkade: "an experience people are comfortable putting their own name behind."
  - Barayand: "Disagreement between models is not noise. It is signal, and Barayand turns it into a product."
- No stat blocks or charts: the Sibkade stats block was removed at Parsa's request. Numbers stay inside sentences.
- `site/home.md` holds the hero lines and the island's word-preview copy. `site/about.md` holds the About content and contact links.
- `content/notes/` holds private figures and instructions. It is git-ignored and never imported. A build test asserts that none of its markers reach `dist/`.

## 5. The island

### 5.1 Anatomy

Fixed at the top centre and persisted across navigations. Three layers:

- **Goo layer:** a black pill plus a detachable black dot. An SVG goo filter (blur plus alpha threshold) makes them merge and split like liquid.
- **Content layer:** the views, crossfaded with blur.
- **Progress dot button:** a reading-progress ring. Tapping it goes to the top.

### 5.2 State and resolver

The controller holds a page context:

- `kind`: `home` | `project` | `notfound`
- `slug`, `title`, `glyph`, `tint`, `status`
- `chapters[]` and `next`

It also holds transient flags: `intro`, `menu`, `contact`, `word`, `sheet`, `flash` (`copied` | `jump` | `opening`), `absorbed`, `section` / `chapter`, `nearEnd`.

A pure function picks exactly one view. Priority, highest first:

`flash` → `sheet` → `contact` → `menu` → `word` preview (home, not absorbed) → `intro` step → `next` (project, near end) → `absorbed ? section/chapter : compact`

### 5.3 Views

| View | Content |
|---|---|
| compact (home) | Barayand glyph · "Building **Barayand**" · live dot |
| compact (project) | project glyph · title · status (green "Now" dot, or years) |
| hello | avatar · "Hi, I'm Parsa." · "Welcome to heyparsa.com" (first visit only) |
| word previews | Sibkade, Barayand, Startup, Tech, Psychology cards (copy from the prototype) |
| section / chapter | avatar (home) or glyph (project) · rolling label; the progress dot splits off |
| menu (home) | avatar → top · Work · Playground · About · Contact · theme toggle |
| menu (project) | vertical card: glyph + title header, "On this page" chapter list, footer row: ← Home · Contact · theme toggle |
| contact | X, Telegram, GitHub, LinkedIn, Email (tap to copy) |
| copied / jump | "Email copied" / "Copy blocked"; arrow plus target section while smooth-scrolling |
| opening | target page's glyph and title while a navigation is in flight |
| next | "Next · Sibkade →" near the end of a project page; tapping it navigates |
| sheet | glyph · project title · "Close"; tapping closes the sheet |
| notfound | "Page not found" · Home |

### 5.4 Motion rules

- Size springs: response 0.5 s, damping 0.72; radius spring: response 0.5 s, damping 0.85 (as in the approved prototype).
- Press scale: 0.96.
- Gulp: a scale impulse when a title is absorbed or released.
- Split-dot spring: 0.55 s / 0.66. The dot sits about 10 px from the pill so the goo neck breaks at rest.
- View crossfade: out in 120 ms; in at 280 ms after an 80 ms delay; 4 px blur.
- **Title rule:** every page's `h1` drops out of the island on arrival and is absorbed back into it when scrolling from 0 to 0.42 × viewport height. Absorb at ≥ 0.92 progress, release below 0.85 (hysteresis).
- **Labels:** roll up when scrolling down and down when scrolling up. The section or chapter switches when its top passes 28 % of the viewport. Before the first one, the label is the page title (home: "Parsa Kharazmian").
- **Intro:** the full intro (hello → drop → Sibkade and Barayand previews) runs once per browser session (`sessionStorage`). Later arrivals only drop the title.
- **Reduced motion:** springs become critically damped; no blur, no gulp, no leaning; crossfades only.

### 5.5 Navigation choreography

- `astro:before-preparation`: if `event.to` is an internal page, flash `opening` with that page's glyph and title. This is instant feedback, and prefetch-on-hover (the ClientRouter default) keeps it short.
- `astro:before-swap`: copy the current `data-theme` onto `event.newDocument.documentElement` so the theme never flashes.
- `astro:after-swap` / `astro:page-load`: read the new page context from a JSON script inside `<main>`, reset the scroll-derived flags, measure the new `h1`, then run the title drop.
- Page content transition: the old page fades out and the new one fades in with a small vertical shift. Going forward, new content rises; going back, it falls. The island is excluded because it is persisted.
- Back and forward buttons go through the same flow, and scroll restoration is left to the router.

### 5.6 Live words (home hero)

- `Sibkade` and `Barayand` are links to their pages. Hovering previews them in the island. On touch, the first tap previews and the second tap navigates.
- `Startup`, `Tech` and `Psychology` are buttons that only preview (hover, focus or tap).
- While a word is previewed, the island leans up to 14 px toward it, and a faint glow in its tint sits behind the hero.

### 5.7 Sheets (HelpFinity, IranSpoti)

- The card's "+" button opens a sheet (custom dialog: `role="dialog"`, `aria-modal="true"`). The sheet grows from the card's rectangle (FLIP) into a centred panel up to 720 px wide.
- While a sheet is open, the backdrop dims and `<main>` is `inert`, but the island stays interactive and shows the sheet view.
- Close with ×, Esc, the backdrop, or the island. The sheet shrinks back into its card, and focus returns to the "+" button.
- The URL hash (`#helpfinity`, `#iranspoti`) is set with `replaceState`. Loading with that hash opens the sheet.

### 5.8 Accessibility

- The island is `<nav aria-label="Site">`. Keyboard focus opens its menu, Esc closes it, and focus rings are visible.
- A "Skip to content" link.
- The router's built-in route announcer.
- Live-word information is also present in the page text, so nothing exists only inside the island.
- Text contrast at least WCAG AA in both themes.
- Real `<a>` links for navigation, so everything works without JavaScript apart from the island's motion. Sheets without JS fall back to plain sections at the end of the home page (they live outside <main> so the open sheet can make <main> inert).

## 6. Page design

- **Tokens:**
  - System font stack (SF on Apple devices); no web fonts.
  - Light and dark colour tokens from the prototype.
  - Theme is light by default and ignores the system setting (changed 2026-09-27 at the owner's request). The visitor's choice from the toggle is saved in `localStorage` and applied by an inline head script before first paint, together with the matching `theme-color`.
  - Theme toggle (added 2026-10-08 at the owner's request): the icon shows the current mode, a gold sun or a silver crescent moon with a star, and morphs between them. The new mode spreads in a circle from the button over the whole page (a view transition, about 0.65 s), and a thin ring in the icon's colour draws the circle's edge across the black island. With reduced motion, or without view transitions, the colours cross-fade instead. The button is an `aria-pressed` "Dark appearance" toggle.
- **Home:** as in the prototype, with the real content.
  - Work cards: title, role · years, and the summary or tagline, plus a round button, "→" for pages and "+" for sheets.
  - Page cards are fully clickable through a stretched link.
- **Project page:**
  - Top: the huge single-line title (from the island), the tagline in large type, and a meta row with role · years · outside link ↗.
  - Chapters: `h2` in display size; body text at about 21 px, line height 1.6, in a column of roughly 680 px.
  - Pull quotes: display size, secondary colour.
  - Bottom: a large "Next project" block.
- **Astro 7 note:** the Rust compiler no longer repairs invalid nesting, so there must be no block elements inside `<p>`.

## 7. Architecture

```
astro.config.mjs              site: https://heyparsa.com; static output
src/content.config.ts         collections: projects, playground, site (glob loaders on ./content/*)
src/layouts/Base.astro        <ClientRouter />, theme boot script, skip link, <Island transition:persist="island" />
src/components/Island.astro   island markup: goo layer, views, progress dot
src/components/*.astro        WorkCard, ProjectSheet, PlaygroundList, About, Contact, NextProject
src/pages/index.astro         home
src/pages/[slug].astro        project pages (getStaticPaths: projects with page: true)
src/pages/404.astro
src/scripts/island/spring.ts      pure spring integrator
src/scripts/island/resolve.ts     pure: state → view
src/scripts/island/scroll.ts      pure: absorb progress, hysteresis, section/chapter lookup
src/scripts/island/controller.ts  DOM, events, rAF loop, router hooks
src/scripts/sheet.ts
src/styles/tokens.css, global.css
tests/unit/                   Vitest
tests/e2e/                    Playwright
```

Each page renders its island context as `<script type="application/json" id="page-ctx">` inside `<main>`, so it swaps with the page.

## 8. Testing and verification

- **Unit (Vitest):** spring settling and overshoot bounds; resolver priorities; absorb hysteresis; section and chapter lookup.
- **E2E (Playwright, Chromium and WebKit):**
  - Home loads with no console errors, and the intro reaches compact.
  - Hovering a word shows its preview; the menu opens.
  - Card → `/sibkade`: the island shows Sibkade; scrolling shows a chapter label; back returns the island to home state.
  - Sheet open and close, with focus returning to the "+" button.
  - Theme persists across navigation.
  - Reduced-motion run; phone viewport with the menu opened by tap.
- **Privacy:** after `astro build`, assert that no private marker from `content/notes/` appears anywhere in `dist/`.
- **Manual:** check the site in the browser pane in light and dark, on desktop and phone widths.
- **Targets:** Lighthouse ≥ 95 on desktop for performance, accessibility and best practices; island script under about 25 KB gzipped.

## 9. Out of scope for v1

Blog, Persian page, contact form, analytics, CMS, images, Vercel project setup (Parsa connects the repo), personal-server deploy. (A sitemap and robots.txt were added after launch, on 2026-09-27.)

## 10. Open items (not blocking v1)

- ~~LinkedIn URL~~ Provided 2026-09-27; it is listed in the contact links.
- Playground links: use the public ones recorded in the notes (GitHub repos, bargasht.barayand.io, sisyphustimer.site). Confirm before launch.
- Brand tints for the Barayand and Sibkade glyphs are placeholders (blue→indigo, orange).
- Wording of the Barayand chapter headings and the pull-quote choices, for review on the built pages.
