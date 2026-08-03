import { useEffect } from 'react';

/**
 * Maintient l'écran allumé tant que `active` est vrai.
 *
 * Le jeu se joue autour d'une table : pendant une manche, personne ne touche
 * l'écran, qui s'éteint au beau milieu du décompte (cf. docs/ARCHITECTURE.md § 1).
 *
 * L'API n'existe pas partout et le verrou peut être refusé (batterie faible,
 * onglet caché) : l'échec est silencieux et sans conséquence.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let released = false;

    const acquire = async () => {
      try {
        const next = await navigator.wakeLock.request('screen');
        // Le composant a pu se démonter pendant l'attente.
        if (released) {
          void next.release();
          return;
        }
        sentinel = next;
      } catch {
        // Verrou refusé : l'écran s'éteindra normalement, rien de plus.
      }
    };

    void acquire();

    // Le système relâche le verrou dès que l'onglet passe en arrière-plan :
    // il faut le redemander au retour, sinon il ne tient que la première fois.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !released) void acquire();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      released = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      void sentinel?.release().catch(() => undefined);
    };
  }, [active]);
}
