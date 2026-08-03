import { useCallback, useState } from 'react';
import { Board } from './components/board/Board.tsx';
import { DICE_ARE_PROVISIONAL, diceFor, type BoardSize } from './domain/dice.ts';
import { drawBoard, type Board as BoardModel } from './domain/draw.ts';
import { cryptoRandom } from './lib/random.ts';
import './app.css';

const SIZES: readonly BoardSize[] = [4, 5];

export default function App() {
  const [size, setSize] = useState<BoardSize>(4);
  const [board, setBoard] = useState<BoardModel>(() => drawBoard(diceFor(4), 4, cryptoRandom));

  const draw = useCallback((next: BoardSize) => {
    setSize(next);
    setBoard(drawBoard(diceFor(next), next, cryptoRandom));
  }, []);

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Boggle</h1>
        <p className="app__subtitle">Tirage de grilles &amp; feuille de scores</p>
      </header>

      {DICE_ARE_PROVISIONAL && (
        <p className="app__warning" role="status">
          <strong>Jeu de dés provisoire.</strong> Les faces utilisées sont celles du Boggle
          anglais, en attendant l&apos;intégration des dés français.
        </p>
      )}

      <main className="app__main">
        <Board board={board} />

        <div className="app__actions">
          <div className="app__sizes" role="group" aria-label="Format de grille">
            {SIZES.map((candidate) => (
              <button
                key={candidate}
                type="button"
                className="app__size"
                aria-pressed={size === candidate}
                onClick={() => draw(candidate)}
              >
                {candidate}×{candidate}
              </button>
            ))}
          </div>

          <button type="button" className="app__draw" onClick={() => draw(size)}>
            Nouvelle grille
          </button>
        </div>
      </main>
    </div>
  );
}
