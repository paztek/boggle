import { describe, expect, it } from 'vitest';
import { createSeededRandom, cryptoRandom } from '../lib/random.ts';
import { diceFor, type BoardSize } from './dice.ts';
import { drawBoard, ROTATIONS } from './draw.ts';

const SIZES: readonly BoardSize[] = [4, 5];

describe('drawBoard', () => {
  it.each(SIZES)('produit %i×%i tuiles', (size) => {
    const board = drawBoard(diceFor(size), size, createSeededRandom(1));
    expect(board.tiles).toHaveLength(size * size);
    expect(board.size).toBe(size);
  });

  it('refuse un jeu de dés dont la taille ne correspond pas à la grille', () => {
    expect(() => drawBoard(diceFor(4), 5, createSeededRandom(1))).toThrow(RangeError);
  });

  it('est reproductible à graine identique', () => {
    const a = drawBoard(diceFor(4), 4, createSeededRandom(42));
    const b = drawBoard(diceFor(4), 4, createSeededRandom(42));
    expect(a).toEqual(b);
  });

  // Le tirage étant aléatoire, on vérifie des invariants sur un grand nombre
  // de tirages plutôt qu'une grille figée (cf. docs/ARCHITECTURE.md § 9).
  describe.each(SIZES)('invariants sur 500 tirages en %i×%i', (size) => {
    const dice = diceFor(size);
    const boards = Array.from({ length: 500 }, (_, seed) =>
      drawBoard(dice, size, createSeededRandom(seed)),
    );

    it('utilise chaque dé exactement une fois par grille', () => {
      for (const board of boards) {
        const used = board.tiles.map((tile) => tile.dieIndex).sort((x, y) => x - y);
        expect(used).toEqual(dice.map((_, index) => index));
      }
    });

    it('ne produit que des faces appartenant au dé affecté à la case', () => {
      for (const board of boards) {
        for (const tile of board.tiles) {
          expect(dice[tile.dieIndex]).toContain(tile.face);
        }
      }
    });

    it('ne produit que des rotations autorisées', () => {
      for (const board of boards) {
        for (const tile of board.tiles) {
          expect(ROTATIONS).toContain(tile.rotation);
        }
      }
    });

    it('ne renvoie pas systématiquement la même grille', () => {
      const distinct = new Set(
        boards.map((board) => board.tiles.map((tile) => tile.face).join('')),
      );
      expect(distinct.size).toBeGreaterThan(boards.length / 2);
    });
  });

  it('fonctionne avec le générateur de production', () => {
    const board = drawBoard(diceFor(4), 4, cryptoRandom);
    expect(board.tiles).toHaveLength(16);
  });
});
