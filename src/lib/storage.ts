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
import {
  ALERT_DISABLED,
  DEFAULT_ALERT_SECONDS,
  DEFAULT_DURATION_SECONDS,
  MAX_ALERT_SECONDS,
  MAX_DURATION_SECONDS,
  MIN_DURATION_SECONDS,
  type TimerState,
} from '../domain/timer.ts';

export const GAMES_KEY = 'boggle:games:v1';
export const ROSTER_KEY = 'boggle:roster:v1';
export const PREFS_KEY = 'boggle:prefs:v1';
export const TIMER_KEY = 'boggle:timer:v1';

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

  // La durée de manche est arrivée avec le chronomètre : les parties
  // enregistrées avant ne la portent pas. Les écarter pour si peu ferait
  // perdre l'historique sans raison — on complète avec la valeur par défaut.
  const duration = value.roundDurationSeconds;
  if (duration !== undefined && !(Number.isInteger(duration) && (duration as number) > 0)) {
    return null;
  }

  return {
    id: value.id,
    size,
    players: players as readonly Player[],
    rounds: rounds as readonly Round[],
    endCondition,
    status,
    roundDurationSeconds: (duration as number | undefined) ?? DEFAULT_DURATION_SECONDS,
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

/* -------------------------------------------------------------------------
 * Préférences — réglages de l'appareil, pas de la partie.
 *
 * Le seuil d'alerte et le son tiennent à la table où l'on joue ; ils n'ont
 * rien à faire dans le compte rendu d'une partie qu'on pourrait relire
 * ailleurs (cf. docs/ARCHITECTURE.md § 7).
 * ---------------------------------------------------------------------- */

export type Preferences = {
  /** Secondes avant la fin déclenchant l'alerte. `0` désactive. */
  readonly alertSeconds: number;
  readonly soundEnabled: boolean;
  /** Maintien de l'écran allumé pendant qu'une manche est chronométrée. */
  readonly keepAwake: boolean;
  /** Durée retenue de la dernière partie créée, proposée à la suivante. */
  readonly lastDurationSeconds: number;
};

export const DEFAULT_PREFERENCES: Preferences = {
  alertSeconds: DEFAULT_ALERT_SECONDS,
  soundEnabled: true,
  keepAwake: true,
  lastDurationSeconds: DEFAULT_DURATION_SECONDS,
};

function intInRange(value: unknown, min: number, max: number): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
    ? value
    : null;
}

function boolOr(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function readPrefs(): Preferences {
  const raw = readRaw(PREFS_KEY);
  if (!isRecord(raw) || raw.version !== VERSION) return DEFAULT_PREFERENCES;

  // Chaque champ retombe indépendamment sur sa valeur par défaut : une
  // préférence corrompue ne doit pas coûter les autres.
  return {
    alertSeconds:
      intInRange(raw.alertSeconds, ALERT_DISABLED, MAX_ALERT_SECONDS) ?? DEFAULT_ALERT_SECONDS,
    soundEnabled: boolOr(raw.soundEnabled, DEFAULT_PREFERENCES.soundEnabled),
    keepAwake: boolOr(raw.keepAwake, DEFAULT_PREFERENCES.keepAwake),
    lastDurationSeconds:
      intInRange(raw.lastDurationSeconds, MIN_DURATION_SECONDS, MAX_DURATION_SECONDS) ??
      DEFAULT_DURATION_SECONDS,
  };
}

export function writePrefs(prefs: Preferences): void {
  writeRaw(PREFS_KEY, { version: VERSION, ...prefs });
}

/* -------------------------------------------------------------------------
 * Session de chronomètre — état de séance, pas d'archive.
 *
 * Rangé à part des parties : dans `Round`, l'historique traînerait un chrono
 * figé dans chaque manche passée, et reprendre une vieille partie
 * ressusciterait un décompte sans objet.
 * ---------------------------------------------------------------------- */

export type TimerSession = {
  readonly gameId: string;
  readonly roundId: string;
  readonly state: TimerState;
};

function parseTimerState(value: unknown): TimerState | null {
  if (!isRecord(value)) return null;

  switch (value.status) {
    case 'arrete':
      return { status: 'arrete' };
    case 'termine':
      return { status: 'termine' };
    case 'en-cours':
      return typeof value.endsAt === 'number' && Number.isFinite(value.endsAt)
        ? { status: 'en-cours', endsAt: value.endsAt }
        : null;
    case 'suspendu':
      return typeof value.remainingMs === 'number' && value.remainingMs >= 0
        ? { status: 'suspendu', remainingMs: value.remainingMs }
        : null;
    default:
      return null;
  }
}

export function readTimerSession(): TimerSession | null {
  const raw = readRaw(TIMER_KEY);
  if (!isRecord(raw) || raw.version !== VERSION) return null;
  if (!isNonEmptyString(raw.gameId) || !isNonEmptyString(raw.roundId)) return null;

  const state = parseTimerState(raw.state);
  return state === null ? null : { gameId: raw.gameId, roundId: raw.roundId, state };
}

export function writeTimerSession(session: TimerSession | null): void {
  if (session === null) {
    try {
      localStorage.removeItem(TIMER_KEY);
    } catch {
      // Stockage indisponible : sans conséquence, la session vit en mémoire.
    }
    return;
  }
  writeRaw(TIMER_KEY, { version: VERSION, ...session });
}
