import { useState } from 'react';
import { Board } from './components/board/Board.tsx';
import { GamePanel } from './components/game/GamePanel.tsx';
import { RulesPanel } from './components/rules/RulesPanel.tsx';
import type { BoardSize } from './domain/dice.ts';
import { useGame } from './hooks/useGame.ts';
import './app.css';

const SIZES: readonly BoardSize[] = [4, 5];

/** Un seul panneau ouvert à la fois : les deux se recouvrent sur mobile. */
type OpenPanel = 'rules' | 'game' | null;

export default function App() {
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const game = useGame();

  const inGame = game.currentGame !== null;

  const togglePanel = (panel: Exclude<OpenPanel, null>) => (open: boolean) => {
    setOpenPanel(open ? panel : null);
  };

  return (
    <div className="app">
      <RulesPanel
        size={game.size}
        open={openPanel === 'rules'}
        onOpenChange={togglePanel('rules')}
      />

      <GamePanel
        open={openPanel === 'game'}
        onOpenChange={togglePanel('game')}
        roster={game.roster}
        game={game.currentGame}
        pastGames={game.pastGames}
        onStart={game.startGame}
        onSetScore={game.setScore}
        onFinish={game.finishCurrent}
        onLeave={game.leaveCurrent}
        onResume={game.resumeGame}
        onForgetPlayer={game.forgetPlayer}
      />

      <header className="app__header">
        <h1 className="app__title">Boggle</h1>
        <p className="app__subtitle">Tirage de grilles &amp; feuille de scores</p>
      </header>

      <main className="app__main">
        <Board board={game.board} />

        <div className="app__actions">
          <div className="app__sizes" role="group" aria-label="Format de grille">
            {SIZES.map((candidate) => (
              <button
                key={candidate}
                type="button"
                className="app__size"
                aria-pressed={game.size === candidate}
                // En partie, le format est fixé à la création : le changer
                // rendrait les manches incomparables.
                disabled={inGame}
                title={inGame ? 'Le format est fixé par la partie en cours.' : undefined}
                onClick={() => game.drawFree(candidate)}
              >
                {candidate}×{candidate}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="app__draw"
            onClick={() => (inGame ? game.newRound() : game.drawFree(game.size))}
          >
            {inGame ? 'Manche suivante' : 'Nouvelle grille'}
          </button>
        </div>

        {inGame && (
          <p className="app__status" role="status">
            Manche {game.currentGame?.rounds.length} · {game.currentGame?.players.length} joueur
            {(game.currentGame?.players.length ?? 0) > 1 ? 's' : ''}
          </p>
        )}
      </main>
    </div>
  );
}
