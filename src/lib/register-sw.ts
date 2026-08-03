/**
 * Enregistrement du service worker.
 *
 * Il rend l'application disponible hors ligne après le premier chargement, ce
 * qui compte pour un usage en séance : le réseau d'une salle est rarement fiable
 * et l'application n'a de toute façon besoin de personne pour fonctionner.
 *
 * En développement, on s'abstient : un service worker qui met en cache masque
 * le rechargement à chaud et donne des résultats déroutants.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  // Après `load` : l'enregistrement ne doit pas concurrencer le premier rendu.
  window.addEventListener('load', () => {
    // `BASE_URL` porte le chemin de déploiement (`/boggle/`), qui délimite
    // aussi la portée du service worker.
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // Refusé (mode privé, contexte non sécurisé) : l'application marche
      // toujours, simplement sans mode hors ligne.
    });
  });
}
