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
   déployable tel quel sur GitHub Pages. L'application est une PWA : installable et pleinement
   fonctionnelle hors ligne après le premier chargement — voir § 11 de
   [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
2. **Pas de saisie des mots trouvés.** Les joueurs écrivent sur papier ; c'est un choix délibéré,
   pas un manque. Ne pas proposer de champ de saisie de mots.
3. **Pas de dictionnaire, pas de liste de mots, pas de validation de mots.** Aucun asset de ce type
   ne doit entrer dans le dépôt ni dans le bundle. Trancher un mot litigieux passe par le **lien
   sortant** vers la FFSc, dans le panneau des règles — c'est le seul lien externe, et il doit le
   rester.
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
- **`src/domain/` ne dépend pas de React.** Fonctions pures, testables en isolation. Tout ce qui
  n'est pas déterministe y est **injecté**, jamais appelé directement : le hasard (`RandomFn`), mais
  aussi l'heure (`now`) et les identifiants. C'est ce qui rend le tirage reproductible et le
  chronomètre testable sans faux timers.
- **Valeurs dérivées, jamais stockées.** Totaux cumulés et classement se recalculent à partir des
  manches.
- **CSS : tokens uniquement.** Couleurs, espacements et tailles viennent de `src/styles/tokens.css`.
  Aucune valeur en dur dans les composants.
- **Une seule police chargée**, réservée aux tuiles ; l'interface reste sur la pile système. Les
  lettres gardent le dessin par défaut de la police, sans variante de caractère OpenType — voir
  § 8.2 de [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
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
npm run dev            # serveur de développement
npm run build          # build de production dans dist/
npm run preview        # prévisualisation du build, sur /boggle/
npm test               # tests unitaires
npm run test:watch     # tests en continu
npm run test:coverage  # tests avec couverture
npm run lint           # lint
npm run icons          # régénère les icônes de l'application (SVG + PNG)
```

Le service worker n'est enregistré qu'en production : pour vérifier le mode hors ligne, passer par
`npm run build && npm run preview`, jamais par `npm run dev`.

## Documentation à tenir à jour

- Une décision fonctionnelle nouvelle ou un changement de périmètre → [docs/RULES.md](docs/RULES.md)
- Un choix technique, une dépendance, un changement de modèle de données →
  [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), section correspondante et tableau des décisions (§ 12)
- Le README décrit le projet **pour un lecteur extérieur** : sa liste de fonctionnalités doit rester
  vraie, sans rubrique « prévu » qui survivrait à la livraison

## Git

- Commits conventionnels : `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, `perf:`, `ci:`
- Messages en français.

## État actuel

Le périmètre décrit dans [docs/RULES.md](docs/RULES.md) est **entièrement couvert**, et le tableau
des décisions (§ 12 de [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)) ne contient plus rien en
suspens.

En place : la couche `src/domain/` (dés, tirage, barème, parties, répertoire des joueurs,
chronomètre) avec ses tests ; la persistance `localStorage` versionnée, validée champ par champ et
répartie sur quatre clés ; la grille ; le chronomètre de manche à durée réglable, avec alerte
visuelle et sonore et maintien de l'écran allumé ; les deux panneaux latéraux (barème et règles à
gauche, partie et scores à droite) ; l'historique des parties, avec reprise et suppression ;
l'installation en PWA avec fonctionnement hors ligne ; et le workflow de vérification et déploiement
GitHub Pages.

L'application est déployée sur <https://paztek.github.io/boggle/> et publiée sous licence
[MIT](LICENSE).
