import { describe, expect, it } from 'vitest';
import { DICE_4X4, DICE_5X5, diceFor } from './dice.ts';

describe('jeux de dés', () => {
  it('fournit exactement 16 dés pour le format 4×4', () => {
    expect(DICE_4X4).toHaveLength(16);
  });

  it('fournit exactement 25 dés pour le format 5×5', () => {
    expect(DICE_5X5).toHaveLength(25);
  });

  it('donne exactement 6 faces à chaque dé', () => {
    for (const die of [...DICE_4X4, ...DICE_5X5]) {
      expect(die).toHaveLength(6);
    }
  });

  it('conserve « Qu » comme une face unique et non deux lettres', () => {
    const facesWithQ = [...DICE_4X4, ...DICE_5X5].flat().filter((face) => face.startsWith('Q'));
    expect(facesWithQ.length).toBeGreaterThan(0);
    for (const face of facesWithQ) {
      expect(face).toBe('Qu');
    }
  });

  it('associe chaque format à son jeu de dés', () => {
    expect(diceFor(4)).toBe(DICE_4X4);
    expect(diceFor(5)).toBe(DICE_5X5);
  });
});
