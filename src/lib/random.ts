/**
 * Abstraction du générateur aléatoire.
 *
 * Le domaine ne doit JAMAIS appeler `Math.random()` directement : le hasard est
 * toujours injecté sous cette forme. C'est ce qui rend le tirage reproductible,
 * donc testable.
 */
export type RandomFn = () => number;

/** Générateur de production, adossé à `crypto.getRandomValues`. */
export const cryptoRandom: RandomFn = () => {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  // 2^32 : garantit un résultat dans [0, 1) — 0xFFFFFFFF / 2^32 < 1.
  return buffer[0]! / 4_294_967_296;
};

/**
 * Générateur déterministe (mulberry32), réservé aux tests et à la
 * reproduction d'un tirage donné.
 */
export function createSeededRandom(seed: number): RandomFn {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Entier uniforme dans [0, bound). `bound` doit être strictement positif. */
export function randomInt(random: RandomFn, bound: number): number {
  if (!Number.isInteger(bound) || bound <= 0) {
    throw new RangeError(`Borne invalide pour randomInt : ${bound}`);
  }
  return Math.floor(random() * bound);
}

/**
 * Mélange de Fisher-Yates. Retourne un nouveau tableau — l'entrée n'est jamais
 * mutée (cf. règle d'immutabilité du projet).
 */
export function shuffle<T>(items: readonly T[], random: RandomFn): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randomInt(random, i + 1);
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/** Élément uniforme d'un tableau non vide. */
export function pick<T>(items: readonly T[], random: RandomFn): T {
  if (items.length === 0) {
    throw new RangeError('Impossible de tirer un élément dans un tableau vide.');
  }
  return items[randomInt(random, items.length)]!;
}
