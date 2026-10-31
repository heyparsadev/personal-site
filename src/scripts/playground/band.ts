// Brings the Playground band's stages to life on the home page, and tears them down when the router swaps the
// page out. The band is only there when playgroundStyle is stage (src/components/PlaygroundStage.astro).
import { sceneFor, type StagePayload } from './scenes';
import { Stage } from './stage';

let stages: Stage[] = [];
let generation = 0;

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The canvas measures glyphs, so wait for Geist Mono, but never longer than 2.5s (blocked or slow fonts). */
async function fontsReady(): Promise<void> {
  const load = document.fonts?.load(`400 12px "Geist Mono"`).catch(() => undefined) ?? Promise.resolve();
  await Promise.race([load, new Promise((resolve) => setTimeout(resolve, 2500))]);
}

function unmount(): void {
  generation++;
  for (const stage of stages) stage.destroy();
  stages = [];
}

async function mount(): Promise<void> {
  unmount();
  const band = document.querySelector<HTMLElement>('#playground[data-style="stage"]');
  if (!band) return;
  const mine = generation;
  await fontsReady();
  // Another navigation started while the fonts loaded: that page mounts its own stages.
  if (mine !== generation || !band.isConnected) return;
  const paused = reducedMotion();
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
