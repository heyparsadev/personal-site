import { describe, it, expect } from 'vitest';
import { initialState, resolveView, type IslandState } from '../../src/scripts/island/resolve';

const s = (over: Partial<IslandState>, kind: IslandState['kind'] = 'home'): IslandState => ({ ...initialState(kind), ...over });

describe('resolveView', () => {
  it('shows each page kind at rest', () => {
    expect(resolveView(s({}))).toBe('home');
    expect(resolveView(s({}, 'project'))).toBe('page');
    expect(resolveView(s({}, 'notfound'))).toBe('notfound');
  });
  it('shows the section once the title is absorbed', () => {
    expect(resolveView(s({ absorbed: true }))).toBe('section');
    expect(resolveView(s({ absorbed: true }, 'project'))).toBe('section');
  });
  it('offers the next project near the end of project pages only', () => {
    expect(resolveView(s({ absorbed: true, nearEnd: true }, 'project'))).toBe('next');
    expect(resolveView(s({ absorbed: true, nearEnd: true }))).toBe('section');
  });
  it('lets intro steps win over resting states', () => {
    expect(resolveView(s({ intro: 'hello', absorbed: true }))).toBe('hello');
    expect(resolveView(s({ intro: 'boot' }, 'project'))).toBe('boot');
  });
  it('previews words on home only, and not once absorbed', () => {
    expect(resolveView(s({ word: 'tech', intro: 'hello' }))).toBe('d-tech');
    expect(resolveView(s({ word: 'tech', absorbed: true }))).toBe('section');
    expect(resolveView(s({ word: 'tech' }, 'project'))).toBe('page');
  });
  it('orders menu, contact, sheet and flash', () => {
    expect(resolveView(s({ menu: true, word: 'tech' }))).toBe('menu-home');
    expect(resolveView(s({ menu: true }, 'project'))).toBe('menu-page');
    expect(resolveView(s({ menu: true }, 'notfound'))).toBe('menu-home');
    expect(resolveView(s({ menu: true, contact: true }))).toBe('contact');
    expect(resolveView(s({ contact: true, sheet: 'helpfinity' }))).toBe('sheet');
    expect(resolveView(s({ sheet: 'helpfinity', flash: 'copied' }))).toBe('copied');
  });
});
