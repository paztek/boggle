import type { BoardSize } from './dice.ts';

/**
 * Barème officiel — données d'AFFICHAGE uniquement.
 *
 * L'application ne calcule jamais les points : les joueurs comptent sur leur
 * feuille et saisissent leur total. Ce barème n'est là que pour être rappelé
 * à l'écran pendant la saisie (cf. docs/RULES.md § 5).
 */
export type ScoreRow = {
  /** Libellé de la longueur de mot, ex. « 3 lettres », « 8 lettres et plus ». */
  readonly length: string;
  /** Points, ou `null` si la longueur n'est pas valide pour ce format. */
  readonly points: number | null;
};

const SCALE_4X4: readonly ScoreRow[] = [
  { length: '3 lettres', points: 1 },
  { length: '4 lettres', points: 1 },
  { length: '5 lettres', points: 2 },
  { length: '6 lettres', points: 3 },
  { length: '7 lettres', points: 5 },
  { length: '8 lettres et plus', points: 11 },
];

const SCALE_5X5: readonly ScoreRow[] = [
  { length: '3 lettres', points: null },
  { length: '4 lettres', points: 1 },
  { length: '5 lettres', points: 2 },
  { length: '6 lettres', points: 3 },
  { length: '7 lettres', points: 5 },
  { length: '8 lettres et plus', points: 11 },
];

export function scoreScaleFor(size: BoardSize): readonly ScoreRow[] {
  return size === 4 ? SCALE_4X4 : SCALE_5X5;
}

/** Longueur minimale d'un mot valide, par format. */
export function minimumWordLength(size: BoardSize): number {
  return size === 4 ? 3 : 4;
}
