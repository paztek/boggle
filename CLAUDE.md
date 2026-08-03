# CLAUDE.md

Consignes de travail pour Claude Code sur ce dépôt.

## Le projet en une phrase

Application web statique de tirage de grilles de Boggle (4×4 / 5×5) et de tenue de la feuille de
scores, hébergée sur GitHub Pages, **sans backend et sans dictionnaire**.

Lire [docs/RULES.md](docs/RULES.md) avant toute décision fonctionnelle et
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) avant toute décision technique. Ces deux documents font
autorité ; ce fichier ne les répète pas.

## Règles non négociables

Ces contraintes définissent le projet. Ne pas les contourner, ne pas les « améliorer » sans demande
explicite.

1. **Aucun backend, aucune dépendance réseau au runtime.** Le build doit produire un site statique
   déployable tel quel sur GitHub Pages.
2. **Pas de saisie des mots trouvés.** Les joueurs écrivent sur papier ; c'est un choix délibéré,
   pas un manque. Ne pas proposer de champ de saisie de mots.
3. **Pas de dictionnaire, pas de liste de mots, pas de validation de mots.** Aucun asset de ce type
   ne doit entrer dans le dépôt ni dans le bundle.
4. **L'application ne calcule pas les points.** Les scores sont saisis manuellement, manche par
   manche. Le barème est affiché en rappel uniquement.
5. **Les dés sont la seule source du tirage.** Ne jamais introduire de table de fréquence de lettres
   en parallèle des faces de dés — cela ferait diverger le tirage du jeu physique.
6. **Aucune donnée ne quitte l'appareil.** Persistance `localStorage` uniquement.

Si une demande semble entrer en conflit avec l'un de ces points, le signaler explicitement avant
d'implémenter.

## Conventions de code

- **TypeScript strict.** Pas de `any`, pas de `@ts-ignore`.
- **Immutabilité.** Toute transition d'état retourne de nouveaux objets. Aucune mutation en place.
- **`src/domain/` ne dépend pas de React.** Fonctions pures, testables en isolation. Le hasard y est
  toujours **injecté** (`RandomFn`), jamais appelé directement — c'est ce qui rend le tirage testable.
- **Valeurs dérivées, jamais stockées.** Totaux cumulés et classement se recalculent à partir des
  manches.
- **CSS : tokens uniquement.** Couleurs, espacements et tailles viennent de `src/styles/tokens.css`.
  Aucune valeur en dur dans les composants.
- **Une seule police chargée**, réservée aux tuiles ; l'interface reste sur la pile système. Les
  lettres gardent le dessin par défaut de la police, sans variante de caractère OpenType — voir
  § 8.1 de [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
- **Animations sur `transform` / `opacity` seulement.** Y compris la rotation des tuiles.
- **Fichiers courts et cohésifs**, organisés par fonctionnalité et non par type de fichier.
- Commentaires en français, comme le reste de la documentation.

## Tests

- TDD sur `src/domain/` : le tirage et la dérivation des scores se testent avant d'être écrits.
- Le tirage se vérifie par **invariants sur de nombreux tirages** (chaque dé utilisé une fois, face
  appartenant bien au dé, orientation dans l'ensemble attendu) et par **générateur à graine**, pas
  par comparaison à une grille figée.
- Tester explicitement la lecture d'un `localStorage` corrompu ou d'une version antérieure :
  l'application doit repartir proprement, jamais planter.

## Commandes

```bash
npm run dev       # serveur de développement
npm run build     # build de production dans dist/
npm run preview   # prévisualisation du build
npm test          # tests unitaires
npm run lint      # lint
```

## Documentation à tenir à jour

- Une décision fonctionnelle nouvelle ou un changement de périmètre → [docs/RULES.md](docs/RULES.md)
- Un choix technique, une dépendance, un changement de modèle de données →
  [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), section correspondante et tableau des décisions
  ouvertes

## Git

- Commits conventionnels : `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, `perf:`, `ci:`
- Messages en français.

## État actuel

En place : le squelette Vite + React + TypeScript, la couche `src/domain/` (dés, tirage, barème,
parties, répertoire des joueurs) avec ses tests, la persistance `localStorage` versionnée et
validée, l'affichage de la grille, les deux panneaux latéraux (barème à gauche, partie et scores à
droite), et le workflow de vérification et déploiement GitHub Pages.

Restent à faire :

- Chronomètre de manche (`src/components/timer/`, `src/hooks/useCountdown.ts`).
- Exposer l'ajout d'un joueur en cours de partie — `addPlayer` existe déjà côté domaine.

Voir la section « Décisions ouvertes » de [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
