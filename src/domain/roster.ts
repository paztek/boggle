/**
 * Répertoire des joueurs déjà rencontrés, pour éviter de retaper les noms à
 * chaque partie. Persisté séparément des parties (cf. docs/ARCHITECTURE.md § 7).
 *
 * Comme le reste de `domain/`, ce module est pur : la date d'usage est injectée.
 */

import type { Player } from './game.ts';

export type KnownPlayer = {
  readonly id: string;
  readonly name: string;
  /** ISO 8601 — sert au tri, le plus récemment joué en tête. */
  readonly lastPlayedAt: string;
};

/**
 * Clé de comparaison des noms : casse, accents et espaces de bordure ignorés.
 * « Chloé », « chloe » et « CHLOE » désignent la même personne autour de la table.
 */
function normalizeName(name: string): string {
  return name
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('fr');
}

function byMostRecent(a: KnownPlayer, b: KnownPlayer): number {
  return b.lastPlayedAt.localeCompare(a.lastPlayedAt);
}

/**
 * Recherche par nom, à la comparaison près définie ci-dessus. Générique sur le
 * type des entrées : sert aussi bien sur le répertoire que sur les joueurs
 * déjà retenus pour une partie.
 */
export function findKnownPlayer<T extends { readonly name: string }>(
  roster: readonly T[],
  name: string,
): T | undefined {
  const key = normalizeName(name);
  return roster.find((player) => normalizeName(player.name) === key);
}

/**
 * Ajoute un joueur, ou rafraîchit sa date d'usage s'il est déjà connu.
 * L'orthographe d'origine est conservée : c'est celle que la personne a choisie.
 */
export function addKnownPlayer(
  roster: readonly KnownPlayer[],
  name: string,
  id: string,
  at: string,
): readonly KnownPlayer[] {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new RangeError('Le nom d’un joueur ne peut pas être vide.');
  }

  const existing = findKnownPlayer(roster, trimmed);
  const next = existing
    ? roster.map((player) =>
        player.id === existing.id ? { ...player, lastPlayedAt: at } : player,
      )
    : [...roster, { id, name: trimmed, lastPlayedAt: at }];

  return [...next].sort(byMostRecent);
}

/** Enregistre en une fois les joueurs d'une partie qui démarre. */
export function rememberPlayers(
  roster: readonly KnownPlayer[],
  players: readonly Player[],
  at: string,
): readonly KnownPlayer[] {
  return players.reduce(
    (current, player) => addKnownPlayer(current, player.name, player.id, at),
    roster,
  );
}

export function removeKnownPlayer(
  roster: readonly KnownPlayer[],
  id: string,
): readonly KnownPlayer[] {
  return roster.filter((player) => player.id !== id);
}
