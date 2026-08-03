# Architecture

## 1. Contraintes structurantes

| Contrainte | Conséquence |
| --- | --- |
| Hébergement GitHub Pages | Site **entièrement statique**, aucun code serveur, aucune variable d'environnement secrète |
| Pas de backend | Toute la persistance est locale (`localStorage`) |
| Pas de dictionnaire | Aucun asset volumineux, bundle de quelques dizaines de Ko |
| Usage en séance, autour d'une table | Lisibilité à distance, écran souvent en veille : robustesse au rechargement |
| Utilisé sur mobile et tablette | Responsive obligatoire, cibles tactiles généreuses |

## 2. Stack

| Choix | Rôle | Justification |
| --- | --- | --- |
| **Vite** | Build & dev server | Build statique rapide, configuration `base` triviale pour GitHub Pages |
| **React + TypeScript** | UI | Typage du modèle de données (parties, manches, scores), composants testables |
| **CSS natif + custom properties** | Styles | Aucun runtime CSS, tokens de design centralisés, budget CSS respecté |
| **InterDisplay sous-catégorisée** | Police des tuiles | Voir § 8.1 — auto-hébergée, 2,3 Ko, variantes OpenType de lisibilité |
| **Vitest + Testing Library** | Tests unitaires / composants | Intégration native avec Vite |
| **oxlint** | Lint | Fourni par le template Vite, sans configuration ni dépendances lourdes |
| **GitHub Actions** | CI / déploiement | Build et publication sur Pages à chaque push de `main` |

Aucune librairie de gestion d'état externe : l'état tient dans un `useReducer` + contexte React.

## 3. Structure des dossiers

```text
.
├── docs/
│   ├── RULES.md
│   └── ARCHITECTURE.md
├── public/
├── scripts/
│   └── build-font-subset.sh  # Régénère la police des tuiles
├── src/
│   ├── assets/
│   │   └── fonts/            # InterDisplay sous-catégorisée + licence OFL
│   ├── components/
│   │   ├── board/            # Grille, tuiles, orientation des lettres
│   │   ├── game/             # Panneau droit : joueurs, fin de partie, scores, historique
│   │   ├── rules/            # Panneau gauche : barème & rappel des règles
│   │   ├── timer/            # Chronomètre de manche
│   │   └── ui/               # SidePanel (coquille commune aux deux panneaux)
│   ├── domain/
│   │   ├── dice.ts           # Jeux de dés 4x4 et 5x5
│   │   ├── draw.ts           # Tirage : mélange, lancer, orientation
│   │   ├── scoring.ts        # Barème (données d'affichage uniquement)
│   │   ├── game.ts           # Types Game / Round / Player, transitions, dérivations
│   │   └── roster.ts         # Répertoire des joueurs déjà rencontrés
│   ├── hooks/
│   │   ├── useGame.ts        # État applicatif + persistance différée
│   │   └── useCountdown.ts
│   ├── lib/
│   │   ├── ids.ts            # Identifiants locaux
│   │   ├── random.ts         # Abstraction du générateur aléatoire
│   │   └── storage.ts        # Lecture/écriture localStorage, versionnage
│   ├── styles/
│   │   ├── tokens.css
│   │   ├── fonts.css
│   │   └── global.css
│   ├── App.tsx
│   └── main.tsx
├── .github/workflows/deploy.yml
├── CLAUDE.md
├── README.md
└── vite.config.ts
```

Le dossier `domain/` ne dépend **jamais** de React : il est testable en isolation et constitue le
cœur métier.

## 4. Modèle de données

