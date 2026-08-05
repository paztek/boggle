import { Fragment, useState } from 'react';
import { standings, totals, type Game, type PlayerId } from '../../domain/game.ts';

type ScoreTableProps = {
  readonly game: Game;
  readonly onSetScore: (roundId: string, playerId: PlayerId, points: number | null) => void;
  readonly onRemoveRound: (roundId: string) => void;
};

/**
 * Feuille de scores : une ligne par manche, une colonne par joueur, plus la
 * colonne du numéro de manche.
 *
 * Les totaux sont DÉRIVÉS des manches à chaque rendu, jamais stockés
 * (cf. CLAUDE.md). Les scores sont saisis à la main : l'application ne les
 * calcule pas.
 *
 * Une manche se supprime par le « × » de sa ligne, avec confirmation sur place :
 * elle emporte les scores saisis, et rien n'ayant quitté l'appareil il n'y a
 * aucune copie à restaurer — même raisonnement que pour une partie passée.
 */
export function ScoreTable({ game, onSetScore, onRemoveRound }: ScoreTableProps) {
  const [pendingRoundId, setPendingRoundId] = useState<string | null>(null);

  const cumulative = totals(game);
  const best = standings(game)[0]?.total ?? 0;

  // La dernière manche restante n'est pas supprimable : une partie en garde
  // toujours une (cf. `removeRound`). Inutile alors d'afficher la colonne.
  const removable = game.rounds.length > 1;
  const columnCount = game.players.length + (removable ? 2 : 1);

  const handleChange = (roundId: string, playerId: PlayerId, raw: string) => {
    if (raw.trim() === '') {
      onSetScore(roundId, playerId, null);
      return;
    }
    const points = Number(raw);
    // Une saisie non entière ou négative est simplement ignorée : le champ
    // conserve la valeur précédente plutôt que d'enregistrer n'importe quoi.
    if (Number.isInteger(points) && points >= 0) {
      onSetScore(roundId, playerId, points);
    }
  };

  return (
    <div className="game__table-scroll">
      <table className="game__table">
        <caption className="game__table-caption">
          Scores saisis manche par manche — l&apos;application ne compte pas les points.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="game__col-round">
              Manche
            </th>
            {game.players.map((player) => (
              <th scope="col" key={player.id}>
                {player.name}
              </th>
            ))}
            {removable && (
              <th scope="col">
                <span className="visually-hidden">Supprimer</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {game.rounds.map((round, index) => {
            const confirming = pendingRoundId === round.id;

            return (
              <Fragment key={round.id}>
                <tr data-confirming={confirming}>
                  <th scope="row" className="game__col-round">
                    {index + 1}
                  </th>
                  {game.players.map((player) => (
                    <td key={player.id}>
                      <input
                        type="number"
                        className="game__score"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        value={round.scores[player.id] ?? ''}
                        placeholder="—"
                        aria-label={`Score de ${player.name}, manche ${index + 1}`}
                        onChange={(event) =>
                          handleChange(round.id, player.id, event.target.value)
                        }
                      />
                    </td>
                  ))}
                  {removable && (
                    <td>
                      {/* Le même bouton referme la confirmation : un « × »
                          cliqué par mégarde s'annule d'un second clic. */}
                      <button
                        type="button"
                        className="game__round-remove"
                        aria-label={`Supprimer la manche ${index + 1}`}
                        aria-expanded={confirming}
                        onClick={() => setPendingRoundId(confirming ? null : round.id)}
                      >
                        &times;
                      </button>
                    </td>
                  )}
                </tr>

                {confirming && (
                  <tr data-confirming="true">
                    {/* La confirmation prend toute la largeur : dans un tableau
                        déjà défilant, l'étaler en colonne le rendrait illisible. */}
                    <td colSpan={columnCount}>
                      {/* La mise en page vit dans un `div` : passer la cellule
                          elle-même en `display: flex` la sortirait du tableau,
                          et `colSpan` cesserait de s'appliquer. */}
                      <div className="game__confirm">
                        <p className="game__hint">
                          Supprimer la manche {index + 1} et ses scores&nbsp;?
                        </p>
                        <div className="game__row">
                          <button
                            type="button"
                            className="game__button game__button--accent"
                            onClick={() => {
                              onRemoveRound(round.id);
                              setPendingRoundId(null);
                            }}
                          >
                            Supprimer
                          </button>
                          <button
                            type="button"
                            className="game__button"
                            onClick={() => setPendingRoundId(null)}
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className="game__col-round">
              Total
            </th>
            {game.players.map((player) => (
              <td
                key={player.id}
                className="game__total"
                // Le meneur est mis en avant ; à égalité, tous le sont.
                data-leader={best > 0 && cumulative[player.id] === best}
              >
                {cumulative[player.id] ?? 0}
              </td>
            ))}
            {removable && <td />}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
