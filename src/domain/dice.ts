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
 * ⚠️  JEU DE DÉS PROVISOIRE
 *
 * Les faces ci-dessous sont celles du Boggle ANGLAIS (Hasbro 1983 pour le 4×4,
 * Big Boggle pour le 5×5). Elles ne servent qu'à rendre l'application
 * fonctionnelle en attendant la liste officielle des dés FRANÇAIS.
 *
 * À remplacer intégralement dès réception des 16 et 25 dés français.
 * Tant que `DICE_ARE_PROVISIONAL` vaut `true`, l'interface affiche un
 * avertissement visible : ne pas le retirer avant la substitution.
 *
 * Les faces sont écrites une par une, et non sous forme de chaîne à découper :
 * « Qu » est une face unique, ce qu'un découpage caractère par caractère ne
 * saurait pas exprimer.
 * ---------------------------------------------------------------------- */

export const DICE_ARE_PROVISIONAL = true;

export const DICE_4X4: readonly Die[] = [
  ['A', 'A', 'E', 'E', 'G', 'N'],
  ['A', 'B', 'B', 'J', 'O', 'O'],
  ['A', 'C', 'H', 'O', 'P', 'S'],
  ['A', 'F', 'F', 'K', 'P', 'S'],
  ['A', 'O', 'O', 'T', 'T', 'W'],
  ['C', 'I', 'M', 'O', 'T', 'U'],
  ['D', 'E', 'I', 'L', 'R', 'X'],
  ['D', 'E', 'L', 'R', 'V', 'Y'],
  ['D', 'I', 'S', 'T', 'T', 'Y'],
  ['E', 'E', 'G', 'H', 'N', 'W'],
  ['E', 'E', 'I', 'N', 'S', 'U'],
  ['E', 'H', 'R', 'T', 'V', 'W'],
  ['E', 'I', 'O', 'S', 'S', 'T'],
  ['E', 'L', 'R', 'T', 'T', 'Y'],
  ['H', 'I', 'M', 'N', 'Qu', 'U'],
  ['H', 'L', 'N', 'N', 'R', 'Z'],
];

export const DICE_5X5: readonly Die[] = [
  ['A', 'A', 'A', 'F', 'R', 'S'],
  ['A', 'A', 'E', 'E', 'E', 'E'],
  ['A', 'A', 'F', 'I', 'R', 'S'],
  ['A', 'D', 'E', 'N', 'N', 'N'],
  ['A', 'E', 'E', 'E', 'E', 'M'],
  ['A', 'E', 'E', 'G', 'M', 'U'],
  ['A', 'E', 'G', 'M', 'N', 'N'],
  ['A', 'F', 'I', 'R', 'S', 'Y'],
  ['B', 'J', 'K', 'Qu', 'X', 'Z'],
  ['C', 'C', 'N', 'S', 'T', 'W'],
  ['C', 'E', 'I', 'I', 'L', 'T'],
  ['C', 'E', 'I', 'L', 'P', 'T'],
  ['C', 'E', 'I', 'P', 'S', 'T'],
  ['D', 'D', 'H', 'N', 'O', 'T'],
  ['D', 'H', 'H', 'L', 'O', 'R'],
  ['D', 'H', 'L', 'N', 'O', 'R'],
  ['D', 'D', 'L', 'N', 'O', 'R'],
  ['E', 'I', 'I', 'I', 'T', 'T'],
  ['E', 'M', 'O', 'T', 'T', 'T'],
  ['E', 'N', 'S', 'S', 'S', 'U'],
  ['F', 'I', 'P', 'R', 'S', 'Y'],
  ['G', 'O', 'R', 'R', 'V', 'W'],
  ['H', 'I', 'P', 'R', 'R', 'Y'],
  ['N', 'O', 'O', 'T', 'U', 'W'],
  ['O', 'O', 'O', 'T', 'T', 'U'],
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