```ts
type BoardSize = 4 | 5;

/** Une face de dé : une lettre, ou "Qu". */
type Face = string;

/** Un dé = 6 faces. */
type Die = readonly [Face, Face, Face, Face, Face, Face];

type Tile = {
  face: Face;
  /** Rotation d'affichage, en degrés : 0 | 90 | 180 | 270. */
  rotation: number;
  /** Index du dé d'origine dans le jeu de dés, pour la traçabilité du tirage. */
  dieIndex: number;
};

type Board = {
  size: BoardSize;
  /** size * size tuiles, en lecture ligne par ligne. */
  tiles: readonly Tile[];
};

type Round = {
  id: string;
  board: Board;
  drawnAt: string;             // ISO 8601
  /** Score saisi manuellement, indexé par identifiant de joueur. */
  scores: Readonly<Record<string, number>>;
};

type Player = {
  id: string;
  name: string;
};

/** Condition d'arrêt — *proposée*, jamais imposée (cf. docs/RULES.md § 6). */
type EndCondition =
  | { kind: 'libre' }
  | { kind: 'manches'; rounds: number }
  | { kind: 'score'; target: number };

type Game = {
  id: string;
  size: BoardSize;
  players: readonly Player[];
  rounds: readonly Round[];
  endCondition: EndCondition;
  status: 'en-cours' | 'terminee';
  createdAt: string;           // ISO 8601
  finishedAt: string | null;   // ISO 8601
};

/** Joueur du répertoire local, réutilisable d'une partie à l'autre. */
type KnownPlayer = {
  id: string;
  name: string;
  lastPlayedAt: string;        // ISO 8601, sert au tri
};
```

Les totaux cumulés et le classement sont **dérivés** de `rounds`, jamais stockés. Un joueur ajouté
en cours de partie n'a simplement pas d'entrée dans les `scores` des manches antérieures ; l'absence
est traitée comme `0` au calcul, et affichée comme `—` dans le tableau. La distinction entre
« absent » et « zéro » est significative : `setScore(…, null)` efface une saisie, `setScore(…, 0)`
enregistre un score nul.

Toutes les transitions d'état produisent de **nouveaux objets** ; aucune mutation en place.

Comme le hasard du tirage, les valeurs non déterministes du modèle — identifiants et horodatages —
sont **injectées** par l'appelant. `domain/game.ts` et `domain/roster.ts` ne connaissent ni
`crypto.randomUUID`, ni `Date`, ce qui les rend testables sans horloge simulée. Le réducteur de
`hooks/useGame.ts` obéit à la même règle : ce sont les créateurs d'actions qui tirent la grille,
forgent l'identifiant et datent.

## 5. Jeux de dés

Les faces des dés vivent dans `src/domain/dice.ts`, écrites **face par face** :

```ts
export const DICE_4X4: readonly Die[] = [
  ['E', 'T', 'U', 'K', 'N', 'O'],
  // … 16 dés au total
];
```

Les faces sont des tableaux explicites et non des chaînes à découper : `Qu` reste une face unique,
ce qu'un découpage caractère par caractère ne saurait pas exprimer.

Ce sont désormais les **dés français** : 16 dés pour le 4×4, 25 pour le 5×5. Le jeu français porte
un `Q` **autonome** — aucune face `Qu`. Le digramme reste néanmoins pris en charge par le type
`Face` et par la police (§ 8.1), au cas où un futur jeu le réintroduirait.

Ces faces sont la **seule** source du tirage : aucune table de fréquence de lettres ne doit être
introduite en parallèle, sous peine de faire diverger le tirage du jeu physique.

Invariants vérifiés par les tests :

- `DICE_FR_4X4` contient exactement 16 dés, `DICE_FR_5X5` exactement 25 ;
- chaque dé possède exactement 6 faces ;
- un tirage utilise chaque dé exactement une fois ;
- toute face produite appartient bien au dé affecté à la case.

## 6. Tirage

`src/domain/draw.ts` expose une fonction pure :

```ts
function drawBoard(dice: readonly Die[], size: BoardSize, random: RandomFn): Board;
```

- **Mélange** : Fisher-Yates sur la copie du tableau de dés.
- **Lancer** : sélection uniforme d'une face parmi les six.
- **Orientation** : sélection uniforme parmi les quatre rotations.

Le générateur aléatoire est injecté (`RandomFn = () => number`). En production, `crypto.getRandomValues`
via `src/lib/random.ts` ; dans les tests, un générateur déterministe à graine. Cette injection est ce
qui rend le tirage testable — aucun appel direct à `Math.random()` dans `domain/`.

## 7. État et persistance

