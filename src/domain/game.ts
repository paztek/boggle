/**
 * Modèle d'une partie : joueurs, manches, scores saisis.
 *
 * L'application NE CALCULE PAS les points (cf. docs/RULES.md § 5) : les scores
 * arrivent ici déjà comptés par les joueurs. Ce module ne fait que les ranger,
 * puis en dériver totaux et classement.
 *
 * Aucune dépendance à React, ni à l'horloge, ni au générateur d'identifiants :
 * les valeurs non déterministes sont TOUJOURS injectées par l'appelant, comme
 * l'est le hasard du tirage (cf. CLAUDE.md).
 */

import type { BoardSize } from './dice.ts';
import type { Board } from './draw.ts';

export type PlayerId = string;

export type Player = {
  readonly id: PlayerId;
  readonly name: string;
};

/**
 * Condition d'arrêt de la partie.
 *
 * Elle ne verrouille jamais l'application : elle est seulement *atteinte*, et
 * l'interface propose alors de terminer. Ce sont les joueurs qui décident
 * (cf. docs/RULES.md § 6).
 */
export type EndCondition =
  | { readonly kind: 'libre' }
  | { readonly kind: 'manches'; readonly rounds: number }
  | { readonly kind: 'score'; readonly target: number };

export const MIN_ROUNDS = 1;
export const MAX_ROUNDS = 30;
export const MIN_TARGET = 1;
export const MAX_TARGET = 999;

export type Round = {
  readonly id: string;
  readonly board: Board;
  /** ISO 8601. */
  readonly drawnAt: string;
  /** Scores saisis, indexés par joueur. Une clé absente = pas encore saisi. */
  readonly scores: Readonly<Record<PlayerId, number>>;
};

export type GameStatus = 'en-cours' | 'terminee';

export type Game = {
  readonly id: string;
  readonly size: BoardSize;
  readonly players: readonly Player[];
  readonly rounds: readonly Round[];
  readonly endCondition: EndCondition;
  readonly status: GameStatus;
  /** Durée d'une manche, en secondes — c'est une règle de jeu, propre à la partie. */
  readonly roundDurationSeconds: number;
  /** ISO 8601. */
  readonly createdAt: string;
  /** ISO 8601, ou `null` tant que la partie n'est pas terminée. */
  readonly finishedAt: string | null;
};

export type NewGameInput = {
  readonly size: BoardSize;
  readonly players: readonly Player[];
  readonly endCondition: EndCondition;
  readonly roundDurationSeconds: number;
};

function assertDuration(seconds: number): void {
  if (!Number.isInteger(seconds) || seconds <= 0) {
    throw new RangeError(`Durée de manche invalide : ${seconds}`);
  }
}

export function createGame(input: NewGameInput, id: string, createdAt: string): Game {
  if (input.players.length === 0) {
    throw new RangeError('Une partie demande au moins un joueur.');
  }
  const ids = new Set(input.players.map((player) => player.id));
  if (ids.size !== input.players.length) {
    throw new RangeError('Deux joueurs ne peuvent pas partager le même identifiant.');
  }
  assertDuration(input.roundDurationSeconds);

  return {
    id,
    size: input.size,
    players: input.players,
    rounds: [],
    endCondition: input.endCondition,
    status: 'en-cours',
    roundDurationSeconds: input.roundDurationSeconds,
    createdAt,
    finishedAt: null,
  };
}

/** La durée reste réglable en cours de partie — les joueurs ajustent au ressenti. */
export function setRoundDuration(game: Game, seconds: number): Game {
  assertDuration(seconds);
  return { ...game, roundDurationSeconds: seconds };
}

export function addPlayer(game: Game, player: Player): Game {
  if (game.players.some((existing) => existing.id === player.id)) {
    throw new RangeError(`Joueur déjà présent dans la partie : ${player.id}`);
  }
  return { ...game, players: [...game.players, player] };
}

