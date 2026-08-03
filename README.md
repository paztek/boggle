# Boggle — Tirage de grilles & feuille de scores

**→ [Ouvrir l'application](https://paztek.github.io/boggle/)** — installable sur l'écran d'accueil,
puis utilisable hors ligne.

Application web **100 % frontend** (aucun serveur, aucune base de données) qui remplit deux rôles
pendant une partie de Boggle sur papier :

1. **Tirer une grille** 4×4 ou 5×5 en simulant le lancer des dés officiels français ;
2. **Tenir la feuille de scores** des joueurs sur l'ensemble des manches d'une partie.

Les joueurs continuent d'écrire leurs mots au papier et au crayon — c'est bien plus rapide.
L'application **ne saisit pas les mots** et **ne calcule pas les points** : elle affiche la grille,
le chrono, un rappel du barème, et additionne les totaux saisis manuellement à la fin de chaque
manche.

## Fonctionnalités

- Tirage aléatoire d'une grille **4×4** (16 dés) ou **5×5** (25 dés) — chaque dé est utilisé
  exactement une fois, puis lancé
- Orientation aléatoire de chaque lettre affichée, comme dans le boîtier physique
- Gestion des joueurs, avec répertoire local des joueurs déjà rencontrés
- Mode de fin de partie : libre, nombre de manches, ou score à atteindre
- Saisie du score de chaque joueur, manche par manche ; totaux et classement dérivés
- Chronomètre de manche à durée réglable, avec alerte visuelle et sonore avant la fin
- Rappel du barème officiel à l'écran, et lien vers le
  [vérificateur de mots de la FFSc](https://www.ffscrabble.fr/verificateur-de-mots/) en cas de litige
- Historique des parties : une partie passée peut être reprise ou supprimée
- Persistance locale : une partie interrompue est retrouvée au rechargement de la page
- Installable en PWA, pleinement fonctionnelle hors ligne après le premier chargement

## Ce que l'application ne fait pas

Ces limites sont **volontaires**, voir [docs/RULES.md](docs/RULES.md) :

- pas de saisie des mots trouvés ;
- pas de dictionnaire embarqué, pas de validation de mots ;
- pas de calcul automatique des points à partir des mots ;
- pas de comptes utilisateurs, pas de synchronisation entre appareils.

La vérification d'un mot litigieux est **déléguée par lien sortant** vers le
[vérificateur de la Fédération française de Scrabble](https://www.ffscrabble.fr/verificateur-de-mots/),
plutôt qu'assurée par une liste de mots embarquée. C'est le seul lien externe de l'application ;
hors ligne, tout le reste continue de fonctionner.

## Démarrage

Node 24 ou supérieur.

```bash
npm install
npm run dev            # serveur de développement
npm run build          # build de production dans dist/
npm run preview        # prévisualisation du build, sur /boggle/
npm test               # tests unitaires
npm run test:coverage  # tests avec couverture
npm run lint           # lint
```

## Déploiement

Le site est statique et pensé pour **GitHub Pages**. Le workflow
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) lance lint, types, tests et build sur
chaque push et chaque pull request vers `main`, puis publie `dist/` — uniquement depuis `main`.

Le chemin de base est dérivé automatiquement du nom du dépôt (`BASE_PATH`), le renommer ne casse
donc pas les assets.

**À faire une fois avant le premier déploiement** : dans _Settings → Pages_, sélectionner
**GitHub Actions** comme source de déploiement.

## Documentation

| Document | Contenu |
| --- | --- |
| [docs/RULES.md](docs/RULES.md) | Règles du jeu, barème, déroulé d'une partie, périmètre fonctionnel |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, structure du code, modèle de données, déploiement |
| [CLAUDE.md](CLAUDE.md) | Consignes de travail pour Claude Code sur ce dépôt |

## Licence

[MIT](LICENSE) — libre de reprise, de modification et de redistribution, y compris commerciale, à
la seule condition de **conserver la mention de copyright et le texte de la licence** dans les
copies.

La police Inter, incluse dans `src/assets/fonts/`, garde sa propre licence
([SIL Open Font License 1.1](src/assets/fonts/Inter-LICENSE.txt)).
