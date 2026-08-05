import { useState } from 'react';
import type { BoardSize } from '../../domain/dice.ts';
import {
  endProgress,
  type EndCondition,
  type Game,
  type NewGameInput,
  type Player,
  type PlayerId,
} from '../../domain/game.ts';
import type { KnownPlayer } from '../../domain/roster.ts';
import type { Preferences } from '../../lib/storage.ts';
import { DurationField } from '../timer/DurationField.tsx';
import { TimerSettings } from '../timer/TimerSettings.tsx';
import { SidePanel } from '../ui/SidePanel.tsx';
import { EndConditionField } from './EndConditionField.tsx';
import { GameHistory } from './GameHistory.tsx';
import { PlayerPicker } from './PlayerPicker.tsx';
import { ScoreTable } from './ScoreTable.tsx';
import './game.css';

const SIZES: readonly BoardSize[] = [4, 5];

type GamePanelProps = {
  readonly open?: boolean | undefined;
  readonly onOpenChange?: ((open: boolean) => void) | undefined;
  readonly roster: readonly KnownPlayer[];
  readonly prefs: Preferences;
  readonly game: Game | null;
  readonly pastGames: readonly Game[];
  readonly onStart: (input: NewGameInput) => void;
  readonly onSetScore: (roundId: string, playerId: PlayerId, points: number | null) => void;
  readonly onRemoveRound: (roundId: string) => void;
  readonly onSetDuration: (seconds: number) => void;
  readonly onSetPrefs: (prefs: Preferences) => void;
  readonly onFinish: () => void;
  readonly onLeave: () => void;
  readonly onResume: (gameId: string) => void;
  readonly onDeleteGame: (gameId: string) => void;
  readonly onForgetPlayer: (playerId: string) => void;
};

/** Libellé de l'avancement vers la condition d'arrêt. */
function progressLabel(game: Game): string | null {
  const { current, goal } = endProgress(game);
  if (current === null || goal === null) return null;

  return game.endCondition.kind === 'manches'
    ? `Manche ${current} / ${goal}`
    : `${current} / ${goal} points`;
}

/**
 * Panneau dépliable sur le côté droit, miroir de celui des règles : joueurs,
 * démarrage d'une partie, condition d'arrêt, feuille de scores et historique.
 */
export function GamePanel({
  open,
  onOpenChange,
  roster,
  prefs,
  game,
  pastGames,
  onStart,
  onSetScore,
  onRemoveRound,
  onSetDuration,
  onSetPrefs,
  onFinish,
  onLeave,
  onResume,
  onDeleteGame,
  onForgetPlayer,
}: GamePanelProps) {
  const [players, setPlayers] = useState<readonly Player[]>([]);
  const [size, setSize] = useState<BoardSize>(4);
  const [endCondition, setEndCondition] = useState<EndCondition>({ kind: 'libre' });
  const [setupOpen, setSetupOpen] = useState(false);
  // Proposée depuis la dernière partie créée sur cet appareil.
  const [duration, setDuration] = useState(prefs.lastDurationSeconds);

  const showSetup = game === null || setupOpen;
  const progress = game ? endProgress(game) : null;

  const start = () => {
    if (players.length === 0) return;
    onStart({ size, players, endCondition, roundDurationSeconds: duration });
    setPlayers([]);
    setSetupOpen(false);
  };

  return (
    <SidePanel
      side="right"
      title="Partie & scores"
      label="Partie et scores"
      open={open}
      onOpenChange={onOpenChange}
    >
      {game && (
        <section className="game__section" aria-labelledby="game-current">
          <h3 className="game__subheading" id="game-current">
            Partie en cours
          </h3>

          {progressLabel(game) && <p className="game__progress">{progressLabel(game)}</p>}

          {progress?.reached && (
            <div className="game__banner" role="status">
              <p>Objectif atteint. Terminer la partie ?</p>
              <button type="button" className="game__button game__button--accent" onClick={onFinish}>
                Terminer la partie
              </button>
            </div>
          )}

          <ScoreTable game={game} onSetScore={onSetScore} onRemoveRound={onRemoveRound} />

          <DurationField value={game.roundDurationSeconds} onChange={onSetDuration} />

          <div className="game__row">
            {!progress?.reached && (
              <button type="button" className="game__button" onClick={onFinish}>
                Terminer la partie
              </button>
            )}
            <button type="button" className="game__button" onClick={onLeave}>
              Mettre de côté
            </button>
            {!setupOpen && (
              <button type="button" className="game__button" onClick={() => setSetupOpen(true)}>
                Nouvelle partie
              </button>
            )}
          </div>
        </section>
      )}

      {showSetup && (
        <section className="game__section" aria-labelledby="game-setup">
          <h3 className="game__subheading" id="game-setup">
            Nouvelle partie
          </h3>

          <form
            className="game__form"
            onSubmit={(event) => {
              event.preventDefault();
              start();
            }}
          >
            <PlayerPicker
              selected={players}
              roster={roster}
              onChange={setPlayers}
              onForget={onForgetPlayer}
            />

            <div className="game__field">
              <span className="game__label" id="game-size">
                Format
              </span>
              <div className="game__row" role="group" aria-labelledby="game-size">
                {SIZES.map((candidate) => (
                  <button
                    key={candidate}
                    type="button"
                    className="game__button"
                    aria-pressed={size === candidate}
                    onClick={() => setSize(candidate)}
                  >
                    {candidate}×{candidate}
                  </button>
                ))}
              </div>
            </div>

            <EndConditionField value={endCondition} onChange={setEndCondition} />

            <DurationField value={duration} onChange={setDuration} />

            <button
              type="submit"
              className="game__button game__button--accent"
              disabled={players.length === 0}
            >
              Démarrer la partie
            </button>
            {players.length === 0 && (
              <p className="game__hint">Ajoutez au moins un joueur pour démarrer.</p>
            )}
          </form>
        </section>
      )}

      <section className="game__section" aria-labelledby="game-timer">
        <h3 className="game__subheading" id="game-timer">
          Chronomètre
        </h3>
        <TimerSettings prefs={prefs} onChange={onSetPrefs} />
      </section>

      <section className="game__section" aria-labelledby="game-history">
        <h3 className="game__subheading" id="game-history">
          Parties passées
        </h3>
        <GameHistory games={pastGames} onResume={onResume} onDelete={onDeleteGame} />
      </section>
    </SidePanel>
  );
}
