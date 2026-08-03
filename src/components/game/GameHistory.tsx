import { standings, type Game } from '../../domain/game.ts';

type GameHistoryProps = {
  readonly games: readonly Game[];
  readonly onResume: (gameId: string) => void;
};

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : dateFormat.format(date);
}

/** Résumé d'une partie : « Alice 24 · Bob 19 », classement décroissant. */
function summarize(game: Game): string {
  return standings(game)
    .map((row) => `${row.player.name} ${row.total}`)
    .join(' · ');
}

/**
 * Parties passées, de la plus récente à la plus ancienne. Reprendre une partie
 * la rouvre : elle redevient la partie courante et les manches se poursuivent.
 */
export function GameHistory({ games, onResume }: GameHistoryProps) {
  if (games.length === 0) {
    return <p className="game__hint">Aucune partie enregistrée pour l&apos;instant.</p>;
  }

  return (
    <ul className="game__history">
      {games.map((game) => (
        <li key={game.id} className="game__history-item">
          <div className="game__history-info">
            <p className="game__history-title">
              {game.size}×{game.size} · {game.rounds.length} manche
              {game.rounds.length > 1 ? 's' : ''}
              {/* Espace explicite : sans lui, la marge CSS sépare visuellement
                  mais le texte reste collé pour un lecteur d'écran. */}
              {game.status === 'terminee' && <> <span className="game__badge">Terminée</span></>}
            </p>
            <p className="game__history-meta">{formatDate(game.createdAt)}</p>
            <p className="game__history-scores">{summarize(game)}</p>
          </div>
          <button type="button" className="game__button" onClick={() => onResume(game.id)}>
            Reprendre
          </button>
        </li>
      ))}
    </ul>
  );
}