- L'état applicatif est porté par un `useReducer` dans `hooks/useGame.ts`, consommé directement par
  `App` qui le distribue en props — aucun contexte n'est nécessaire à un seul niveau d'imbrication.
- Deux clés versionnées, écrites indépendamment :

  | Clé | Contenu |
  | --- | --- |
  | `boggle:games:v1` | `{ version, currentGameId, games: Game[] }` |
  | `boggle:roster:v1` | `{ version, players: KnownPlayer[] }` |

- L'écriture est **différée** de 250 ms : saisir un score à deux chiffres n'écrit qu'une fois.
- La lecture au démarrage est **défensive** : le contenu de `localStorage` est validé contre le
  schéma attendu avant d'être adopté. Un état invalide ou d'une version antérieure est écarté sans
  faire planter l'application. La validation est **granulaire** — une partie corrompue est écartée
  seule, les autres restent jouables — et une `currentGameId` qui ne désigne plus rien est oubliée.
- `localStorage` peut lever (quota dépassé, navigation privée, stockage désactivé) : lecture et
  écriture sont encapsulées dans un `try`/`catch`. Au pire, la partie continue en mémoire.
- L'historique est borné à **20 parties**, la partie courante étant toujours conservée même si elle
  sort de cette fenêtre — reprendre une partie ancienne ne doit pas la faire disparaître.
- Aucune donnée ne quitte l'appareil.

## 8. Interface

Trois écrans, sans routeur — l'état de la partie détermine la vue :

1. **Setup** — format de grille, joueurs, durée de manche.
2. **Manche** — grille en grand, chronomètre, bouton « Nouvelle grille ».
3. **Scores** — saisie des totaux de la manche, classement cumulé, rappel du barème.

Deux **panneaux dépliables** encadrent l'écran, disponibles en permanence :

| Panneau | Contenu |
| --- | --- |
| Gauche — `components/rules/RulesPanel` | Barème du format courant, rappel des règles. Purement présentationnel |
| Droite — `components/game/GamePanel` | Joueurs, démarrage d'une partie, mode de fin, feuille de scores, historique |

Ils partagent la même coquille, `components/ui/SidePanel` : bouton fixé en haut, voile de fond,
fermeture au clic hors panneau ou à la touche `Échap`, sortie du flux de tabulation (`inert`) une
fois replié, glissement animé en `transform` et voile en `opacity` uniquement. Le bord d'ancrage
est un simple `data-side`. La coquille accepte une ouverture **pilotée** (`open` / `onOpenChange`)
ou gère son propre état si ces props sont omises ; `App` la pilote pour n'ouvrir **qu'un panneau à
la fois** — sur mobile, chacun occupe 88 % de la largeur et ils se recouvriraient.

Dans le panneau droit :

- La feuille de scores est un tableau à `1 + n` colonnes (numéro de manche, puis un joueur par
  colonne), avec les totaux dérivés en pied. Au-delà de trois ou quatre joueurs, elle défile
  **horizontalement dans son conteneur** plutôt que d'élargir la page.
- Les champs numériques (nombre de manches, score cible) gardent la saisie telle quelle — y compris
  vide, le temps de retaper — et ne sont ramenés dans leurs bornes qu'à la sortie du champ. Les
  contraindre à chaque frappe rendrait impossible d'effacer pour retaper.
- En partie, le format de grille est **verrouillé** sur l'écran principal : le changer rendrait les
  manches incomparables. Le bouton « Nouvelle grille » devient « Manche suivante ».

Points d'attention :

- La grille est l'élément dominant : typographie très large, contraste élevé, lisible à un mètre.
- Les rotations de tuiles sont appliquées en `transform`, jamais par des propriétés de mise en page.
- Les tailles suivent des `clamp()` sur les tokens de `styles/tokens.css` : aucune valeur en dur.
- Navigation clavier complète et respect de `prefers-reduced-motion`.

### 8.1 Typographie des tuiles

L'interface reste sur la **pile système** (`--font-body`) : rien à télécharger. Seules les tuiles
chargent une police, parce que la lisibilité y est fonctionnelle et non décorative — les lettres
sont grandes, lues à distance et **pivotées aléatoirement**.

