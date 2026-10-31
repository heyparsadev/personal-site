// One Playground stage on its canvas, after Monoglyph's stage.js: it measures the cell grid, prints the drawing
// in when it first comes into view, then redraws about 11 times a second while it is on screen and playing.
// Paused, it holds its frame; a stage that has never played shows its scene's still frame instead.
import { GLYPH_PX, LINE, STYLE, createDraw, type Readout, type Scene } from './engine';
import { NOISE } from './math';

const FONT = `400 ${GLYPH_PX}px "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace`;

export interface StageParts {
  range: HTMLElement | null;
  statLabel: HTMLElement | null;
  statValue: HTMLElement | null;
}

/** Monoglyph's decode: the digits that changed flicker, then settle left to right in 42ms steps. */
const decodeTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();
export function decodeTo(el: HTMLElement, text: string, { duration = 480, animate = true } = {}): void {
  const from = el.dataset.text ?? el.textContent ?? '';
  el.dataset.text = text;
  clearTimeout(decodeTimers.get(el));
  if (!animate) {
    el.textContent = text;
    return;
  }
  const same = from.length === text.length;
  const settleAt = [...text].map((ch, i) => ((same && from[i] === ch) || !/\d/.test(ch) ? 0 : duration * (0.3 + (0.7 * i) / text.length)));
  const start = performance.now();
  const step = () => {
    const elapsed = performance.now() - start;
    let pending = false;
    el.textContent = [...text].map((ch, i) => {
      if (elapsed >= settleAt[i]) return ch;
      pending = true;
      return String(Math.floor(Math.random() * 10));
    }).join('');
    if (pending) decodeTimers.set(el, setTimeout(step, 42));
  };
  step();
}

export class Stage {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly readout: HTMLElement | null;
  private readonly grid = { w: 0, h: 0, cw: 7.2, cols: 0, ox: 0, top: 0, rows: 0 };
  private state: unknown = null;
  private t0 = performance.now();
  /** Scene time and clock held while paused; null while playing or before the stage ever played. */
  private frozen: { t: number; now: number } | null = null;
  private played = false;
  private printed = Infinity;
  private chunk = 2;
  private printTimer: ReturnType<typeof setTimeout> | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private raf = 0;
  private visible = false;
  private entered = false;
  private pointer: { x: number; y: number } | null = null;
  private lastRefresh = 0;
  private dead = false;
  private readonly ro: ResizeObserver;
  private readonly io: IntersectionObserver;

