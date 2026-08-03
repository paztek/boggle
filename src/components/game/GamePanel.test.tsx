import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { diceFor } from '../../domain/dice.ts';
import { drawBoard } from '../../domain/draw.ts';
import { addRound, createGame, setScore, type Game } from '../../domain/game.ts';
import type { KnownPlayer } from '../../domain/roster.ts';
import { createSeededRandom } from '../../lib/random.ts';
import { GamePanel } from './GamePanel.tsx';

const T0 = '2026-01-01T10:00:00.000Z';

const ROSTER: readonly KnownPlayer[] = [
  { id: 'p-alice', name: 'Alice', lastPlayedAt: T0 },
  { id: 'p-bob', name: 'Bob', lastPlayedAt: T0 },
];

function makeGame(rounds = 1): Game {
  let game = createGame(
    {
      size: 4,
      players: [
        { id: 'p-alice', name: 'Alice' },
        { id: 'p-bob', name: 'Bob' },
      ],
      endCondition: { kind: 'manches', rounds: 2 },
    },
    'g-1',
    T0,
  );
  for (let index = 0; index < rounds; index += 1) {
    game = addRound(game, drawBoard(diceFor(4), 4, createSeededRandom(index)), `r-${index}`, T0);
  }
  return game;
}

function renderPanel(overrides: Partial<Parameters<typeof GamePanel>[0]> = {}) {
  const props = {
    open: true,
    roster: ROSTER,
    game: null,
    pastGames: [],
    onStart: vi.fn(),
    onSetScore: vi.fn(),
    onFinish: vi.fn(),
    onLeave: vi.fn(),
    onResume: vi.fn(),
    onForgetPlayer: vi.fn(),
    ...overrides,
  };
  render(<GamePanel {...props} />);
  return props;
}

/**
 * Panneau branché sur un vrai état : les champs de score sont contrôlés, il
 * faut donc que le parent réapplique la saisie pour tester plus d'un chiffre.
 */
function StatefulPanel({ initial }: { readonly initial: Game }) {
  const [game, setGame] = useState(initial);

  return (
    <GamePanel
      open
      roster={[]}
      game={game}
      pastGames={[]}
      onStart={vi.fn()}
      onSetScore={(roundId, playerId, points) =>
        setGame((current) => setScore(current, roundId, playerId, points))
      }
      onFinish={vi.fn()}
      onLeave={vi.fn()}
      onResume={vi.fn()}
      onForgetPlayer={vi.fn()}
    />
  );
}

