# heyparsa.com

Personal site of Parsa Kharazmian. Astro 7, static output, no framework, no web fonts.
The Dynamic Island at the top is the navigation. It persists across pages (`transition:persist="island"`) and moves on springs.

## Run

Needs Node 22.12 or newer.

```bash
npm install
npm run dev        # http://localhost:4321
npm test           # unit tests (Vitest)
npm run test:e2e -- --project=chromium   # browser tests (Playwright) against a production build
npm run test:build # build, then check dist/ for private-note leaks
npm run check      # astro check (types)
```

Run the browser tests in Chromium only. `playwright.config.ts` also defines a WebKit project, but Playwright's WebKit build segfaults on launch on this macOS (Darwin 25), so a plain `npm run test:e2e` fails here. Check Safari by hand instead.

The private-note checks (the content test in `npm test` and the `dist/` check in `npm run test:build`) compare against `content/notes/`, so they only run where that folder exists, which is the owner's machine. On a fresh clone, in CI or on Vercel they are skipped.

## Edit the text

All copy lives in `content/`:

| Path | What |
|---|---|
| `content/site/home.md` | hero name and lines (`[Word](key)` makes a live word), island greeting, word previews, playground intro and style |
| `content/site/about.md` | about text, beliefs, timeline, "What I ship with", links |
| `content/site/pay.md` | the payment page for clients (`/pay`): bank transfer, PayPal and bitcoin details, each card with its method's logo (Simple Icons, `src/lib/payment-logos.ts`). It stays out of search and isn't linked from the site; IBANs, BICs and bitcoin addresses are checked at build time, so a typo fails the build |
| `content/projects/*.md` | one file per project. `page: true` gets its own page (`/slug`); `page: false` opens as a sheet from its card. `##` headings become chapters in the island; a `>` blockquote is a pull quote |
| `content/playground/*.md` | weekend projects, in `order`, each with a `stage` block: its drawing in the Playground band |
| `content/notes/` | private notes. Git-ignored and never loaded. Where the folder exists, `npm run test:build` fails if any of it reaches the site |

The link preview that shared links show (`public/og.png`, 1200×630) is the home page's first frame, set by hand in `scripts/og/card.html`. It does not read `content/`, so when the hero name, lines or greeting change, update the card too and run `npm run og`.

### The Playground band

The Playground is a black band in the Monoglyph style. Each weekend project sits beside its own stage: a drawing in monospace glyphs, made from something real about the project.

- **Going back.** `playgroundStyle: list` in `content/site/home.md` brings back the plain list (`src/components/Playground.astro`, kept unchanged). `stage` is the band. The git tag `playground-classic` marks the site before the band.
- **Numbers and words.** Everything a stage shows lives in its project's `stage` block in `content/playground/*.md`: the scene, the stat under the description, the legend, the caption and the scene's data, such as the benchmark's leaderboard. It is checked at build time (`src/lib/playground-stage.ts`), so a wrong value fails the build instead of drawing nonsense. A project with no `stage` block gets its title drawn in glyphs, with its year as the stat.
- **Fonts.** Geist Mono and Geist Pixel are served from `public/fonts/` under the SIL Open Font License (`public/fonts/OFL.txt`). Only the band uses them.
- **Motion.** The band's "Pause motion" toggle holds every stage. The choice is remembered per visitor; with none stored, the band follows the system's reduced-motion setting.

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

## License

- **Code:** MIT, see [LICENSE](LICENSE). The license covers the code only, not the content below. You're welcome to learn from the island and reuse it in your own projects.
- **Content:** everything in `content/` (the biography, project write-ups and site copy) is © Parsa Kharazmian, all rights reserved. Please don't republish it or use it for your own site.