  constructor(
    private readonly root: HTMLElement,
    private readonly scene: Scene,
    private readonly parts: StageParts,
    private paused = false,
  ) {
    this.canvas = root.querySelector('canvas')!;
    this.ctx = this.canvas.getContext('2d')!;
    this.readout = root.querySelector<HTMLElement>('.mg-readout');
    this.ro = new ResizeObserver(() => this.measure());
    this.ro.observe(this.canvas);
    this.io = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      if (this.visible && !this.entered) {
        this.entered = true;
        // A stage's time starts when it is first seen: a push starts at 1:00, not wherever page load left it.
        if (!this.paused) {
          this.t0 = performance.now();
          this.print();
        }
      }
      if (this.visible) this.wake();
    }, { threshold: 0.2 });
    this.io.observe(root);
    root.addEventListener('pointermove', this.onMove);
    root.addEventListener('pointerleave', this.onLeave);
    this.measure();
  }

  setPaused(paused: boolean): void {
    if (paused === this.paused) return;
    const now = performance.now();
    if (paused) {
      // Hold this frame: the scene's time and the shimmer's clock both stop here.
      if (this.played) this.frozen = { t: (now - this.t0) / 1000, now };
      this.endPrint();
      this.pointer = null;
    } else {
      // Resuming continues from the held frame; a stage that has never played starts from the beginning.
      if (this.frozen) this.t0 = now - this.frozen.t * 1000;
      else if (!this.played) this.t0 = now;
      this.frozen = null;
    }
    this.paused = paused;
    this.wake();
  }

  destroy(): void {
    this.dead = true;
    this.ro.disconnect();
    this.io.disconnect();
    cancelAnimationFrame(this.raf);
    clearTimeout(this.timer);
    clearTimeout(this.printTimer);
    this.root.removeEventListener('pointermove', this.onMove);
    this.root.removeEventListener('pointerleave', this.onLeave);
  }

  private readonly onMove = (event: PointerEvent) => {
    if (this.paused) return;
    const box = this.canvas.getBoundingClientRect();
    this.pointer = { x: event.clientX - box.left, y: event.clientY - box.top };
    this.scene.pointer?.(this.state, this.pointer.x, this.pointer.y, { w: this.grid.w, h: this.grid.h });
    this.wake();
  };

  private readonly onLeave = () => {
    this.pointer = null;
    this.scene.pointer?.(this.state, null, null, { w: this.grid.w, h: this.grid.h });
    this.wake();
  };

  private measure(): void {
    const box = this.canvas.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(box.width * dpr);
    this.canvas.height = Math.round(box.height * dpr);
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = FONT;
    ctx.textBaseline = 'middle';
    const cw = ctx.measureText('0').width;
    const cols = Math.max(8, Math.floor((box.width - 40) / cw));
    // The plot sits between the two HUD rows.
    const top = (this.root.querySelector<HTMLElement>('.mg-hud-top')?.offsetHeight ?? 56) + 4;
    const bottom = this.root.clientHeight - (this.root.querySelector<HTMLElement>('.mg-hud-bottom')?.offsetHeight ?? 52) - 2;
    const first = Math.ceil(top / LINE), last = Math.floor(bottom / LINE) - 1;
    Object.assign(this.grid, { w: box.width, h: box.height, cw, cols, ox: (box.width - cols * cw) / 2, top: first, rows: Math.max(6, last - first + 1) });
    this.state = this.scene.init({ cols, rows: this.grid.rows, cw });
    this.wake(true);
  }

  /** The opening: columns print left to right in 16 chunks, each new chunk flashing noise first. */
  private print(): void {
    clearTimeout(this.printTimer);
    this.chunk = Math.max(2, Math.ceil(this.grid.cols / 16));
    this.printed = 0;
    const advance = () => {
      this.printed += this.chunk;
      if (this.printed >= this.grid.cols + this.chunk) this.printed = Infinity;
      else this.printTimer = setTimeout(advance, 45);
      this.wake();
    };
    this.printTimer = setTimeout(advance, 45);
  }

  private endPrint(): void {
    clearTimeout(this.printTimer);
    this.printed = Infinity;
  }

  /** Schedules a frame. A paused or hidden stage only draws when forced (a resize, a pause holding its frame). */
  private wake(force = false): void {
    if (this.dead) return;
    if (!force && !this.visible) return;
    clearTimeout(this.timer);
    if (!this.raf) this.raf = requestAnimationFrame((now) => this.frame(now));
  }

  private frame(now: number): void {
    this.raf = 0;
    if (this.dead) return;
    this.draw(now);
    if (this.paused || !this.visible) return;
    if (this.printed !== Infinity) {
      this.raf = requestAnimationFrame((n) => this.frame(n));
      return;
    }
    this.timer = setTimeout(() => this.wake(), 1000 / (this.scene.fps ?? 11));
  }

  private draw(now: number): void {
    const { ctx, grid } = this;
    ctx.clearRect(0, 0, grid.w, grid.h);
    // A playing stage stays dark until it prints in, so its finished drawing never flashes first.
    if (!grid.cols || (!this.entered && !this.paused)) return;
    // Playing: live time. Paused after playing: the held frame. Never played: the scene's still frame.
    const still = this.paused && !this.frozen;
    if (!this.paused) this.played = true;
    // requestAnimationFrame's timestamp can precede the performance.now() this stage started at, so clamp at 0.
    const t = still ? (this.scene.stillT ?? 6) : this.frozen ? this.frozen.t : Math.max(0, (now - this.t0) / 1000);
    const clockNow = this.frozen ? this.frozen.now : now;
    const hc = this.pointer ? Math.floor((this.pointer.x - grid.ox) / grid.cw) : -1;
    const hover = hc >= 0 && hc < grid.cols && this.pointer ? { c: hc, r: Math.floor(this.pointer.y / LINE) - grid.top } : null;
    const { g, cells } = createDraw({ cols: grid.cols, rows: grid.rows, cw: grid.cw }, { t, now: clockNow, still, hover });
    this.scene.draw(g, this.state);
    // Columns the opening hasn't reached stay empty; the newest chunk flashes noise.
    const layers = new Map<string, (string | number)[]>();
    for (const cell of cells.values()) {
      let { style, ch } = cell;
      if (this.printed !== Infinity) {
        if (cell.c >= this.printed) continue;
        if (cell.c >= this.printed - this.chunk) {
          style = STYLE.bright;
          ch = NOISE[(Math.random() * NOISE.length) | 0];
        }
      }
      let list = layers.get(style);
      if (!list) layers.set(style, (list = []));
      list.push(ch, grid.ox + cell.c * grid.cw, (grid.top + cell.r) * LINE + LINE / 2);
    }
    for (const [style, list] of layers) {
      ctx.fillStyle = style;
      for (let i = 0; i < list.length; i += 3) ctx.fillText(list[i] as string, list[i + 1] as number, list[i + 2] as number);
    }
    this.place(this.printed === Infinity && !this.paused ? this.scene.readout?.(g, this.state) ?? null : null);
    if (!this.paused && now - this.lastRefresh > 250) {
      this.lastRefresh = now;
      this.refresh();
    }
  }

  /** The readout sits 12px right of its column, flips left near the edge, and stays above the drawing. */
  private place(note: Readout | null): void {
    const el = this.readout;
    if (!el) return;
    if (!note) {
      if (!el.hidden) {
        el.hidden = true;
        el.dataset.html = '';
      }
      return;
    }
    if (el.dataset.html !== note.html) {
      el.innerHTML = note.html;
      el.dataset.html = note.html;
    }
    el.hidden = false;
    const { cw, ox, w, top } = this.grid;
    const x = ox + note.c * cw;
    const left = x + cw + 12 + el.offsetWidth > w - 8 ? x - 12 - el.offsetWidth : x + cw + 12;
    const y = Math.max(top * LINE, (top + note.r) * LINE - el.offsetHeight - 6);
    el.style.transform = `translate(${Math.round(left)}px, ${Math.round(y)}px)`;
  }

  /** Live values: the Mars clock, how far back the dot has gone, the Sisyphus countdown. */
  private refresh(): void {
    const { range, statLabel, statValue } = this.parts;
    if (range && this.scene.range) range.textContent = this.scene.range(this.state);
    if (!this.scene.status) return;
    const next = this.scene.status(this.state);
    if (statLabel && next.label && statLabel.textContent !== next.label) statLabel.textContent = next.label;
    if (statValue && next.value && (statValue.dataset.text ?? statValue.textContent) !== next.value) decodeTo(statValue, next.value, { duration: 300 });
  }
}
