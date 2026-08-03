import { pick, randomInt, shuffle, type RandomFn } from '../lib/random.ts';
import type { BoardSize, Die, Face } from './dice.ts';

/** Rotations possibles d'une tuile, en degrés. */
export const ROTATIONS = [0, 90, 180, 270] as const;
export type Rotation = (typeof ROTATIONS)[number];

export type Tile = {
  readonly face: Face;
  readonly rotation: Rotation;
  /** Index du dé d'origine dans le jeu de dés — traçabilité du tirage. */
  readonly dieIndex: number;
};

export type Board = {
  readonly size: BoardSize;
  /** `size * size` tuiles, en lecture ligne par ligne. */
  readonly tiles: readonly Tile[];
};

/**
 * Tire une grille en simulant le lancer physique des dés :
 * 1. mélange — chaque dé est affecté à exactement une case ;
 * 2. lancer — une des six faces est tirée au sort ;
 * 3. orientation — rotation aléatoire à l'affichage.
 *
 * Fonction pure : à générateur identique, tirage identique.
 */
export function drawBoard(dice: readonly Die[], size: BoardSize, random: RandomFn): Board {
  const cells = size * size;
  if (dice.length !== cells) {
    throw new RangeError(
      `Une grille ${size}×${size} demande ${cells} dés, ${dice.length} fourni(s).`,
    );
  }

  const indices = shuffle(
    dice.map((_, index) => index),
    random,
  );

  const tiles: readonly Tile[] = indices.map((dieIndex) => ({
    face: pick(dice[dieIndex]!, random),
    rotation: ROTATIONS[randomInt(random, ROTATIONS.length)]!,
    dieIndex,
  }));

  return { size, tiles };
}
