# Boggle — Tirage de grilles & feuille de scores

Application web **100 % frontend** (aucun serveur, aucune base de données) qui remplit deux rôles
pendant une partie de Boggle sur papier :

1. **Tirer une grille** 4×4 ou 5×5 en simulant le lancer des dés officiels français ;
2. **Tenir la feuille de scores** des joueurs sur l'ensemble des manches d'une partie.

Les joueurs continuent d'écrire leurs mots au papier et au crayon — c'est bien plus rapide.
L'application **ne saisit pas les mots** et **ne calcule pas les points** : elle affiche la grille,
le chrono, un rappel du barème, et additionne les totaux saisis manuellement à la fin de chaque
manche.

## Fonctionnalités

- Tirage aléatoire d'une grille **4×4** (16 dés) ou **5×5** (25 dés) avec le jeu de dés français
- Orientation aléatoire de chaque lettre affichée, comme dans le boîtier physique
- Gestion des joueurs d'une partie (ajout, renommage, retrait)
- Saisie du score de chaque joueur, manche par manche
- Classement et total cumulé, mis à jour en direct
- Rappel du barème officiel à l'écran
- Chronomètre de manche (3 minutes par défaut)
- Persistance locale : une partie interrompue est retrouvée au rechargement de la page
- Fonctionne hors ligne une fois la page chargée

## Ce que l'application ne fait pas

Ces limites sont **volontaires**, voir [docs/RULES.md](docs/RULES.md) :

- pas de saisie des mots trouvés ;
- pas de dictionnaire embarqué, pas de validation de mots ;
- pas de calcul automatique des points à partir des mots ;
- pas de comptes utilisateurs, pas de synchronisation entre appareils.

Une vérification ponctuelle d'un mot litigieux pourra être ajoutée plus tard, en **déléguant à un
service externe** (type dictionnaire Scrabble FR) plutôt qu'en embarquant une liste de mots.

## Démarrage

```bash
npm install
npm run dev      # serveur de développement
npm run build    # build de production dans dist/
npm run preview  # prévisualisation du build
npm test         # tests unitaires
```

> Le squelette applicatif n'est pas encore en place : ce dépôt démarre par sa documentation.
> Voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) pour la structure cible.

## Déploiement

Le site est statique et pensé pour **GitHub Pages**. Le build produit `dist/`, publié par un
workflow GitHub Actions sur chaque push de `main`. Le chemin de base (`base` dans la config Vite)
doit correspondre au nom du dépôt pour que les assets se résolvent correctement.

## Documentation

| Document | Contenu |
| --- | --- |
| [docs/RULES.md](docs/RULES.md) | Règles du jeu, barème, déroulé d'une partie, périmètre fonctionnel |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, structure du code, modèle de données, déploiement |
| [CLAUDE.md](CLAUDE.md) | Consignes de travail pour Claude Code sur ce dépôt |

## Licence

À définir.
