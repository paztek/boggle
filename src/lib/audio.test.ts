import { describe, expect, it } from 'vitest';
import { ALERT_BEEP, cancelBeeps, END_BEEP, scheduleBeeps, unlockAudio } from './audio.ts';

// jsdom ne fournit pas WebAudio. C'est exactement la situation d'un navigateur
// qui refuse l'audio : le chronomètre doit rester utilisable, l'alerte visuelle
// prenant le relais.
describe('audio sans support WebAudio', () => {
  it('ne lève pas au déverrouillage', () => {
    expect(() => unlockAudio()).not.toThrow();
  });

  it('ne lève pas à la programmation de bips', () => {
    expect(() =>
      scheduleBeeps([
        { delayMs: 1000, ...ALERT_BEEP },
        { delayMs: 3000, ...END_BEEP },
      ]),
    ).not.toThrow();
  });

  it('ne lève pas à l’annulation, même sans rien de programmé', () => {
    expect(() => cancelBeeps()).not.toThrow();
  });
});
