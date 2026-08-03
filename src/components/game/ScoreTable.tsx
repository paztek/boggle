import { standings, totals, type Game, type PlayerId } from '../../domain/game.ts';

type ScoreTableProps = {
  readonly game: Game;
  readonly onSetScore: (roundId: string, playerId: PlayerId, points: number | null) => void;
};

/**
 * Feuille de scores : une ligne par manche, une colonne par joueur, plus la
 * colonne du numéro de manche.
 *
 * Les totaux sont DÉRIVÉS des manches à chaque rendu, jamais stockés
 * (cf. CLAUDE.md). Les scores sont saisis à la main : l'application ne les
 * calcule pas.
 */
export function ScoreTable({ game, onSetScore }: ScoreTableProps) {
  const cumulative = totals(game);
  const best = standings(game)[0]?.total ?? 0;

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
          </tr>
        </thead>
        <tbody>
          {game.rounds.map((round, index) => (
            <tr key={round.id}>
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
                    onChange={(event) => handleChange(round.id, player.id, event.target.value)}
                  />
                </td>
              ))}
            </tr>
          ))}
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
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