/** Ajoute une manche pour la grille tirée. Les scores restent à saisir. */
export function addRound(game: Game, board: Board, id: string, drawnAt: string): Game {
  if (game.status === 'terminee') {
    throw new Error('Impossible d’ajouter une manche à une partie terminée.');
  }
  if (board.size !== game.size) {
    throw new RangeError(
      `Grille ${board.size}×${board.size} incompatible avec une partie ${game.size}×${game.size}.`,
    );
  }

  const round: Round = { id, board, drawnAt, scores: {} };
  return { ...game, rounds: [...game.rounds, round] };
}

/**
 * Enregistre le score d'un joueur pour une manche. `null` efface la saisie —
 * ce qui n'est pas la même chose qu'un score de 0, lequel est une saisie
 * valide et se distingue de l'absence dans le tableau.
 */
export function setScore(
  game: Game,
  roundId: string,
  playerId: PlayerId,
  points: number | null,
): Game {
  if (points !== null && (!Number.isInteger(points) || points < 0)) {
    throw new RangeError(`Score invalide : ${points}`);
  }
  if (!game.players.some((player) => player.id === playerId)) {
    throw new RangeError(`Joueur inconnu dans cette partie : ${playerId}`);
  }
  if (!game.rounds.some((round) => round.id === roundId)) {
    throw new RangeError(`Manche inconnue : ${roundId}`);
  }

  const rounds = game.rounds.map((round) => {
    if (round.id !== roundId) return round;

    if (points === null) {
      const { [playerId]: _removed, ...rest } = round.scores;
      return { ...round, scores: rest };
    }
    return { ...round, scores: { ...round.scores, [playerId]: points } };
  });

  return { ...game, rounds };
}

export function finishGame(game: Game, finishedAt: string): Game {
  return { ...game, status: 'terminee', finishedAt };
}

export function reopenGame(game: Game): Game {
  return { ...game, status: 'en-cours', finishedAt: null };
}

/**
 * Totaux cumulés — TOUJOURS dérivés des manches, jamais stockés (cf. CLAUDE.md).
 * Une saisie absente compte pour 0, ce qui traite naturellement le cas d'un
 * joueur ajouté en cours de partie.
 */
export function totals(game: Game): Readonly<Record<PlayerId, number>> {
  return Object.fromEntries(
    game.players.map((player) => [
      player.id,
      game.rounds.reduce((sum, round) => sum + (round.scores[player.id] ?? 0), 0),
    ]),
  );
}

export type Standing = {
  readonly player: Player;
  readonly total: number;
  /** Rang, à partir de 1. Les ex æquo partagent le rang et décalent le suivant. */
  readonly rank: number;
};

export function standings(game: Game): readonly Standing[] {
  const scores = totals(game);
  // `sort` opère sur une copie : `game.players` n'est jamais muté.
  const sorted = [...game.players].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));

  let previousTotal: number | null = null;
  let previousRank = 0;

  return sorted.map((player, index) => {
    const total = scores[player.id] ?? 0;
    const rank = total === previousTotal ? previousRank : index + 1;
    previousTotal = total;
    previousRank = rank;
    return { player, total, rank };
  });
}

export type EndProgress = {
  /** L'objectif est atteint : l'interface propose de terminer la partie. */
  readonly reached: boolean;
  /** Valeur courante, ou `null` en mode libre. */
  readonly current: number | null;
  /** Objectif à atteindre, ou `null` en mode libre. */
  readonly goal: number | null;
};

/** Avancement vers la condition d'arrêt. Ne modifie jamais la partie. */
export function endProgress(game: Game): EndProgress {
  const condition = game.endCondition;

  if (condition.kind === 'manches') {
    return {
      reached: game.rounds.length >= condition.rounds,
      current: game.rounds.length,
      goal: condition.rounds,
    };
  }

  if (condition.kind === 'score') {
    const best = Math.max(0, ...Object.values(totals(game)));
    return { reached: best >= condition.target, current: best, goal: condition.target };
  }

  return { reached: false, current: null, goal: null };
}
