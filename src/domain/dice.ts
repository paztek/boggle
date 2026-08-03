/**
 * Jeux de dés.
 *
 * Les faces des dés sont la SEULE source du tirage. Aucune table de fréquence
 * de lettres ne doit être introduite en parallèle : cela ferait diverger le
 * tirage du jeu physique (cf. CLAUDE.md).
 */

/** Une face de dé : une lettre, ou le digramme « Qu ». */
export type Face = string;

/** Un dé : exactement six faces. */
export type Die = readonly [Face, Face, Face, Face, Face, Face];

export type BoardSize = 4 | 5;

/* -------------------------------------------------------------------------
 * Jeux de dés FRANÇAIS.
 *
 * Les 16 dés du 4×4 et les 25 dés du 5×5 ci-dessous sont la SEULE source du
 * tirage. Une seule face par ligne, exactement six par dé.
 *
 * Contrairement au Boggle anglais, le jeu français porte un `Q` autonome :
 * aucune face « Qu ». Le digramme reste néanmoins un cas géré par le type
 * `Face` et par la police (cf. § 8.1 de docs/ARCHITECTURE.md), au cas où un
 * futur jeu le réintroduirait.
 * ---------------------------------------------------------------------- */

export const DICE_4X4: readonly Die[] = [
  ['E', 'T', 'U', 'K', 'N', 'O'],
  ['E', 'V', 'G', 'T', 'I', 'N'],
  ['D', 'E', 'C', 'A', 'M', 'P'],
  ['I', 'E', 'L', 'R', 'U', 'W'],
  ['E', 'H', 'I', 'F', 'S', 'E'],
  ['R', 'E', 'C', 'A', 'L', 'S'],
  ['E', 'N', 'T', 'D', 'O', 'S'],
  ['O', 'F', 'X', 'R', 'I', 'A'],
  ['N', 'A', 'V', 'E', 'D', 'Z'],
  ['E', 'I', 'O', 'A', 'T', 'A'],
  ['G', 'L', 'E', 'N', 'Y', 'U'],
  ['B', 'M', 'A', 'Q', 'J', 'O'],
  ['T', 'L', 'I', 'B', 'R', 'A'],
  ['S', 'P', 'U', 'L', 'T', 'E'],
  ['A', 'I', 'M', 'S', 'O', 'R'],
  ['E', 'N', 'H', 'R', 'I', 'S'],
];

export const DICE_5X5: readonly Die[] = [
  ['M', 'D', 'N', 'S', 'N', 'H'],
  ['G', 'F', 'S', 'T', 'E', 'Y'],
  ['L', 'M', 'T', 'R', 'X', 'S'],
  ['T', 'T', 'R', 'S', 'C', 'H'],
  ['B', 'M', 'L', 'N', 'D', 'L'],
  ['T', 'M', 'R', 'D', 'B', 'T'],
  ['E', 'I', 'U', 'E', 'A', 'O'],
  ['R', 'L', 'X', 'S', 'S', 'B'],
  ['N', 'A', 'A', 'T', 'E', 'Q'],
  ['T', 'C', 'J', 'F', 'S', 'H'],
  ['I', 'E', 'E', 'A', 'O', 'A'],
  ['N', 'D', 'H', 'S', 'N', 'M'],
  ['I', 'A', 'A', 'I', 'E', 'O'],
  ['O', 'E', 'U', 'E', 'I', 'A'],
  ['L', 'C', 'P', 'R', 'J', 'S'],
  ['D', 'S', 'T', 'L', 'S', 'M'],
  ['N', 'K', 'L', 'P', 'F', 'N'],
  ['D', 'W', 'R', 'N', 'L', 'P'],
  ['R', 'Z', 'N', 'N', 'T', 'Q'],
  ['R', 'G', 'L', 'R', 'V', 'F'],
  ['R', 'V', 'C', 'G', 'R', 'T'],
  ['I', 'I', 'O', 'E', 'A', 'E'],
  ['E', 'U', 'I', 'A', 'E', 'O'],
  ['U', 'I', 'A', 'E', 'O', 'A'],
  ['N', 'S', 'E', 'V', 'A', 'E'],
];

/** Jeu de dés correspondant à un format de grille. */
export function diceFor(size: BoardSize): readonly Die[] {
  return size === 4 ? DICE_4X4 : DICE_5X5;
}

/**
 * Faces dont l'orientation est ambiguë : elles sont soulignées à l'affichage,
 * comme sur les dés physiques.
 */
export const AMBIGUOUS_FACES: ReadonlySet<Face> = new Set(['M', 'W', 'N', 'Z']);
