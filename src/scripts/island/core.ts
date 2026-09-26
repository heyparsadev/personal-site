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
    if (reduced) for (const s of [this.w, this.h, this.r, this.lean, this.split, this.gulp, this.press]) s.tune(0.3, 1);
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
