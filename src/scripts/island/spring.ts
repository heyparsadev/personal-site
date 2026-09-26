/** Apple-style spring. `response` is the period (s) of the undamped oscillation; `damping` is the damping ratio (1 = no overshoot). */
export class Spring {
  x: number;
  v = 0;
  t: number;
  private k = 0;
  private c = 0;

  constructor(x: number, response = 0.4, damping = 1) {
    this.x = x;
    this.t = x;
    this.tune(response, damping);
  }

  tune(response: number, damping: number): this {
    const w = (2 * Math.PI) / response;
    this.k = w * w;
    this.c = 2 * damping * w;
    return this;
  }

  /** Advances by `dt` seconds with semi-implicit Euler in substeps of at most 1/240 s. */
  step(dt: number): number {
    const n = Math.max(1, Math.ceil(dt * 240));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      const a = -this.k * (this.x - this.t) - this.c * this.v;
      this.v += a * h;
      this.x += this.v * h;
    }
    return this.x;
  }

  snap(x: number): void {
    this.x = x;
    this.t = x;
    this.v = 0;
  }

  get settled(): boolean {
    return Math.abs(this.x - this.t) < 1e-3 && Math.abs(this.v) < 1e-3;
  }
}

/** Samples a 0 → 1 spring into a CSS `linear()` easing, for Web Animations that should feel like the island. */
export function springEasing(response: number, damping: number, maxSeconds = 2): { easing: string; duration: number } {
  const s = new Spring(0, response, damping);
  s.t = 1;
  const dt = 1 / 60;
  const pts: number[] = [0];
  let t = 0;
  while (t < maxSeconds) {
    s.step(dt);
    t += dt;
    pts.push(s.x);
    if (Math.abs(s.x - 1) < 0.001 && Math.abs(s.v) < 0.01) break;
  }
  pts[pts.length - 1] = 1;
  return { easing: `linear(${pts.map((p) => +p.toFixed(4)).join(', ')})`, duration: Math.round(t * 1000) };
}
