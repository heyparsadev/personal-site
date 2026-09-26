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
