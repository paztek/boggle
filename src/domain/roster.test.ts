import { describe, expect, it } from 'vitest';
import {
  addKnownPlayer,
  findKnownPlayer,
  rememberPlayers,
  removeKnownPlayer,
  type KnownPlayer,
} from './roster.ts';

const T0 = '2026-01-01T10:00:00.000Z';
const T1 = '2026-01-02T10:00:00.000Z';

describe('addKnownPlayer', () => {
  it('ajoute un joueur au répertoire', () => {
    const roster = addKnownPlayer([], 'Alice', 'p-alice', T0);

    expect(roster).toEqual([{ id: 'p-alice', name: 'Alice', lastPlayedAt: T0 }]);
  });

  it('coupe les espaces autour du nom', () => {
    const roster = addKnownPlayer([], '  Alice  ', 'p-alice', T0);

    expect(roster[0]?.name).toBe('Alice');
  });

  it('refuse un nom vide', () => {
    expect(() => addKnownPlayer([], '   ', 'p-alice', T0)).toThrow(RangeError);
  });

  it.each([
    ['la casse', 'ALICE'],
    ['les accents', 'Alicé'],
    ['les espaces', ' alice '],
  ])('ne crée pas de doublon en ignorant %s', (_label, variant) => {
    const roster = addKnownPlayer(addKnownPlayer([], 'Alice', 'p-alice', T0), variant, 'p-2', T1);

    expect(roster).toHaveLength(1);
    expect(roster[0]?.id).toBe('p-alice');
  });

  it('rafraîchit la date d’usage sur un doublon, sans écraser l’orthographe d’origine', () => {
    const roster = addKnownPlayer(addKnownPlayer([], 'Chloé', 'p-chloe', T0), 'chloe', 'p-2', T1);

    expect(roster[0]).toEqual({ id: 'p-chloe', name: 'Chloé', lastPlayedAt: T1 });
  });

  it('ne mute pas le répertoire d’origine', () => {
    const before = addKnownPlayer([], 'Alice', 'p-alice', T0);
    addKnownPlayer(before, 'Bob', 'p-bob', T1);

    expect(before).toHaveLength(1);
  });

  it('trie du plus récemment joué au plus ancien', () => {
    let roster = addKnownPlayer([], 'Alice', 'p-alice', T0);
    roster = addKnownPlayer(roster, 'Bob', 'p-bob', T1);

    expect(roster.map((player) => player.id)).toEqual(['p-bob', 'p-alice']);
  });
});

describe('rememberPlayers', () => {
  it('enregistre en une fois les joueurs d’une partie', () => {
    const roster = rememberPlayers(
      [],
      [
        { id: 'p-alice', name: 'Alice' },
        { id: 'p-bob', name: 'Bob' },
      ],
      T0,
    );

    expect(roster.map((player) => player.name).sort()).toEqual(['Alice', 'Bob']);
  });

  it('remonte les joueurs déjà connus au lieu de les dupliquer', () => {
    const known: readonly KnownPlayer[] = [
      { id: 'p-alice', name: 'Alice', lastPlayedAt: T0 },
      { id: 'p-bob', name: 'Bob', lastPlayedAt: T0 },
    ];
    const roster = rememberPlayers(known, [{ id: 'p-bob', name: 'Bob' }], T1);

    expect(roster).toHaveLength(2);
    expect(roster[0]?.id).toBe('p-bob');
    expect(roster[0]?.lastPlayedAt).toBe(T1);
  });
});

describe('findKnownPlayer', () => {
  const roster: readonly KnownPlayer[] = [{ id: 'p-chloe', name: 'Chloé', lastPlayedAt: T0 }];

  it('retrouve un joueur malgré la casse et les accents', () => {
    expect(findKnownPlayer(roster, 'CHLOE')?.id).toBe('p-chloe');
  });

  it('renvoie undefined pour un inconnu', () => {
    expect(findKnownPlayer(roster, 'Alice')).toBeUndefined();
  });
});

describe('removeKnownPlayer', () => {
  it('retire un joueur du répertoire', () => {
    const roster = removeKnownPlayer(
      [
        { id: 'p-alice', name: 'Alice', lastPlayedAt: T0 },
        { id: 'p-bob', name: 'Bob', lastPlayedAt: T0 },
      ],
      'p-alice',
    );

    expect(roster.map((player) => player.id)).toEqual(['p-bob']);
  });
});
