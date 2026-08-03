import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../lib/random.ts';
import { diceFor } from './dice.ts';
import { drawBoard } from './draw.ts';
import {
  addPlayer,
  addRound,
  createGame,
  endProgress,
  finishGame,
  reopenGame,
  setScore,
  standings,
  totals,
  type Game,
  type Player,
} from './game.ts';

const ALICE: Player = { id: 'p-alice', name: 'Alice' };
const BOB: Player = { id: 'p-bob', name: 'Bob' };

const T0 = '2026-01-01T10:00:00.000Z';

function board(seed = 1) {
  return drawBoard(diceFor(4), 4, createSeededRandom(seed));
}

/** Partie 4×4 à deux joueurs, sans manche. */
function newGame(): Game {
  return createGame(
    { size: 4, players: [ALICE, BOB], endCondition: { kind: 'libre' } },
    'g-1',
    T0,
  );
}

/** Partie à deux manches, scores saisis : Alice 12, Bob 7. */
function playedGame(): Game {
  let game = addRound(newGame(), board(1), 'r-1', T0);
  game = addRound(game, board(2), 'r-2', T0);
  game = setScore(game, 'r-1', ALICE.id, 5);
  game = setScore(game, 'r-1', BOB.id, 3);
  game = setScore(game, 'r-2', ALICE.id, 7);
  game = setScore(game, 'r-2', BOB.id, 4);
  return game;
}

describe('createGame', () => {
  it('crée une partie en cours, sans manche', () => {
    const game = newGame();

    expect(game.id).toBe('g-1');
    expect(game.size).toBe(4);
    expect(game.players).toEqual([ALICE, BOB]);
    expect(game.rounds).toEqual([]);
    expect(game.status).toBe('en-cours');
    expect(game.createdAt).toBe(T0);
    expect(game.finishedAt).toBeNull();
  });

  it('refuse une partie sans joueur', () => {
    expect(() =>
      createGame({ size: 4, players: [], endCondition: { kind: 'libre' } }, 'g-1', T0),
    ).toThrow(RangeError);
  });

  it('refuse deux joueurs partageant le même identifiant', () => {
    expect(() =>
      createGame(
        { size: 4, players: [ALICE, { ...BOB, id: ALICE.id }], endCondition: { kind: 'libre' } },
        'g-1',
        T0,
      ),
    ).toThrow(RangeError);
  });
});

describe('addRound', () => {
  it('ajoute une manche sans score saisi', () => {
    const game = addRound(newGame(), board(), 'r-1', T0);

    expect(game.rounds).toHaveLength(1);
    expect(game.rounds[0]?.id).toBe('r-1');
    expect(game.rounds[0]?.scores).toEqual({});
  });

  it('ne mute pas la partie d’origine', () => {
    const before = newGame();
    addRound(before, board(), 'r-1', T0);

    expect(before.rounds).toHaveLength(0);
  });

  it('refuse une grille dont le format diffère de celui de la partie', () => {
    const wrongSize = drawBoard(diceFor(5), 5, createSeededRandom(1));

    expect(() => addRound(newGame(), wrongSize, 'r-1', T0)).toThrow(RangeError);
  });
});

describe('setScore', () => {
  it('enregistre puis remplace le score d’un joueur', () => {
    let game = addRound(newGame(), board(), 'r-1', T0);
    game = setScore(game, 'r-1', ALICE.id, 5);
    expect(game.rounds[0]?.scores[ALICE.id]).toBe(5);

    game = setScore(game, 'r-1', ALICE.id, 8);
    expect(game.rounds[0]?.scores[ALICE.id]).toBe(8);
  });

  it('efface la saisie quand le score vaut null', () => {
    let game = addRound(newGame(), board(), 'r-1', T0);
    game = setScore(game, 'r-1', ALICE.id, 5);
    game = setScore(game, 'r-1', ALICE.id, null);

    expect(ALICE.id in (game.rounds[0]?.scores ?? {})).toBe(false);
  });

  it('accepte un score nul — ce n’est pas une absence de saisie', () => {
    let game = addRound(newGame(), board(), 'r-1', T0);
    game = setScore(game, 'r-1', ALICE.id, 0);

    expect(game.rounds[0]?.scores[ALICE.id]).toBe(0);
    expect(ALICE.id in (game.rounds[0]?.scores ?? {})).toBe(true);
  });

  it('refuse un score négatif ou non entier', () => {
    const game = addRound(newGame(), board(), 'r-1', T0);

    expect(() => setScore(game, 'r-1', ALICE.id, -1)).toThrow(RangeError);
    expect(() => setScore(game, 'r-1', ALICE.id, 1.5)).toThrow(RangeError);
    expect(() => setScore(game, 'r-1', ALICE.id, Number.NaN)).toThrow(RangeError);
  });

  it('refuse une manche ou un joueur inconnu', () => {
    const game = addRound(newGame(), board(), 'r-1', T0);

    expect(() => setScore(game, 'r-inconnue', ALICE.id, 1)).toThrow(RangeError);
    expect(() => setScore(game, 'r-1', 'p-inconnu', 1)).toThrow(RangeError);
  });

  it('ne touche pas aux autres manches', () => {
    const game = setScore(playedGame(), 'r-1', ALICE.id, 99);

    expect(game.rounds[1]?.scores[ALICE.id]).toBe(7);
  });
});