La police retenue est **InterDisplay Bold** (variante optique d'Inter destinée aux grandes tailles),
sous-catégorisée à `A`–`Z` plus le `u` de `Qu` — conservé bien que le jeu français n'en use pas,
au cas où un futur jeu réintroduirait le digramme. Résultat :
**2,3 Ko**, inliné en data URI par Vite (sous le seuil de 4 Ko), donc **aucune requête réseau
supplémentaire** et pas de FOUT.

Deux variantes de caractères OpenType sont activées via `--font-tile-features` :

| Variante | Effet | Pourquoi |
| --- | --- | --- |
| `cv08` | `I` à empattements | Sans elle, un `I` pivoté à 90° se réduit à un trait horizontal illisible |
| `cv10` | `G` à éperon | Sépare nettement le `G` du `O` et du `C` |

> **Ne pas remplacer par `@fontsource/inter`.** Ce paquet retire les variantes de caractères : son
> fichier ne contient que `calt, ccmp, dnom, frac, locl, numr, pnum, tnum`. `cv08` y est absent, et
> le `I` redevient un bâton. La police est donc générée depuis la distribution officielle par
> [`scripts/build-font-subset.sh`](../scripts/build-font-subset.sh), qui préserve explicitement les
> variantes (`--layout-features+=cv08,cv10`).

Le fichier est versionné dans `src/assets/fonts/` : le build ne dépend pas du réseau, seul le script
de régénération en a besoin. Inter est sous licence SIL Open Font 1.1, dont le texte accompagne le
fichier.

## 9. Tests

| Niveau | Cible | Outil |
| --- | --- | --- |
| Unitaire | `domain/draw.ts`, `domain/dice.ts` — tirage et invariants des dés | Vitest |
| Unitaire | `domain/game.ts` — transitions, totaux dérivés, ex æquo, conditions d'arrêt | Vitest |
| Unitaire | `domain/roster.ts` — dédoublonnage insensible à la casse et aux accents | Vitest |
| Unitaire | `lib/storage.ts` — état corrompu, version obsolète, quota dépassé | Vitest |
| Composants | Panneaux, saisie des scores, chronomètre, rendu de la grille | Vitest + Testing Library |

Le tirage étant aléatoire, il se teste par **injection d'un générateur à graine** et par vérification
d'invariants sur un grand nombre de tirages, pas par comparaison à une grille figée.

## 10. Déploiement

Workflow `.github/workflows/deploy.yml`, déclenché sur push et pull request vers `main` :

1. `npm ci`
2. `npm run lint`
3. `npx tsc -b` — vérification des types
4. `npm test`
5. `npm run build`
6. Publication de `dist/` via `actions/upload-pages-artifact` puis `actions/deploy-pages`

Les étapes 1 à 5 tournent aussi sur les pull requests ; seul le déploiement est réservé aux pushes
sur `main`.

Le chemin de base est dérivé du nom du dépôt par le workflow :

```ts
const base = process.env.BASE_PATH ?? '/boggle/';
```

```yaml
env:
  BASE_PATH: /${{ github.event.repository.name }}/
```

Renommer le dépôt ne casse donc pas les assets. En local, la valeur par défaut `/boggle/`
s'applique : `npm run preview` sert le site sur `http://localhost:4173/boggle/`.

**Prérequis côté GitHub** : dans _Settings → Pages_, choisir **GitHub Actions** comme source de
déploiement. Sans cela, le job `deploy` échoue.

Le site étant statique et sans routeur, aucune réécriture d'URL n'est nécessaire. Un fichier
`public/.nojekyll` est publié pour désactiver tout traitement Jekyll.

## 11. Décisions ouvertes

| Sujet | État |
| --- | --- |
| Vérification d'un mot litigieux par lien sortant | Envisagée, hors du périmètre initial |
| Conservation de l'historique des parties terminées | **Tranchée** — les 20 dernières parties sont conservées et peuvent être reprises |
| Ajout d'un joueur en cours de partie | Supporté par le modèle (`addPlayer`), pas encore exposé dans l'interface |
| Licence du dépôt | À définir |
