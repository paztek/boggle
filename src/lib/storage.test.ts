import { beforeEach, describe, expect, it, vi } from 'vitest';
import { diceFor } from '../domain/dice.ts';
import { drawBoard } from '../domain/draw.ts';
import { addRound, createGame, type Game } from '../domain/game.ts';
import type { KnownPlayer } from '../domain/roster.ts';
import { DEFAULT_ALERT_SECONDS, DEFAULT_DURATION_SECONDS } from '../domain/timer.ts';
import { createSeededRandom } from './random.ts';
import {
  DEFAULT_PREFERENCES,
  GAMES_KEY,
  MAX_STORED_GAMES,
  PREFS_KEY,
  readGames,
  readPrefs,
  readTimerSession,
  writeTimerSession,
  writePrefs,
  readRoster,
  writeGames,
  writeRoster,
  ROSTER_KEY,
  TIMER_KEY,
  type GamesState,
} from './storage.ts';

const T0 = '2026-01-01T10:00:00.000Z';

function makeGame(id: string): Game {
  const game = createGame(
    {
      size: 4,
      players: [{ id: 'p-alice', name: 'Alice' }],
      endCondition: { kind: 'manches', rounds: 3 },
      roundDurationSeconds: 180,
    },
    id,
    T0,
  );
  return addRound(game, drawBoard(diceFor(4), 4, createSeededRandom(1)), `${id}-r1`, T0);
}

const EMPTY: GamesState = { currentGameId: null, games: [] };

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('readGames — lecture défensive', () => {
  it('repart d’un état vierge quand rien n’est stocké', () => {
    expect(readGames()).toEqual(EMPTY);
  });

  it.each([
    ['un JSON illisible', '{ ceci n’est pas du JSON'],
    ['une valeur qui n’est pas un objet', '"bonjour"'],
    ['un tableau nu', '[]'],
    ['null', 'null'],
  ])('repart d’un état vierge sur %s', (_label, payload) => {
    localStorage.setItem(GAMES_KEY, payload);

    expect(readGames()).toEqual(EMPTY);
  });

  it('écarte une version antérieure ou inconnue', () => {
    localStorage.setItem(
      GAMES_KEY,
      JSON.stringify({ version: 0, currentGameId: null, games: [makeGame('g-1')] }),
    );

    expect(readGames()).toEqual(EMPTY);
  });

  it('écarte les seules parties invalides et conserve les autres', () => {
    const valid = makeGame('g-1');
    localStorage.setItem(
      GAMES_KEY,
      JSON.stringify({
        version: 1,
        currentGameId: 'g-1',
        games: [valid, { id: 'g-2', size: 9 }, null, { ...valid, id: 'g-3', rounds: 'oups' }],
      }),
    );

    const state = readGames();
    expect(state.games.map((game) => game.id)).toEqual(['g-1']);
    expect(state.currentGameId).toBe('g-1');
  });

  it('oublie une partie courante qui n’existe pas', () => {
    localStorage.setItem(
      GAMES_KEY,
      JSON.stringify({ version: 1, currentGameId: 'g-absente', games: [makeGame('g-1')] }),
    );

    expect(readGames().currentGameId).toBeNull();
  });

  it('écarte une partie dont une tuile est corrompue', () => {
    const game = makeGame('g-1');
    const corrupted = {
      ...game,
      rounds: [{ ...game.rounds[0], board: { size: 4, tiles: [{ face: 'A' }] } }],
    };
    localStorage.setItem(
      GAMES_KEY,
      JSON.stringify({ version: 1, currentGameId: null, games: [corrupted] }),
    );

    expect(readGames().games).toEqual([]);
  });

  // La durée de manche est arrivée après coup : les parties déjà stockées ne
  // la portent pas et doivent rester jouables plutôt que d'être écartées.
  it('accepte une partie enregistrée avant l’arrivée du chronomètre', () => {
    const { roundDurationSeconds: _absent, ...legacy } = makeGame('g-1');
    localStorage.setItem(
      GAMES_KEY,
      JSON.stringify({ version: 1, currentGameId: null, games: [legacy] }),
    );

    const [restored] = readGames().games;
    expect(restored?.id).toBe('g-1');
    expect(restored?.roundDurationSeconds).toBe(DEFAULT_DURATION_SECONDS);
  });

  it('écarte une partie dont la durée de manche est aberrante', () => {
    localStorage.setItem(
      GAMES_KEY,
      JSON.stringify({
        version: 1,
        currentGameId: null,
        games: [{ ...makeGame('g-1'), roundDurationSeconds: -1 }],
      }),
    );

    expect(readGames().games).toEqual([]);
  });

  it('écarte une partie dont un score n’est pas un nombre', () => {
    const game = makeGame('g-1');
    const corrupted = {
      ...game,
      rounds: [{ ...game.rounds[0], scores: { 'p-alice': 'douze' } }],
    };
    localStorage.setItem(
      GAMES_KEY,
      JSON.stringify({ version: 1, currentGameId: null, games: [corrupted] }),
    );

    expect(readGames().games).toEqual([]);
  });
});

