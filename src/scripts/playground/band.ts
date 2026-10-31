// Brings the Playground band's stages to life on the home page, and tears them down when the router swaps the
// page out. The band is only there when playgroundStyle is stage (src/components/PlaygroundStage.astro).
// It also owns the band's pause toggle, and gives the island its light edge while the island sits over the band.
import { sceneFor, type StagePayload } from './scenes';
import { Stage } from './stage';

/** Remembered per visitor: 'paused' or 'playing'. Nothing stored means "follow reduced motion". */
export const MOTION_KEY = 'pg-motion';
/** Set on <html> while the band covers the island's strip; global.css swaps the island's shadow for a light edge. */
const ON_STAGE = 'island-on-stage';

let stages: Stage[] = [];
let generation = 0;
let teardown: AbortController | null = null;

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function storedMotion(): string | null {
  try {
    return localStorage.getItem(MOTION_KEY);
  } catch {
    return null;
  }
}

function storeMotion(paused: boolean): void {
  try {
    localStorage.setItem(MOTION_KEY, paused ? 'paused' : 'playing');
  } catch {
    /* storage blocked: the choice lasts for this visit */
  }
}

/** The canvas measures glyphs, so wait for Geist Mono, but never longer than 2.5s (blocked or slow fonts). */
async function fontsReady(): Promise<void> {
  const load = document.fonts?.load(`400 12px "Geist Mono"`).catch(() => undefined) ?? Promise.resolve();
  await Promise.race([load, new Promise((resolve) => setTimeout(resolve, 2500))]);
}

function unmount(): void {
  generation++;
  teardown?.abort();
  teardown = null;
  for (const stage of stages) stage.destroy();
  stages = [];
  document.documentElement.classList.remove(ON_STAGE);
}

async function mount(): Promise<void> {
  unmount();
  const band = document.querySelector<HTMLElement>('#playground[data-style="stage"]');
  if (!band) return;
  const mine = generation;
  const off = new AbortController();
  teardown = off;

  // Paused when the visitor said so, or, with no choice stored, when they asked their system for less motion.
  const stored = storedMotion();
  let paused = stored === 'paused' || (stored === null && reducedMotion());
  const toggle = band.querySelector<HTMLButtonElement>('.pg-pause');
  toggle?.setAttribute('aria-pressed', String(paused));
  toggle?.addEventListener('click', () => {
    paused = !paused;
    toggle.setAttribute('aria-pressed', String(paused));
    for (const stage of stages) stage.setPaused(paused);
    storeMotion(paused);
  }, { signal: off.signal });

  // The island is a black pill: over the black band it needs the light edge it has in the dark theme.
  let queued = false;
  const edge = () => {
    queued = false;
    const box = band.getBoundingClientRect();
    document.documentElement.classList.toggle(ON_STAGE, box.top < 60 && box.bottom > 12);
  };
  const queue = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(edge);
    }
  };
  addEventListener('scroll', queue, { passive: true, signal: off.signal });
  addEventListener('resize', queue, { signal: off.signal });
  edge();

  await fontsReady();
  // Another navigation started while the fonts loaded: that page mounts its own stages.
  if (mine !== generation || !band.isConnected) return;
  stages = [...band.querySelectorAll<HTMLElement>('.pg-stage')].map((root) => {
    const item = root.closest('.pitem');
    const payload = JSON.parse(root.dataset.stage ?? '{}') as StagePayload;
    return new Stage(root, sceneFor(payload), {
      range: root.querySelector('[data-range]'),
      statLabel: item?.querySelector('[data-stat-label]') ?? null,
      statValue: item?.querySelector('[data-stat-value]') ?? null,
    }, paused);
  });
}

document.addEventListener('astro:page-load', () => void mount());
document.addEventListener('astro:before-swap', unmount);
