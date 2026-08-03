/**
 * Bips du chronomètre, **synthétisés** par WebAudio.
 *
 * Pas de fichier audio : zéro octet ajouté au bundle et aucune requête réseau,
 * conformément à la contrainte n° 1 du projet.
 *
 * Deux contraintes de plateforme dictent la forme de ce module :
 *
 * 1. iOS et Safari refusent de produire du son tant que l'`AudioContext` n'a
 *    pas été créé ou repris **depuis un geste utilisateur**. D'où `unlockAudio`,
 *    appelé au clic sur « Démarrer » et nulle part ailleurs.
 * 2. Un onglet en arrière-plan voit ses timers JavaScript bridés à ~1 s. Les
 *    bips ne sont donc pas déclenchés par un tic : ils sont **programmés
 *    d'avance** dans le graphe audio, qui les joue à l'heure même si
 *    JavaScript est ralenti.
 */

export type Beep = {
  /** Délai avant le bip, en millisecondes, compté depuis la programmation. */
  readonly delayMs: number;
  readonly frequency: number;
  readonly durationMs: number;
};

let context: AudioContext | null = null;
let scheduled: OscillatorNode[] = [];

/** Enveloppe courte : sans elle, l'attaque et la coupure produisent un clic. */
const ATTACK_SECONDS = 0.01;
const RELEASE_SECONDS = 0.04;
const PEAK_GAIN = 0.18;

function audioContextClass(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  const withPrefix = window as unknown as { webkitAudioContext?: typeof AudioContext };
  return window.AudioContext ?? withPrefix.webkitAudioContext ?? null;
}

/**
 * Prépare la sortie audio. À n'appeler que depuis un gestionnaire d'événement
 * utilisateur, sans quoi Safari laisse le contexte suspendu.
 */
export function unlockAudio(): void {
  const Ctor = audioContextClass();
  if (Ctor === null) return;

  try {
    context ??= new Ctor();
    if (context.state === 'suspended') void context.resume();
  } catch {
    // Audio indisponible : le chrono reste utilisable, l'alerte visuelle suffit.
    context = null;
  }
}

export function cancelBeeps(): void {
  for (const oscillator of scheduled) {
    try {
      oscillator.stop();
      oscillator.disconnect();
    } catch {
      // Déjà arrêté : rien à faire.
    }
  }
  scheduled = [];
}

/** Remplace les bips en attente par ceux fournis. */
export function scheduleBeeps(beeps: readonly Beep[]): void {
  cancelBeeps();
  if (context === null || context.state === 'closed') return;

  const origin = context.currentTime;

  for (const beep of beeps) {
    const startAt = origin + beep.delayMs / 1000;
    const stopAt = startAt + beep.durationMs / 1000;

    try {
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = beep.frequency;

      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(PEAK_GAIN, startAt + ATTACK_SECONDS);
      gain.gain.setValueAtTime(PEAK_GAIN, Math.max(startAt, stopAt - RELEASE_SECONDS));
      gain.gain.linearRampToValueAtTime(0, stopAt);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startAt);
      oscillator.stop(stopAt);

      scheduled = [...scheduled, oscillator];
    } catch {
      // Un bip perdu ne doit pas interrompre la manche.
    }
  }
}

/** Bip d'avertissement : bref et aigu. */
export const ALERT_BEEP = { frequency: 880, durationMs: 140 } as const;
/** Bip de fin : plus grave et plus long, pour ne pas être confondu. */
export const END_BEEP = { frequency: 440, durationMs: 600 } as const;
