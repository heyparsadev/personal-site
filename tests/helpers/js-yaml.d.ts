// js-yaml ships no types. It comes with Astro (a direct dependency of astro), and the tests only need load().
declare module 'js-yaml' {
  export function load(text: string): unknown;
}
