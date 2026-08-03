import { describe, expect, it } from 'vitest';
import {
  ALERT_DISABLED,
  formatRemaining,
  isAlerting,
  isFinished,
  pauseTimer,
  remaining,
  resetTimer,
  resumeTimer,
  settleTimer,
  startTimer,
  STOPPED,
  type TimerState,
} from './timer.ts';

/** Instant de référence arbitraire — le domaine reçoit toujours `now`. */
const T0 = 1_800_000_000_000;
const THREE_MINUTES = 180;

describe('startTimer', () => {
  it('fixe une échéance absolue plutôt qu’un compte à rebours', () => {
    const timer = startTimer(THREE_MINUTES, T0);

    expect(timer).toEqual({ status: 'en-cours', endsAt: T0 + 180_000 });
  });

  it('refuse une durée nulle, négative ou non entière', () => {
    expect(() => startTimer(0, T0)).toThrow(RangeError);
    expect(() => startTimer(-5, T0)).toThrow(RangeError);
    expect(() => startTimer(1.5, T0)).toThrow(RangeError);
  });
});

describe('remaining', () => {
  it('affiche la durée entière tant que le chrono n’est pas lancé', () => {
    expect(remaining(STOPPED, THREE_MINUTES, T0)).toBe(180_000);
  });

  it('décroît avec le temps qui passe', () => {
    const timer = startTimer(THREE_MINUTES, T0);

    expect(remaining(timer, THREE_MINUTES, T0)).toBe(180_000);
    expect(remaining(timer, THREE_MINUTES, T0 + 60_000)).toBe(120_000);
  });

  it('ne descend jamais sous zéro, même longtemps après l’échéance', () => {
    const timer = startTimer(THREE_MINUTES, T0);

    expect(remaining(timer, THREE_MINUTES, T0 + 10_000_000)).toBe(0);
  });

  it('conserve le restant d’un chrono suspendu, quel que soit `now`', () => {
    const timer = pauseTimer(startTimer(THREE_MINUTES, T0), T0 + 50_000);

    expect(remaining(timer, THREE_MINUTES, T0 + 50_000)).toBe(130_000);
    expect(remaining(timer, THREE_MINUTES, T0 + 999_999)).toBe(130_000);
  });

  it('vaut zéro une fois terminé', () => {
    expect(remaining({ status: 'termine' }, THREE_MINUTES, T0)).toBe(0);
  });
});

describe('pauseTimer / resumeTimer', () => {
  it('suspend en mémorisant le temps restant', () => {
    const timer = pauseTimer(startTimer(THREE_MINUTES, T0), T0 + 30_000);

    expect(timer).toEqual({ status: 'suspendu', remainingMs: 150_000 });
  });

  it('reprend en recalculant une échéance à partir de l’instant présent', () => {
    const paused = pauseTimer(startTimer(THREE_MINUTES, T0), T0 + 30_000);
    // Cinq minutes de discussion avant la reprise : sans effet sur le restant.
    const resumed = resumeTimer(paused, T0 + 330_000);

    expect(resumed).toEqual({ status: 'en-cours', endsAt: T0 + 330_000 + 150_000 });
  });

  it('laisse inchangé un chrono qui n’est pas dans l’état attendu', () => {
    expect(pauseTimer(STOPPED, T0)).toBe(STOPPED);
    expect(resumeTimer(STOPPED, T0)).toBe(STOPPED);
    expect(pauseTimer({ status: 'termine' }, T0)).toEqual({ status: 'termine' });
  });

  it('un aller-retour pause/reprise ne perd pas de temps', () => {
    let timer: TimerState = startTimer(THREE_MINUTES, T0);
    timer = pauseTimer(timer, T0 + 40_000);
    timer = resumeTimer(timer, T0 + 100_000);

    expect(remaining(timer, THREE_MINUTES, T0 + 100_000)).toBe(140_000);
  });
});

describe('settleTimer', () => {
  it('bascule en « terminé » une fois l’échéance franchie', () => {
    const timer = startTimer(THREE_MINUTES, T0);

    expect(settleTimer(timer, T0 + 179_999)).toBe(timer);
    expect(settleTimer(timer, T0 + 180_000)).toEqual({ status: 'termine' });
  });

  it('renvoie le même objet quand rien ne change — pas de rendu inutile', () => {
    expect(settleTimer(STOPPED, T0)).toBe(STOPPED);
  });
});

describe('isFinished', () => {
  it('reconnaît une échéance dépassée même sans passage par settleTimer', () => {
    const timer = startTimer(THREE_MINUTES, T0);

    expect(isFinished(timer, T0 + 100_000)).toBe(false);
    expect(isFinished(timer, T0 + 180_000)).toBe(true);
    expect(isFinished({ status: 'termine' }, T0)).toBe(true);
  });
});

describe('isAlerting', () => {
  it('s’allume dans les X dernières secondes', () => {
    const timer = startTimer(THREE_MINUTES, T0);

    expect(isAlerting(timer, T0 + 149_000, 30)).toBe(false);
    expect(isAlerting(timer, T0 + 150_000, 30)).toBe(true);
    expect(isAlerting(timer, T0 + 179_000, 30)).toBe(true);
  });

  it('s’éteint une fois le temps écoulé — l’alerte annonce, elle ne constate pas', () => {
    const timer = startTimer(THREE_MINUTES, T0);

    expect(isAlerting(timer, T0 + 180_000, 30)).toBe(false);
  });

  it('reste éteinte quand le seuil est désactivé', () => {
    const timer = startTimer(THREE_MINUTES, T0);

    expect(isAlerting(timer, T0 + 179_000, ALERT_DISABLED)).toBe(false);
  });

  it('reste éteinte sur un chrono arrêté ou suspendu', () => {
    const paused = pauseTimer(startTimer(THREE_MINUTES, T0), T0 + 170_000);

    expect(isAlerting(STOPPED, T0, 30)).toBe(false);
    expect(isAlerting(paused, T0 + 170_000, 30)).toBe(false);
  });
});

describe('resetTimer', () => {
  it('ramène le chrono à l’arrêt', () => {
    expect(resetTimer()).toEqual(STOPPED);
  });
});

describe('formatRemaining', () => {
  it.each([
    [180_000, '3:00'],
    [125_000, '2:05'],
    [60_000, '1:00'],
    [9_000, '0:09'],
    [0, '0:00'],
  ])('formate %i ms en %s', (ms, expected) => {
    expect(formatRemaining(ms)).toBe(expected);
  });

  it('arrondit au-dessus : « 0:01 » tant qu’il reste une fraction de seconde', () => {
    expect(formatRemaining(1)).toBe('0:01');
    expect(formatRemaining(999)).toBe('0:01');
  });

  it('gère une durée supérieure à dix minutes', () => {
    expect(formatRemaining(600_000)).toBe('10:00');
  });
});
