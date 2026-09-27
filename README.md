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