describe('writeGames', () => {
  it('fait un aller-retour fidèle', () => {
    const state: GamesState = { currentGameId: 'g-1', games: [makeGame('g-1')] };
    writeGames(state);

    expect(readGames()).toEqual(state);
  });

  it('ne conserve que les parties les plus récentes', () => {
    const games = Array.from({ length: MAX_STORED_GAMES + 5 }, (_, index) =>
      makeGame(`g-${index}`),
    );
    writeGames({ currentGameId: null, games });

    const stored = readGames().games;
    expect(stored).toHaveLength(MAX_STORED_GAMES);
    expect(stored[0]?.id).toBe('g-5');
  });

  it('conserve la partie courante même si elle sort de la fenêtre d’historique', () => {
    const games = Array.from({ length: MAX_STORED_GAMES + 5 }, (_, index) =>
      makeGame(`g-${index}`),
    );
    writeGames({ currentGameId: 'g-0', games });

    expect(readGames().games.map((game) => game.id)).toContain('g-0');
  });

  it('ne plante pas quand le quota est dépassé', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

    expect(() => writeGames({ currentGameId: null, games: [makeGame('g-1')] })).not.toThrow();
  });
});

describe('roster', () => {
  const roster: readonly KnownPlayer[] = [
    { id: 'p-alice', name: 'Alice', lastPlayedAt: T0 },
  ];

  it('fait un aller-retour fidèle', () => {
    writeRoster(roster);

    expect(readRoster()).toEqual(roster);
  });

  it('repart d’un répertoire vide sur contenu illisible', () => {
    localStorage.setItem(ROSTER_KEY, 'nawak');

    expect(readRoster()).toEqual([]);
  });

  it('écarte les seules entrées invalides', () => {
    localStorage.setItem(
      ROSTER_KEY,
      JSON.stringify({
        version: 1,
        players: [roster[0], { id: 'p-bob' }, { name: 'Chloé', lastPlayedAt: T0 }],
      }),
    );

    expect(readRoster()).toEqual(roster);
  });
});

describe('préférences', () => {
  it('part sur les valeurs par défaut quand rien n’est stocké', () => {
    expect(readPrefs()).toEqual(DEFAULT_PREFERENCES);
    expect(DEFAULT_PREFERENCES.alertSeconds).toBe(DEFAULT_ALERT_SECONDS);
  });

  it('fait un aller-retour fidèle', () => {
    const prefs = {
      alertSeconds: 15,
      soundEnabled: false,
      keepAwake: false,
      lastDurationSeconds: 240,
    };
    writePrefs(prefs);

    expect(readPrefs()).toEqual(prefs);
  });

  it('rejette une durée mémorisée hors bornes', () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ version: 1, lastDurationSeconds: 5 }));

    expect(readPrefs().lastDurationSeconds).toBe(DEFAULT_PREFERENCES.lastDurationSeconds);
  });

  // Une préférence corrompue ne doit pas coûter les autres.
  it('retombe champ par champ sur les valeurs par défaut', () => {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ version: 1, alertSeconds: 'beaucoup', soundEnabled: false }),
    );

    expect(readPrefs()).toEqual({
      ...DEFAULT_PREFERENCES,
      soundEnabled: false,
    });
  });

  it('rejette un seuil d’alerte hors bornes', () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ version: 1, alertSeconds: 9999 }));

    expect(readPrefs().alertSeconds).toBe(DEFAULT_ALERT_SECONDS);
  });
});

describe('session de chronomètre', () => {
  const session = {
    gameId: 'g-1',
    roundId: 'g-1-r1',
    state: { status: 'en-cours', endsAt: 1_800_000_180_000 },
  } as const;

  it('fait un aller-retour fidèle', () => {
    writeTimerSession(session);

    expect(readTimerSession()).toEqual(session);
  });

  it('renvoie null quand rien n’est stocké', () => {
    expect(readTimerSession()).toBeNull();
  });

  it('écarte une session corrompue plutôt que de restaurer un chrono faux', () => {
    localStorage.setItem(
      TIMER_KEY,
      JSON.stringify({ version: 1, gameId: 'g-1', roundId: 'r-1', state: { status: 'flottant' } }),
    );

    expect(readTimerSession()).toBeNull();
  });

  it('écarte une échéance qui n’est pas un nombre', () => {
    localStorage.setItem(
      TIMER_KEY,
      JSON.stringify({
        version: 1,
        gameId: 'g-1',
        roundId: 'r-1',
        state: { status: 'en-cours', endsAt: 'bientôt' },
      }),
    );

    expect(readTimerSession()).toBeNull();
  });

  it('s’efface', () => {
    writeTimerSession(session);
    writeTimerSession(null);

    expect(readTimerSession()).toBeNull();
  });
});
