import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { diceFor, type BoardSize } from '../domain/dice.ts';
import { drawBoard, type Board } from '../domain/draw.ts';
import {
  addRound,
  createGame,
  finishGame,
  reopenGame,
  setScore,
  type Game,
  type NewGameInput,
  type PlayerId,
} from '../domain/game.ts';
import { rememberPlayers, removeKnownPlayer, type KnownPlayer } from '../domain/roster.ts';
import { createId } from '../lib/ids.ts';
import { cryptoRandom } from '../lib/random.ts';
import { readGames, readRoster, writeGames, writeRoster } from '../lib/storage.ts';

/** Écriture différée : évite d'écrire `localStorage` à chaque frappe dans un score. */
const PERSIST_DELAY_MS = 250;

type State = {
  readonly roster: readonly KnownPlayer[];
  readonly games: readonly Game[];
  readonly currentGameId: string | null;
  /** Grille affichée hors partie — le tirage libre reste possible. */
  readonly freeBoard: Board;
};

/**
 * Les valeurs non déterministes (grille tirée, identifiants, horodatages) sont
 * calculées par les créateurs d'actions, jamais dans le réducteur : celui-ci
 * reste une fonction pure, comme le reste du modèle.
 */
type Action =
  | { readonly type: 'draw-free'; readonly board: Board }
  | { readonly type: 'start-game'; readonly game: Game; readonly at: string }
  | { readonly type: 'new-round'; readonly board: Board; readonly id: string; readonly at: string }
  | {
      readonly type: 'set-score';
      readonly roundId: string;
      readonly playerId: PlayerId;
      readonly points: number | null;
    }
  | { readonly type: 'finish-game'; readonly at: string }
  | { readonly type: 'leave-game' }
  | { readonly type: 'resume-game'; readonly gameId: string }
  | { readonly type: 'forget-player'; readonly playerId: string };

function currentGameOf(state: State): Game | null {
  return state.games.find((game) => game.id === state.currentGameId) ?? null;
}

/** Applique une transformation à la partie courante, s'il y en a une. */
function mapCurrent(state: State, transform: (game: Game) => Game): State {
  const current = currentGameOf(state);
  if (!current) return state;

  return {
    ...state,
    games: state.games.map((game) => (game.id === current.id ? transform(game) : game)),
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'draw-free':
      return { ...state, freeBoard: action.board };

    case 'start-game':
      return {
        ...state,
        games: [...state.games, action.game],
        currentGameId: action.game.id,
        roster: rememberPlayers(state.roster, action.game.players, action.at),
      };

    case 'new-round':
      return mapCurrent(state, (game) =>
        addRound(game, action.board, action.id, action.at),
      );

    case 'set-score':
      return mapCurrent(state, (game) =>
        setScore(game, action.roundId, action.playerId, action.points),
      );

    case 'finish-game':
      return { ...mapCurrent(state, (game) => finishGame(game, action.at)), currentGameId: null };

    case 'leave-game':
      return { ...state, currentGameId: null };

    case 'resume-game': {
      const target = state.games.find((game) => game.id === action.gameId);
      if (!target) return state;

      return {
        ...state,
        currentGameId: target.id,
        games: state.games.map((game) => (game.id === target.id ? reopenGame(game) : game)),
      };
    }

    case 'forget-player':
      return { ...state, roster: removeKnownPlayer(state.roster, action.playerId) };
  }
}

function drawFor(size: BoardSize): Board {
  return drawBoard(diceFor(size), size, cryptoRandom);
}

function initialState(): State {
  const stored = readGames();
  return { ...stored, roster: readRoster(), freeBoard: drawFor(4) };
}

function now(): string {
  return new Date().toISOString();
}

/**
 * État applicatif : répertoire des joueurs, parties, grille affichée.
 * Tout est relu depuis `localStorage` au démarrage et réécrit en différé.
 */
export function useGame() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  const currentGame = useMemo(() => currentGameOf(state), [state]);

  // Persistance différée — deux clés distinctes, écrites indépendamment.
  useEffect(() => {
    const timer = setTimeout(
      () => writeGames({ currentGameId: state.currentGameId, games: state.games }),
      PERSIST_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [state.games, state.currentGameId]);

  useEffect(() => {
    const timer = setTimeout(() => writeRoster(state.roster), PERSIST_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state.roster]);

  const drawFree = useCallback((size: BoardSize) => {
    dispatch({ type: 'draw-free', board: drawFor(size) });
  }, []);

  const newRound = useCallback(() => {
    if (!currentGame) return;
    dispatch({
      type: 'new-round',
      board: drawFor(currentGame.size),
      id: createId('r'),
      at: now(),
    });
  }, [currentGame]);

  /** Crée la partie et tire immédiatement sa première grille. */
  const startGame = useCallback((input: NewGameInput) => {
    const at = now();
    const game = addRound(
      createGame(input, createId('g'), at),
      drawFor(input.size),
      createId('r'),
      at,
    );
    dispatch({ type: 'start-game', game, at });
  }, []);

  const setScoreFor = useCallback(
    (roundId: string, playerId: PlayerId, points: number | null) => {
      dispatch({ type: 'set-score', roundId, playerId, points });
    },
    [],
  );

  const finishCurrent = useCallback(() => {
    dispatch({ type: 'finish-game', at: now() });
  }, []);

  const leaveCurrent = useCallback(() => dispatch({ type: 'leave-game' }), []);

  const resumeGame = useCallback((gameId: string) => {
    dispatch({ type: 'resume-game', gameId });
  }, []);

  const forgetPlayer = useCallback((playerId: string) => {
    dispatch({ type: 'forget-player', playerId });
  }, []);

  // La grille affichée est celle de la dernière manche : un rechargement en
  // pleine partie retrouve donc la grille en cours, et non un nouveau tirage.
  const board = currentGame ? (currentGame.rounds.at(-1)?.board ?? state.freeBoard) : state.freeBoard;

  const pastGames = useMemo(
    () => [...state.games].filter((game) => game.id !== state.currentGameId).reverse(),
    [state.games, state.currentGameId],
  );

  return {
    roster: state.roster,
    currentGame,
    pastGames,
    board,
    size: board.size,
    drawFree,
    newRound,
    startGame,
    setScore: setScoreFor,
    finishCurrent,
    leaveCurrent,
    resumeGame,
    forgetPlayer,
  };
}
