import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { serviceWorkerSource } from '../vite/service-worker.ts';

const publicDir = join(import.meta.dirname, '..', 'public');

/**
 * Le manifeste est un fichier statique, jamais typé par le compilateur : une
 * faute de frappe dans un chemin d'icône ne se verrait qu'à l'installation sur
 * un téléphone.
 */
describe('manifeste', () => {
  const manifest = JSON.parse(
    readFileSync(join(publicDir, 'manifest.webmanifest'), 'utf8'),
  ) as Record<string, unknown>;

  it('porte les champs exigés pour une installation', () => {
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBe('standalone');
    expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  // Le site est servi depuis /boggle/ mais `BASE_PATH` peut changer : des
  // chemins absolus casseraient l'installation sur un autre déploiement.
  it('n’utilise que des chemins relatifs, pour rester indépendant du déploiement', () => {
    const icons = manifest.icons as readonly { readonly src: string }[];

    expect(manifest.start_url).toBe('./');
    expect(manifest.scope).toBe('./');
    for (const icon of icons) {
      expect(icon.src.startsWith('./')).toBe(true);
    }
  });

  it('référence des icônes qui existent réellement', () => {
    const icons = manifest.icons as readonly { readonly src: string }[];

    expect(icons.length).toBeGreaterThan(0);
    for (const icon of icons) {
      expect(existsSync(join(publicDir, icon.src))).toBe(true);
    }
  });

  // Sans icône `maskable`, Android plaque l'icône carrée dans un cercle blanc.
  it('fournit des icônes maskable en 192 et 512', () => {
    const icons = manifest.icons as readonly {
      readonly sizes: string;
      readonly purpose: string;
    }[];
    const maskable = icons.filter((icon) => icon.purpose === 'maskable');

    expect(maskable.map((icon) => icon.sizes).sort()).toEqual(['192x192', '512x512']);
  });

  it('fournit l’icône que réclame iOS pour l’écran d’accueil', () => {
    expect(existsSync(join(publicDir, 'apple-touch-icon.png'))).toBe(true);
  });
});

describe('service worker', () => {
  const assets = ['assets/index-abc123.css', 'assets/index-def456.js', 'icon-192.png', 'index.html'];
  const source = serviceWorkerSource(assets, 'cafe1234');

  it('précharge tous les fichiers du déploiement', () => {
    for (const asset of assets) {
      expect(source).toContain(`./${asset}`);
    }
  });

  it('ne se met pas lui-même en cache', () => {
    expect(source).not.toContain('./sw.js');
  });

  it('nomme le cache d’après la version, pour que l’ancien soit purgé', () => {
    expect(source).toContain("const CACHE = 'boggle-cafe1234'");
    expect(source).toContain('caches.delete');
  });

  // Cache d'abord sur la navigation, et un déploiement resterait invisible
  // tant que le service worker ne se met pas à jour.
  it('va au réseau d’abord pour la navigation, avec repli sur le cache', () => {
    expect(source).toContain("request.mode === 'navigate'");
    expect(source).toMatch(/fetch\(request\)\.catch/);
    expect(source).toContain('caches.match(INDEX, MATCH)');
  });

  it('sert les autres requêtes depuis le cache — leur nom porte une empreinte', () => {
    expect(source).toMatch(/caches\.match\(request, MATCH\)/);
  });

  // Sans `ignoreVary`, un `Vary: Origin` renvoyé par le serveur suffit à faire
  // échouer la correspondance : la requête de préchargement n'a pas les mêmes
  // en-têtes que celle du navigateur, et le hors ligne ne marche plus.
  it('ignore l’en-tête Vary à la lecture du cache', () => {
    expect(source).toContain('ignoreVary: true');
    expect(source).toContain('caches.match(INDEX, MATCH)');
  });

  it('laisse passer les écritures et les autres origines', () => {
    expect(source).toContain("request.method !== 'GET'");
    expect(source).toContain('self.location.origin');
  });

  it('prend la main sans attendre la fermeture des onglets', () => {
    expect(source).toContain('skipWaiting');
    expect(source).toContain('clients.claim');
  });

  it('se replie sur la racine si le déploiement n’a pas d’index.html', () => {
    expect(serviceWorkerSource(['assets/index.js'], 'v1')).toContain("const INDEX = \"./\"");
  });
});