describe('totals', () => {
  it('somme les scores manche par manche', () => {
    expect(totals(playedGame())).toEqual({ [ALICE.id]: 12, [BOB.id]: 7 });
  });

  it('traite une saisie absente comme zéro', () => {
    const game = addRound(newGame(), board(), 'r-1', T0);

    expect(totals(game)).toEqual({ [ALICE.id]: 0, [BOB.id]: 0 });
  });

  it('compte zéro pour les manches antérieures d’un joueur ajouté en cours de partie', () => {
    const game = addPlayer(playedGame(), { id: 'p-chloe', name: 'Chloé' });

    expect(totals(game)['p-chloe']).toBe(0);
  });
});

describe('standings', () => {
  it('classe par total décroissant', () => {
    const ranking = standings(playedGame());

    expect(ranking.map((row) => row.player.id)).toEqual([ALICE.id, BOB.id]);
    expect(ranking.map((row) => row.rank)).toEqual([1, 2]);
  });

  it('donne le même rang aux ex æquo et saute le rang suivant', () => {
    let game = addRound(newGame(), board(), 'r-1', T0);
    game = addPlayer(game, { id: 'p-chloe', name: 'Chloé' });
    game = setScore(game, 'r-1', ALICE.id, 5);
    game = setScore(game, 'r-1', BOB.id, 5);
    game = setScore(game, 'r-1', 'p-chloe', 2);

    const ranking = standings(game);
    expect(ranking.map((row) => row.rank)).toEqual([1, 1, 3]);
    expect(ranking[2]?.player.id).toBe('p-chloe');
  });

  it('conserve l’ordre de saisie des joueurs à égalité', () => {
    const ranking = standings(newGame());

    expect(ranking.map((row) => row.player.id)).toEqual([ALICE.id, BOB.id]);
  });
});

describe('endProgress', () => {
  it('ne fixe aucun objectif en mode libre', () => {
    expect(endProgress(playedGame())).toEqual({ reached: false, current: null, goal: null });
  });

  it('compte les manches jouées en mode « manches »', () => {
    const game: Game = { ...playedGame(), endCondition: { kind: 'manches', rounds: 3 } };

    expect(endProgress(game)).toEqual({ reached: false, current: 2, goal: 3 });
    expect(endProgress(addRound(game, board(3), 'r-3', T0)).reached).toBe(true);
  });

  it('suit le meilleur total en mode « score »', () => {
    const game: Game = { ...playedGame(), endCondition: { kind: 'score', target: 12 } };

    expect(endProgress(game)).toEqual({ reached: true, current: 12, goal: 12 });
    expect(endProgress({ ...game, endCondition: { kind: 'score', target: 20 } })).toEqual({
      reached: false,
      current: 12,
      goal: 20,
    });
  });

  it('reste à zéro sur une partie sans manche', () => {
    const game: Game = { ...newGame(), endCondition: { kind: 'score', target: 50 } };

    expect(endProgress(game)).toEqual({ reached: false, current: 0, goal: 50 });
  });
});

describe('finishGame / reopenGame', () => {
  it('termine la partie en horodatant', () => {
    const game = finishGame(playedGame(), '2026-01-01T11:00:00.000Z');

    expect(game.status).toBe('terminee');
    expect(game.finishedAt).toBe('2026-01-01T11:00:00.000Z');
  });

  it('reprend une partie terminée', () => {
    const game = reopenGame(finishGame(playedGame(), '2026-01-01T11:00:00.000Z'));

    expect(game.status).toBe('en-cours');
    expect(game.finishedAt).toBeNull();
    expect(game.rounds).toHaveLength(2);
  });

  it('refuse d’ajouter une manche à une partie terminée', () => {
    const game = finishGame(playedGame(), '2026-01-01T11:00:00.000Z');

    expect(() => addRound(game, board(3), 'r-3', T0)).toThrow(Error);
  });
});

describe('addPlayer', () => {
  it('ajoute un joueur en fin de liste', () => {
    const game = addPlayer(newGame(), { id: 'p-chloe', name: 'Chloé' });

    expect(game.players.map((player) => player.name)).toEqual(['Alice', 'Bob', 'Chloé']);
  });

  it('refuse un identifiant déjà présent', () => {
    expect(() => addPlayer(newGame(), { id: ALICE.id, name: 'Autre' })).toThrow(RangeError);
  });
});
