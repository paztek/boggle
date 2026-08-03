/**
 * Identifiants locaux. Ils ne servent qu'à relier joueurs, manches et parties
 * entre eux dans `localStorage` — aucune unicité globale n'est requise.
 */

/** Repli lisible si `crypto.randomUUID` manque (contexte non sécurisé, vieux navigateur). */
function fallbackId(): string {
  const buffer = new Uint32Array(2);
  crypto.getRandomValues(buffer);
  return `${buffer[0]!.toString(36)}${buffer[1]!.toString(36)}`;
}

export function createId(prefix: string): string {
  const suffix = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : fallbackId();
  return `${prefix}-${suffix}`;
}
