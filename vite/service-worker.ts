import { createHash } from 'node:crypto';
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';
import type { Plugin } from 'vite';

/**
 * Ce qui n'a rien à faire dans le cache : le service worker lui-même (le
 * navigateur en gère la mise à jour), et les fichiers de service de Pages.
 */
const EXCLUDED = new Set(['sw.js', '.nojekyll']);

/** Liste récursive des fichiers d'un répertoire, en chemins relatifs POSIX. */
function listFiles(root: string, current = root): readonly string[] {
  return readdirSync(current).flatMap((entry) => {
    const absolute = join(current, entry);
    return statSync(absolute).isDirectory()
      ? listFiles(root, absolute)
      : [relative(root, absolute).split(sep).join(posix.sep)];
  });
}

/**
 * Source du service worker.
 *
 * Exportée pour être testable : c'est la stratégie de cache qui compte, pas
 * son écriture sur disque.
 */
export function serviceWorkerSource(assets: readonly string[], version: string): string {
  const index = assets.find((asset) => asset === 'index.html');

  return `// Généré par vite/service-worker.ts — ne pas modifier à la main.
const CACHE = 'boggle-${version}';
const INDEX = ${JSON.stringify(index ? `./${index}` : './')};
const ASSETS = ${JSON.stringify(assets.map((asset) => `./${asset}`), null, 2)};

// \`ignoreVary\` est indispensable, pas une précaution : les serveurs statiques
// répondent volontiers \`Vary: Origin\` ou \`Vary: Accept-Encoding\`. Or la requête
// de préchargement, émise ici, n'a pas les mêmes en-têtes que celle du
// navigateur — un \`<script crossorigin>\`, comme en émet Vite, envoie un
// \`Origin\` que le préchargement n'avait pas. Sans cette option, la
// correspondance échoue et le hors ligne ne marche pas là où il sert.
const MATCH = { ignoreVary: true };

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      // La version suivante prend la main sans attendre la fermeture des onglets.
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // On ne touche ni aux écritures ni aux autres origines.
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  // Navigation : le réseau d'abord, pour qu'un joueur en ligne voie tout de
  // suite la version déployée ; le cache prend le relais hors ligne.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(INDEX, MATCH).then((cached) => cached ?? Response.error()),
      ),
    );
    return;
  }

  // Le reste porte une empreinte dans son nom : le cache fait autorité.
  event.respondWith(
    caches.match(request, MATCH).then((cached) => cached ?? fetch(request)),
  );
});
`;
}

/**
 * Émet `sw.js` à la fin du build, à partir du contenu réel de `dist/`.
 *
 * Lire le répertoire plutôt que le bundle Rollup est ce qui permet d'inclure
 * aussi les fichiers de `public/` — icônes et manifeste —, que Rollup ne
 * connaît pas.
 *
 * Pas de Workbox : pour un site statique de trois fichiers, la stratégie tient
 * en quarante lignes lisibles, et le projet garde une dépendance de moins.
 */
export function serviceWorker(): Plugin {
  let outDir = 'dist';

  return {
    name: 'boggle-service-worker',
    apply: 'build',

    configResolved(config) {
      outDir = config.build.outDir;
    },

    // `closeBundle` s'exécute après la copie de `public/` : c'est le seul
    // moment où `dist/` reflète vraiment ce qui sera déployé.
    closeBundle() {
      const assets = listFiles(outDir)
        .filter((asset) => !EXCLUDED.has(asset))
        .sort();

      // Les noms de fichiers portent déjà une empreinte de contenu : leur
      // liste suffit à identifier une version.
      const version = createHash('sha256').update(assets.join('\n')).digest('hex').slice(0, 12);

      writeFileSync(join(outDir, 'sw.js'), serviceWorkerSource(assets, version));
    },
  };
}
