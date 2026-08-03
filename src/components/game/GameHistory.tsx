import { useState } from 'react';
import { standings, type Game } from '../../domain/game.ts';

type GameHistoryProps = {
  readonly games: readonly Game[];
  readonly onResume: (gameId: string) => void;
  readonly onDelete: (gameId: string) => void;
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
 *
 * La suppression demande confirmation sur place : elle est définitive — rien
 * n'est envoyé nulle part, il n'y a donc rien à restaurer — et le bouton
 * voisine avec « Reprendre ».
 */
export function GameHistory({ games, onResume, onDelete }: GameHistoryProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (games.length === 0) {
    return <p className="game__hint">Aucune partie enregistrée pour l&apos;instant.</p>;
  }

  return (
    <ul className="game__history">
      {games.map((game) => {
        const label = `${game.size}×${game.size} du ${formatDate(game.createdAt)}`;
        const confirming = pendingId === game.id;

        return (
          <li key={game.id} className="game__history-item" data-confirming={confirming}>
            <div className="game__history-info">
              <p className="game__history-title">
                {game.size}×{game.size} · {game.rounds.length} manche
                {game.rounds.length > 1 ? 's' : ''}
                {/* Espace explicite : sans lui, la marge CSS sépare visuellement
                    mais le texte reste collé pour un lecteur d'écran. */}
                {game.status === 'terminee' && (
                  <>
                    {' '}
                    <span className="game__badge">Terminée</span>
                  </>
                )}
              </p>
              <p className="game__history-meta">{formatDate(game.createdAt)}</p>
              <p className="game__history-scores">{summarize(game)}</p>
            </div>

            {confirming ? (
              <div className="game__history-actions">
                <p className="game__hint">Supprimer définitivement&nbsp;?</p>
                <div className="game__row">
                  <button
                    type="button"
                    className="game__button game__button--accent"
                    onClick={() => {
                      onDelete(game.id);
                      setPendingId(null);
                    }}
                  >
                    Supprimer
                  </button>
                  <button
                    type="button"
                    className="game__button"
                    onClick={() => setPendingId(null)}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div className="game__history-actions">
                <button
                  type="button"
                  className="game__button"
                  aria-label={`Reprendre la partie ${label}`}
                  onClick={() => onResume(game.id)}
                >
                  Reprendre
                </button>
                <button
                  type="button"
                  className="game__button"
                  aria-label={`Supprimer la partie ${label}`}
                  onClick={() => setPendingId(game.id)}
                >
                  Supprimer
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
