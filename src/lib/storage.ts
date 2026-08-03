/**
 * Persistance locale — `localStorage` uniquement, aucune donnée ne quitte
 * l'appareil (cf. CLAUDE.md).
 *
 * La lecture est DÉFENSIVE : le contenu stocké est validé contre le schéma
 * attendu avant d'être adopté. Un état corrompu, tronqué ou issu d'une version
 * antérieure est écarté sans faire planter l'application — au pire, on repart
 * d'une partie vierge (cf. docs/ARCHITECTURE.md § 7).
 */

import type { BoardSize } from '../domain/dice.ts';
import { ROTATIONS, type Board, type Rotation, type Tile } from '../domain/draw.ts';
import type { EndCondition, Game, GameStatus, Player, Round } from '../domain/game.ts';
import type { KnownPlayer } from '../domain/roster.ts';

export const GAMES_KEY = 'boggle:games:v1';
export const ROSTER_KEY = 'boggle:roster:v1';

const VERSION = 1;

/** Au-delà, les parties les plus anciennes sont oubliées (garde-fou de quota). */
export const MAX_STORED_GAMES = 20;

export type GamesState = {
  readonly currentGameId: string | null;
  readonly games: readonly Game[];
};

const EMPTY_GAMES: GamesState = { currentGameId: null, games: [] };

/* -------------------------------------------------------------------------
 * Accès brut, tolérant aux pannes.
 * `localStorage` peut lever : quota dépassé, navigation privée, stockage
 * désactivé. Aucun de ces cas ne doit interrompre une partie en cours.
 * ---------------------------------------------------------------------- */

function readRaw(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota dépassé ou stockage indisponible : la partie continue en mémoire.
  }
}

/* -------------------------------------------------------------------------
 * Validation
 * ---------------------------------------------------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function parseBoardSize(value: unknown): BoardSize | null {
  return value === 4 || value === 5 ? value : null;
}

function parsePlayer(value: unknown): Player | null {
  if (!isRecord(value)) return null;
  if (!isNonEmptyString(value.id) || typeof value.name !== 'string') return null;
  return { id: value.id, name: value.name };
}

function parseTile(value: unknown): Tile | null {
  if (!isRecord(value)) return null;
  if (!isNonEmptyString(value.face)) return null;
  if (!ROTATIONS.includes(value.rotation as Rotation)) return null;
  if (typeof value.dieIndex !== 'number' || !Number.isInteger(value.dieIndex)) return null;
  return { face: value.face, rotation: value.rotation as Rotation, dieIndex: value.dieIndex };
}

function parseBoard(value: unknown): Board | null {
  if (!isRecord(value) || !Array.isArray(value.tiles)) return null;

  const size = parseBoardSize(value.size);
  if (size === null || value.tiles.length !== size * size) return null;

  const tiles = value.tiles.map(parseTile);
  if (tiles.some((tile) => tile === null)) return null;

  return { size, tiles: tiles as readonly Tile[] };
}

function parseScores(value: unknown): Readonly<Record<string, number>> | null {
  if (!isRecord(value)) return null;
  if (Object.values(value).some((points) => !isScore(points))) return null;
  return value as Record<string, number>;
}

function parseRound(value: unknown): Round | null {
  if (!isRecord(value)) return null;
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.drawnAt)) return null;

  const board = parseBoard(value.board);
  const scores = parseScores(value.scores);
  if (board === null || scores === null) return null;

  return { id: value.id, board, drawnAt: value.drawnAt, scores };
}

function parseEndCondition(value: unknown): EndCondition | null {
  if (!isRecord(value)) return null;

  if (value.kind === 'libre') return { kind: 'libre' };
  if (value.kind === 'manches' && typeof value.rounds === 'number' && value.rounds > 0) {
    return { kind: 'manches', rounds: value.rounds };
  }
  if (value.kind === 'score' && typeof value.target === 'number' && value.target > 0) {
    return { kind: 'score', target: value.target };
  }
  return null;
}

function parseStatus(value: unknown): GameStatus | null {
  return value === 'en-cours' || value === 'terminee' ? value : null;
}

function parseGame(value: unknown): Game | null {
  if (!isRecord(value)) return null;
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.createdAt)) return null;
  if (!Array.isArray(value.players) || !Array.isArray(value.rounds)) return null;

  const size = parseBoardSize(value.size);
  const status = parseStatus(value.status);
  const endCondition = parseEndCondition(value.endCondition);
  if (size === null || status === null || endCondition === null) return null;

  const players = value.players.map(parsePlayer);
  const rounds = value.rounds.map(parseRound);
  if (players.length === 0 || players.some((player) => player === null)) return null;
  if (rounds.some((round) => round === null)) return null;

  const finishedAt = value.finishedAt;
  if (finishedAt !== null && !isNonEmptyString(finishedAt)) return null;

  return {
    id: value.id,
    size,
    players: players as readonly Player[],
    rounds: rounds as readonly Round[],
    endCondition,
    status,
    createdAt: value.createdAt,
    finishedAt,
  };
}

function parseKnownPlayer(value: unknown): KnownPlayer | null {
  if (!isRecord(value)) return null;
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.name)) return null;
  if (!isNonEmptyString(value.lastPlayedAt)) return null;
  return { id: value.id, name: value.name, lastPlayedAt: value.lastPlayedAt };
}

/* -------------------------------------------------------------------------
 * API
 * ---------------------------------------------------------------------- */

export function readGames(): GamesState {
  const raw = readRaw(GAMES_KEY);
  if (!isRecord(raw) || raw.version !== VERSION || !Array.isArray(raw.games)) {
    return EMPTY_GAMES;
  }

  // Une partie corrompue est écartée seule : les autres restent jouables.
  const games = raw.games
    .map(parseGame)
    .filter((game): game is Game => game !== null);

  const currentGameId =
    typeof raw.currentGameId === 'string' && games.some((game) => game.id === raw.currentGameId)
      ? raw.currentGameId
      : null;

  return { currentGameId, games };
}

export function writeGames(state: GamesState): void {
  writeRaw(GAMES_KEY, {
    version: VERSION,
    currentGameId: state.currentGameId,
    games: capHistory(state),
  });
}

/**
 * Borne l'historique aux parties les plus récentes, en gardant toujours la
 * partie courante — celle-ci peut être ancienne si les joueurs l'ont reprise.
 */
function capHistory(state: GamesState): readonly Game[] {
  if (state.games.length <= MAX_STORED_GAMES) return state.games;

  const recent = state.games.slice(-MAX_STORED_GAMES);
  if (recent.some((game) => game.id === state.currentGameId)) return recent;

  const current = state.games.find((game) => game.id === state.currentGameId);
  return current ? [current, ...recent.slice(1)] : recent;
}

export function readRoster(): readonly KnownPlayer[] {
  const raw = readRaw(ROSTER_KEY);
  if (!isRecord(raw) || raw.version !== VERSION || !Array.isArray(raw.players)) {
    return [];
  }

  return raw.players
    .map(parseKnownPlayer)
    .filter((player): player is KnownPlayer => player !== null);
}

export function writeRoster(roster: readonly KnownPlayer[]): void {
  writeRaw(ROSTER_KEY, { version: VERSION, players: roster });
}
