import { formatRemaining, type TimerState } from '../../domain/timer.ts';
import './timer.css';

type TimerProps = {
  readonly status: TimerState['status'];
  readonly remainingMs: number;
  readonly alerting: boolean;
  readonly onPause: () => void;
  readonly onResume: () => void;
  readonly onReset: () => void;
};

/**
 * Chronomètre de manche, sous la grille : on ne va pas ouvrir un tiroir pour
 * savoir combien de temps il reste.
 *
 * L'alerte est **redondante** — couleur, libellé et pulsation. `global.css`
 * neutralise les animations sous `prefers-reduced-motion` ; un signal qui ne
 * tiendrait qu'au mouvement disparaîtrait alors pour ces utilisateurs.
 *
 * Le décompte lui-même n'est pas annoncé : une zone vive qui change quatre fois
 * par seconde noierait un lecteur d'écran. Seuls les changements d'état le sont.
 */
export function Timer({
  status,
  remainingMs,
  alerting,
  onPause,
  onResume,
  onReset,
}: TimerProps) {
  const finished = status === 'termine';

  const announcement = finished
    ? 'Temps écoulé.'
    : alerting
      ? `Bientôt fini : ${formatRemaining(remainingMs)}.`
      : '';

  return (
    <div className="timer" data-alerting={alerting} data-finished={finished}>
      <p className="timer__value" aria-hidden="true">
        {formatRemaining(remainingMs)}
      </p>

      <p className="visually-hidden" role="status">
        {announcement}
      </p>

      {(alerting || finished) && (
        <p className="timer__note" aria-hidden="true">
          {finished ? 'Temps écoulé' : 'Bientôt fini'}
        </p>
      )}

      <div className="timer__actions">
        {/* « Démarrer » ne vit pas ici mais sur la grille masquée (cf. App) :
            révéler et lancer le chrono sont un même geste. À l'arrêt, le chrono
            n'affiche donc que sa valeur. */}
        {status === 'en-cours' && (
          <button type="button" className="timer__button" onClick={onPause}>
            Pause
          </button>
        )}

        {status === 'suspendu' && (
          <button type="button" className="timer__button timer__button--go" onClick={onResume}>
            Reprendre
          </button>
        )}

        {status !== 'arrete' && (
          <button type="button" className="timer__button" onClick={onReset}>
            Réinitialiser
          </button>
        )}
      </div>
    </div>
  );
}
