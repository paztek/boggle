import { AMBIGUOUS_FACES } from '../../domain/dice.ts';
import type { Board as BoardModel } from '../../domain/draw.ts';
import './board.css';

type BoardProps = {
  readonly board: BoardModel;
};

/** Affiche la grille tirée. Composant purement présentationnel. */
export function Board({ board }: BoardProps) {
  const label = `Grille de Boggle ${board.size} par ${board.size}`;

  return (
    <div
      className="board"
      style={{ '--board-size': board.size } as React.CSSProperties}
      role="img"
      aria-label={`${label} : ${board.tiles.map((tile) => tile.face).join(', ')}`}
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
