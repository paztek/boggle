import { AMBIGUOUS_FACES } from '../../domain/dice.ts';
import type { Board as BoardModel } from '../../domain/draw.ts';
import './board.css';

type BoardProps = {
  readonly board: BoardModel;
  /**
   * Grille masquée tant que le décompte n'est pas actif — avant le démarrage
   * comme pendant une pause : les lettres sont floutées à l'écran et ne sont pas
   * énoncées aux lecteurs d'écran, sans quoi la personne qui manipule l'appli
   * prendrait de l'avance.
   */
  readonly blurred?: boolean;
};

/** Affiche la grille tirée. Composant purement présentationnel. */
export function Board({ board, blurred = false }: BoardProps) {
  const label = `Grille de Boggle ${board.size} par ${board.size}`;
  const description = blurred
    ? `${label} : masquée tant que le décompte n'est pas en cours`
    : `${label} : ${board.tiles.map((tile) => tile.face).join(', ')}`;

  return (
    <div
      className={blurred ? 'board board--blurred' : 'board'}
      style={{ '--board-size': board.size } as React.CSSProperties}
      role="img"
      aria-label={description}
    >
      {board.tiles.map((tile, index) => (
        <div className="board__tile" key={`${index}-${tile.dieIndex}`} aria-hidden="true">
          <span
            className={
              AMBIGUOUS_FACES.has(tile.face)
                ? 'board__face board__face--ambiguous'
                : 'board__face'
            }
            style={{ '--tile-rotation': `${tile.rotation}deg` } as React.CSSProperties}
          >
            {tile.face}
          </span>
        </div>
      ))}
    </div>
  );
}
