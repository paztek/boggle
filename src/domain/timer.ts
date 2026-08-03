/**
 * Chronomètre de manche.
 *
 * L'application est utilisée autour d'une table, écran souvent en veille et
 * onglet régulièrement en arrière-plan (cf. docs/ARCHITECTURE.md § 1). Un
 * compteur qui décrémente en mémoire dériverait ou repartirait de zéro : le
 * chrono mémorise donc une **échéance absolue** et le temps restant se dérive
 * de l'instant présent, comme les totaux se dérivent des manches.
 *
 * `now` est toujours injecté, jamais lu ici : le module se teste sans faux
 * timers, exactement comme le tirage se teste sans `Math.random`.
 */

export type TimerState =
  | { readonly status: 'arrete' }
  | { readonly status: 'en-cours'; readonly endsAt: number }
  | { readonly status: 'suspendu'; readonly remainingMs: number }
  | { readonly status: 'termine' };

export const STOPPED: TimerState = { status: 'arrete' };

/** Durée d'une manche, en secondes. */
export const MIN_DURATION_SECONDS = 30;
export const MAX_DURATION_SECONDS = 600;
export const DEFAULT_DURATION_SECONDS = 180;

/** Seuil d'alerte avant la fin, en secondes. */
export const ALERT_DISABLED = 0;
export const MAX_ALERT_SECONDS = 120;
export const DEFAULT_ALERT_SECONDS = 30;

export function startTimer(durationSeconds: number, now: number): TimerState {
  if (!Number.isInteger(durationSeconds) || durationSeconds <= 0) {
    throw new RangeError(`Durée de manche invalide : ${durationSeconds}`);
  }
  return { status: 'en-cours', endsAt: now + durationSeconds * 1000 };
}

export function resetTimer(): TimerState {
  return STOPPED;
}

export function pauseTimer(timer: TimerState, now: number): TimerState {
  if (timer.status !== 'en-cours') return timer;
  return { status: 'suspendu', remainingMs: Math.max(0, timer.endsAt - now) };
}

export function resumeTimer(timer: TimerState, now: number): TimerState {
  if (timer.status !== 'suspendu') return timer;
  return { status: 'en-cours', endsAt: now + timer.remainingMs };
}

/**
 * Temps restant en millisecondes. `durationSeconds` sert au seul cas du chrono
 * à l'arrêt, où l'affichage montre la manche entière avant son lancement.
 */
export function remaining(timer: TimerState, durationSeconds: number, now: number): number {
  switch (timer.status) {
    case 'arrete':
      return durationSeconds * 1000;
    case 'en-cours':
      return Math.max(0, timer.endsAt - now);
    case 'suspendu':
      return timer.remainingMs;
    case 'termine':
      return 0;
  }
}

export function isFinished(timer: TimerState, now: number): boolean {
  return timer.status === 'termine' || (timer.status === 'en-cours' && now >= timer.endsAt);
}

/**
 * Bascule un chrono dont l'échéance est franchie. Renvoie l'objet reçu quand
 * rien ne change, pour ne pas provoquer de rendu à chaque tic.
 */
export function settleTimer(timer: TimerState, now: number): TimerState {
  return timer.status === 'en-cours' && now >= timer.endsAt ? { status: 'termine' } : timer;
}

/**
 * L'alerte **annonce** la fin, elle ne la constate pas : elle s'éteint une fois
 * le temps écoulé, moment où c'est le chrono lui-même qui parle.
 */
export function isAlerting(timer: TimerState, now: number, alertSeconds: number): boolean {
  if (timer.status !== 'en-cours' || alertSeconds <= ALERT_DISABLED) return false;

  const left = timer.endsAt - now;
  return left > 0 && left <= alertSeconds * 1000;
}

/**
 * Formate en `M:SS`, arrondi **au-dessus** : tant qu'il reste une fraction de
 * seconde, l'affichage montre « 0:01 ». Voir un « 0:00 » alors qu'il reste du
 * temps serait trompeur autour d'une table.
 */
export function formatRemaining(ms: number): string {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