describe('GamePanel — ouverture', () => {
  it('est replié au départ : le panneau est hors tabulation', () => {
    renderPanel({ open: undefined });

    const toggle = screen.getByRole('button', { name: /partie & scores/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByLabelText('Partie et scores')).toHaveAttribute('inert');
  });

  it('se déplie au clic puis se referme avec Échap', async () => {
    const user = userEvent.setup();
    renderPanel({ open: undefined });

    const toggle = screen.getByRole('button', { name: /partie & scores/i });
    await user.click(toggle);
    expect(screen.getByLabelText('Partie et scores')).not.toHaveAttribute('inert');

    await user.keyboard('{Escape}');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('GamePanel — démarrage d’une partie', () => {
  it('refuse de démarrer sans joueur', () => {
    renderPanel();

    expect(screen.getByRole('button', { name: /démarrer la partie/i })).toBeDisabled();
  });

  it('propose les joueurs déjà enregistrés et démarre avec eux', async () => {
    const user = userEvent.setup();
    const props = renderPanel();

    await user.click(screen.getByRole('button', { name: 'Alice' }));
    await user.click(screen.getByRole('button', { name: 'Bob' }));
    await user.click(screen.getByRole('button', { name: /démarrer la partie/i }));

    expect(props.onStart).toHaveBeenCalledWith({
      size: 4,
      players: [
        { id: 'p-alice', name: 'Alice' },
        { id: 'p-bob', name: 'Bob' },
      ],
      endCondition: { kind: 'libre' },
    });
  });

  it('réutilise l’identifiant du répertoire quand le nom saisi est déjà connu', async () => {
    const user = userEvent.setup();
    const props = renderPanel();

    await user.type(screen.getByLabelText('Joueurs'), 'ALICE{Enter}');
    await user.click(screen.getByRole('button', { name: /démarrer la partie/i }));

    expect(props.onStart).toHaveBeenCalledWith(
      expect.objectContaining({ players: [{ id: 'p-alice', name: 'Alice' }] }),
    );
  });

  it('n’ajoute pas deux fois le même joueur', async () => {
    const user = userEvent.setup();
    const props = renderPanel();

    const input = screen.getByLabelText('Joueurs');
    await user.type(input, 'Chloé{Enter}');
    await user.type(input, 'chloe{Enter}');
    await user.click(screen.getByRole('button', { name: /démarrer la partie/i }));

    expect(props.onStart).toHaveBeenCalledWith(
      expect.objectContaining({ players: [{ id: expect.any(String), name: 'Chloé' }] }),
    );
  });

  it('transmet le mode de fin choisi : nombre de manches réglable', async () => {
    const user = userEvent.setup();
    const props = renderPanel();

    await user.click(screen.getByRole('button', { name: 'Alice' }));
    await user.click(screen.getByRole('radio', { name: /nombre de manches/i }));
    // `getByLabelText` serait ambigu : le libellé sert au bouton radio ET au champ.
    const rounds = screen.getByRole('spinbutton', { name: 'Nombre de manches' });
    await user.clear(rounds);
    await user.type(rounds, '7');
    await user.click(screen.getByRole('button', { name: /démarrer la partie/i }));

    expect(props.onStart).toHaveBeenCalledWith(
      expect.objectContaining({ endCondition: { kind: 'manches', rounds: 7 } }),
    );
  });

  it('ramène un nombre de manches hors bornes dans l’intervalle autorisé', async () => {
    const user = userEvent.setup();
    const props = renderPanel();

    await user.click(screen.getByRole('button', { name: 'Alice' }));
    await user.click(screen.getByRole('radio', { name: /nombre de manches/i }));
    const rounds = screen.getByRole('spinbutton', { name: 'Nombre de manches' });
    await user.clear(rounds);
    await user.type(rounds, '999');
    await user.tab();
    await user.click(screen.getByRole('button', { name: /démarrer la partie/i }));

    expect(props.onStart).toHaveBeenCalledWith(
      expect.objectContaining({ endCondition: { kind: 'manches', rounds: 30 } }),
    );
  });

  it('transmet le mode de fin choisi : score à atteindre', async () => {
    const user = userEvent.setup();
    const props = renderPanel();

    await user.click(screen.getByRole('button', { name: 'Alice' }));
    await user.click(screen.getByRole('radio', { name: /score à atteindre/i }));
    await user.click(screen.getByRole('button', { name: /démarrer la partie/i }));

    expect(props.onStart).toHaveBeenCalledWith(
      expect.objectContaining({ endCondition: { kind: 'score', target: 200 } }),
    );
  });

  it('transmet le format 5×5', async () => {
    const user = userEvent.setup();
    const props = renderPanel();

    await user.click(screen.getByRole('button', { name: 'Alice' }));
    await user.click(screen.getByRole('button', { name: '5×5' }));
    await user.click(screen.getByRole('button', { name: /démarrer la partie/i }));

    expect(props.onStart).toHaveBeenCalledWith(expect.objectContaining({ size: 5 }));
  });
});

describe('GamePanel — partie en cours', () => {
  it('affiche une colonne par joueur plus celle des manches', () => {
    renderPanel({ game: makeGame(2) });

    const headers = within(screen.getByRole('table')).getAllByRole('columnheader');
    expect(headers.map((cell) => cell.textContent)).toEqual(['Manche', 'Alice', 'Bob']);
  });

  it('remonte la saisie d’un score', async () => {
    const user = userEvent.setup();
    const props = renderPanel({ game: makeGame(1) });

    await user.type(screen.getByLabelText('Score de Alice, manche 1'), '7');

    expect(props.onSetScore).toHaveBeenLastCalledWith('r-0', 'p-alice', 7);
  });

  it('accepte un score à plusieurs chiffres et met à jour le total', async () => {
    const user = userEvent.setup();
    render(<StatefulPanel initial={makeGame(1)} />);

    await user.type(screen.getByLabelText('Score de Alice, manche 1'), '12');

    const footer = within(screen.getByRole('table')).getAllByRole('row').at(-1);
    expect(within(footer as HTMLTableRowElement).getAllByRole('cell')[0]).toHaveTextContent('12');
  });

  it('efface la saisie quand le champ est vidé', async () => {
    const user = userEvent.setup();
    const game = setScore(makeGame(1), 'r-0', 'p-alice', 5);
    const props = renderPanel({ game });

    await user.clear(screen.getByLabelText('Score de Alice, manche 1'));

    expect(props.onSetScore).toHaveBeenLastCalledWith('r-0', 'p-alice', null);
  });

  it('affiche les totaux cumulés', async () => {
    let game = setScore(makeGame(2), 'r-0', 'p-alice', 5);
    game = setScore(game, 'r-1', 'p-alice', 7);
    renderPanel({ game });

    const footer = within(screen.getByRole('table')).getAllByRole('row').at(-1);
    expect(within(footer as HTMLTableRowElement).getAllByRole('cell')[0]).toHaveTextContent('12');
  });

  it('affiche l’avancement et propose de terminer une fois l’objectif atteint', async () => {
    const user = userEvent.setup();
    const props = renderPanel({ game: makeGame(2) });

    expect(screen.getByText('Manche 2 / 2')).toBeInTheDocument();
    const banner = screen.getByRole('status');
    expect(banner).toHaveTextContent(/objectif atteint/i);

    await user.click(within(banner).getByRole('button', { name: /terminer la partie/i }));
    expect(props.onFinish).toHaveBeenCalled();
  });

  it('ne propose rien tant que l’objectif n’est pas atteint', () => {
    renderPanel({ game: makeGame(1) });

    expect(screen.getByText('Manche 1 / 2')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('GamePanel — parties passées', () => {
  it('reprend une partie de l’historique', async () => {
    const user = userEvent.setup();
    const props = renderPanel({ pastGames: [makeGame(3)] });

    expect(screen.getByText(/4×4 · 3 manches/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /reprendre/i }));

    expect(props.onResume).toHaveBeenCalledWith('g-1');
  });

  it('le dit quand l’historique est vide', () => {
    renderPanel();

    expect(screen.getByText(/aucune partie enregistrée/i)).toBeInTheDocument();
  });
});
