import { useCallback, useEffect, useRef, useState } from 'react';
import {
  isAlerting,
  pauseTimer,
  remaining,
  resetTimer,
  resumeTimer,
  settleTimer,
  startTimer,
  STOPPED,
  type TimerState,
} from '../domain/timer.ts';
import {
  ALERT_BEEP,
  ALERT_BEEP_COUNT,
  ALERT_BEEP_INTERVAL_MS,
  cancelBeeps,
  END_BEEP,
  scheduleBeeps,
  unlockAudio,
  type Beep,
} from '../lib/audio.ts';
import { readTimerSession, writeTimerSession, type Preferences } from '../lib/storage.ts';

/** Cadence de rafraîchissement de l'affichage. Le restant vient de `Date.now()`. */
const TICK_MS = 250;

type UseTimerParams = {
  readonly gameId: string | null;
  readonly roundId: string | null;
  readonly durationSeconds: number;
  readonly prefs: Preferences;
};

function restore(gameId: string | null, roundId: string | null): TimerState {
  if (gameId === null || roundId === null) return STOPPED;

  const session = readTimerSession();
  if (!session || session.gameId !== gameId || session.roundId !== roundId) return STOPPED;
  return session.state;
}

/**
 * Chronomètre de la manche courante.
 *
 * L'affichage est rafraîchi par un intervalle, mais le temps restant est
 * toujours **recalculé depuis `Date.now()`** : un onglet bridé en arrière-plan
 * ou un rechargement en pleine manche retrouvent la bonne valeur.
 */
export function useTimer({ gameId, roundId, durationSeconds, prefs }: UseTimerParams) {
  const [state, setState] = useState<TimerState>(() => restore(gameId, roundId));
  const [now, setNow] = useState(() => Date.now());

  // Une nouvelle manche remet le chrono à zéro.
  const key = `${gameId ?? ''}/${roundId ?? ''}`;
  const previousKey = useRef(key);
  useEffect(() => {
    if (previousKey.current === key) return;
    previousKey.current = key;
    cancelBeeps();
    setState(restore(gameId, roundId));
    setNow(Date.now());
  }, [key, gameId, roundId]);

  // Tic d'affichage, actif seulement pendant le décompte.
  useEffect(() => {
    if (state.status !== 'en-cours') return;

    const tick = () => {
      const current = Date.now();
      setNow(current);
      setState((previous) => settleTimer(previous, current));
    };

    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [state.status]);

  // Persistance de la session. L'état ne change qu'aux transitions, jamais à
  // chaque tic : inutile de différer l'écriture ici.
  useEffect(() => {
    if (gameId === null || roundId === null) return;
    writeTimerSession(state.status === 'arrete' ? null : { gameId, roundId, state });
  }, [gameId, roundId, state]);

  useEffect(() => cancelBeeps, []);

  /**
   * Programme d'avance les bips dans le graphe audio, plutôt que de les
   * déclencher au tic : un onglet en arrière-plan les jouerait en retard.
   *
   * Au passage du seuil d'alerte, trois bips rapprochés préviennent que la fin
   * approche ; à l'échéance, un unique bip plus grave, plus long et plus fort
   * la constate sans être confondu avec les précédents.
   */
  const scheduleFor = useCallback(
    (timer: TimerState) => {
      cancelBeeps();
      if (!prefs.soundEnabled || timer.status !== 'en-cours') return;

      const left = timer.endsAt - Date.now();
      if (left <= 0) return;

      const beeps: Beep[] = [];

      const alertDelay = left - prefs.alertSeconds * 1000;
      if (prefs.alertSeconds > 0 && alertDelay > 0) {
        for (let index = 0; index < ALERT_BEEP_COUNT; index += 1) {
          beeps.push({ delayMs: alertDelay + index * ALERT_BEEP_INTERVAL_MS, ...ALERT_BEEP });
        }
      }

      beeps.push({ delayMs: left, ...END_BEEP });

      scheduleBeeps(beeps);
    },
    [prefs.soundEnabled, prefs.alertSeconds],
  );

  const start = useCallback(() => {
    // Ce clic est le geste utilisateur qui autorise l'audio sur iOS/Safari.
    unlockAudio();
    const next = startTimer(durationSeconds, Date.now());
    setState(next);
    setNow(Date.now());
    scheduleFor(next);
  }, [durationSeconds, scheduleFor]);

  const pause = useCallback(() => {
    cancelBeeps();
    setState(pauseTimer(state, Date.now()));
  }, [state]);

  // L'état suivant est calculé AVANT `setState`, jamais dans son updater : y
  // programmer les bips serait un effet de bord dans une fonction censée être
  // pure, que React réexécute — le bip de fin partirait deux fois.
  const resume = useCallback(() => {
    unlockAudio();
    const next = resumeTimer(state, Date.now());
    setState(next);
    setNow(Date.now());
    scheduleFor(next);
  }, [state, scheduleFor]);

  const reset = useCallback(() => {
    cancelBeeps();
    setState(resetTimer());
  }, []);

  return {
    status: state.status,
    remainingMs: remaining(state, durationSeconds, now),
    alerting: isAlerting(state, now, prefs.alertSeconds),
    running: state.status === 'en-cours',
    finished: state.status === 'termine',
    start,
    pause,
    resume,
    reset,
  };
}
