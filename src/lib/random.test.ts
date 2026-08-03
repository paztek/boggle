import { describe, expect, it } from 'vitest';
import { createSeededRandom, cryptoRandom, pick, randomInt, shuffle } from './random.ts';

describe('createSeededRandom', () => {
  it('rejoue la même séquence à graine identique', () => {
    const take = () => Array.from({ length: 20 }, createSeededRandom(7));
    expect(take()).toEqual(take());
  });

  it('produit des séquences différentes pour des graines différentes', () => {
    const a = Array.from({ length: 20 }, createSeededRandom(1));
    const b = Array.from({ length: 20 }, createSeededRandom(2));
    expect(a).not.toEqual(b);
  });

  it('reste dans [0, 1)', () => {
    const random = createSeededRandom(123);
    for (let i = 0; i < 1000; i += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('cryptoRandom', () => {
  it('reste dans [0, 1)', () => {
    for (let i = 0; i < 1000; i += 1) {
      const value = cryptoRandom();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('randomInt', () => {
  it('couvre toutes les valeurs de [0, bound) et aucune autre', () => {
    const random = createSeededRandom(9);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i += 1) {
      const value = randomInt(random, 6);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(6);
      seen.add(value);
    }
    expect(seen.size).toBe(6);
  });

  it('refuse une borne nulle ou négative', () => {
    const random = createSeededRandom(1);
    expect(() => randomInt(random, 0)).toThrow(RangeError);
    expect(() => randomInt(random, -3)).toThrow(RangeError);
  });
});

describe('shuffle', () => {
  it('ne mute pas le tableau source', () => {
    const source = Object.freeze([1, 2, 3, 4, 5]);
    const result = shuffle(source, createSeededRandom(3));
    expect(source).toEqual([1, 2, 3, 4, 5]);
    expect(result).not.toBe(source);
  });

  it('conserve exactement les mêmes éléments', () => {
    const source = Array.from({ length: 25 }, (_, i) => i);
    const result = shuffle(source, createSeededRandom(4));
    expect([...result].sort((a, b) => a - b)).toEqual(source);
  });

  it('gère le tableau vide', () => {
    expect(shuffle([], createSeededRandom(1))).toEqual([]);
  });
});

describe('pick', () => {
  it('renvoie un élément du tableau', () => {
    const random = createSeededRandom(5);
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 100; i += 1) {
      expect(items).toContain(pick(items, random));
    }
  });

  it('refuse un tableau vide', () => {
    expect(() => pick([], createSeededRandom(1))).toThrow(RangeError);
  });
});
