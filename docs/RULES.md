# Règles du jeu et périmètre fonctionnel

Ce document décrit les règles du Boggle telles que l'application les accompagne, et surtout **la
frontière entre ce que fait le logiciel et ce que font les joueurs**. Il fait autorité sur le
comportement attendu de l'application.

## 1. Principe du jeu

Une grille de lettres est tirée au hasard en lançant des dés. Chaque joueur dispose d'un temps
limité pour écrire, sur sa feuille, le plus de mots possible formés en reliant des lettres
adjacentes de la grille. À la fin du temps imparti, les joueurs comparent leurs listes, éliminent
les mots communs, comptent leurs points et reportent leur total dans l'application.

## 2. Formats de grille

| Format | Dés | Nom courant | Longueur minimale des mots |
| --- | --- | --- | --- |
| 4×4 | 16 | Boggle | 3 lettres |
| 5×5 | 25 | Super Boggle / Big Boggle | 4 lettres |

## 3. Tirage de la grille

Le tirage simule le lancer physique des dés :

1. Les dés sont **mélangés** — chaque dé est affecté à une case, chaque case reçoit exactement un dé.
   Un dé donné ne peut pas apparaître deux fois dans la même grille.
2. Chaque dé est **lancé** — une de ses six faces est tirée au sort.
3. Chaque lettre reçoit une **orientation aléatoire** (0°, 90°, 180°, 270°) à l'affichage, comme
   dans le boîtier réel : la grille n'a pas de « haut » privilégié.

Le jeu de dés utilisé est celui du **Boggle français**. Les faces exactes des 16 et 25 dés sont
définies dans les données du projet (voir [ARCHITECTURE.md](ARCHITECTURE.md#jeux-de-dés)) et
constituent la référence unique du tirage : aucune pondération de lettres n'est appliquée par
ailleurs.

### Cas particuliers d'affichage

- La face **`Qu`**, lorsqu'un jeu la comporte, compte pour deux lettres dans un mot et s'affiche
  comme une seule tuile. Le jeu de dés français actuel n'en contient pas : le `Q` y est autonome.
- Les faces `M` et `W`, `N` et `Z`, `6` et `9` étant ambiguës selon l'orientation, l'affichage
  reprend la convention du jeu physique : un **point souligné** (ou un soulignement) lève
  l'ambiguïté.

## 4. Formation des mots

Règles rappelées ici pour référence — leur application relève des joueurs, pas du logiciel :

- Les lettres doivent être **adjacentes**, horizontalement, verticalement ou en diagonale.
- Un même dé ne peut pas être **utilisé deux fois dans le même mot**.
- Les accents, cédilles et trémas sont **ignorés** : `ELEVE` vaut `ÉLÈVE`.
- Sont admis : noms communs, verbes conjugués, adjectifs, adverbes, dans toutes leurs formes
  fléchies (pluriels, féminins, conjugaisons).
- Sont exclus : noms propres, abréviations, sigles, mots étrangers non francisés.
- Un mot trouvé par **plusieurs joueurs** est rayé de toutes les listes et ne rapporte rien à
  personne.

En cas de litige, le dictionnaire de référence est l'**ODS (Officiel du Scrabble)**.

## 5. Barème

Le barème officiel, rappelé à l'écran pendant la saisie des scores :

| Longueur du mot | 4×4 | 5×5 |
| --- | --- | --- |
| 3 lettres | 1 point | — (non valide) |
| 4 lettres | 1 point | 1 point |
| 5 lettres | 2 points | 2 points |
| 6 lettres | 3 points | 3 points |
| 7 lettres | 5 points | 5 points |
| 8 lettres et plus | 11 points | 11 points |

Ce barème est **affiché à titre de rappel**. L'application ne l'applique pas : ce sont les joueurs
qui comptent leurs points sur leur feuille et saisissent le total obtenu.

## 6. Déroulé d'une partie

Une **partie** est une suite de **manches**. Une manche correspond à un tirage de grille.

1. Créer une partie : choisir le format (4×4 ou 5×5), saisir les joueurs et le mode de fin.
2. Lancer une manche : l'application tire une grille et l'affiche **masquée** (lettres floutées).
3. Démarrer le chrono (3 minutes par défaut, durée réglable de 30 s à 10 min) : le clic **révèle la
   grille** et lance le décompte d'un même geste.
4. À la fin du temps, les joueurs comparent leurs listes et comptent leurs points.
5. Saisir le total de chaque joueur pour la manche.
6. L'application met à jour les totaux cumulés et le classement.
7. Répéter à partir de l'étape 2 autant de manches que souhaité.
8. Le vainqueur est le joueur au total cumulé le plus élevé à l'arrêt de la partie.

Les joueurs sont **enregistrés localement** d'une partie à l'autre : un nom déjà rencontré est
proposé en un clic plutôt que retapé. La comparaison ignore la casse et les accents — « Chloé » et
« chloe » désignent la même personne.

Une manche peut être **supprimée** depuis la feuille de scores, par le « × » de sa ligne : une grille
tirée par erreur, une manche jouée à côté de la plaque, et la ligne s'efface avec les scores qui y
étaient saisis. Les manches suivantes sont renumérotées, les totaux recalculés, et un objectif
exprimé en manches recule d'autant. L'opération demande confirmation sur place, car elle est
définitive au même titre que la suppression d'une partie.

Une partie garde toujours **au moins une manche** : elle en tire une dès sa création, et c'est cette
manche qui fournit la grille affichée. Supprimer la dernière reviendrait à supprimer la partie, ce
que l'historique permet déjà — le « × » ne s'affiche donc qu'à partir de deux manches.

### Fin de partie

Trois modes, choisis à la création :

| Mode | Objectif |
| --- | --- |
| **Libre** | Aucun ; la partie s'arrête quand les joueurs le décident |
| **Nombre de manches** | Un nombre de manches fixé à l'avance (1 à 30) |
| **Score à atteindre** | Un total à franchir par au moins un joueur (1 à 999) |

Un objectif atteint **ne termine pas la partie tout seul** : l'application signale que le but est
atteint et propose de conclure. Ce sont toujours les joueurs qui décident, et rien n'empêche de
poursuivre au-delà. C'est aussi pourquoi un objectif exprimé en manches se mesure au nombre de
grilles tirées, sans attendre que tous les scores soient saisis — un score de 0 est une saisie
légitime, indiscernable d'une absence de saisie du point de vue d'un décompte automatique.

### Chronomètre

La durée d'une manche est choisie à la création de la partie et reste réglable ensuite. Elle
appartient à la partie : toutes ses manches durent le même temps, sans quoi elles ne seraient pas
comparables.

Une **alerte** signale l'approche de la fin, par défaut 30 secondes avant. Le seuil est réglable de
0 à 120 secondes, `0` la désactivant. Elle se manifeste à l'écran (couleur, libellé, pulsation) et
par un bip, désactivable. Ces réglages tiennent à l'appareil et valent pour toutes les parties.

Le chronomètre ne se lance jamais tout seul, et à zéro il se contente de signaler : il n'enchaîne
pas la manche suivante et ne saisit aucun score.

Tant que le décompte n'est pas actif, la grille est **masquée** : les lettres sont floutées et
indevinables, et un bouton couvrant toute la grille la révèle. C'est le cas avant le démarrage (le
bouton affiche **Démarrer**) comme pendant une **pause** (il affiche **Reprendre**) : le clic révèle
la grille et (re)lance le chrono d'un même geste — sans quoi la personne qui manipule l'appareil
verrait les lettres pendant que les autres ne jouent pas et prendrait de l'avance. Chaque nouvelle
manche remasque la grille jusqu'au démarrage suivant.

Pendant le décompte, l'application demande à l'appareil de **garder l'écran allumé** — personne ne
touche l'écran pendant une manche, et il s'éteindrait au milieu. Le réglage est désactivable, et
tous les appareils ne l'autorisent pas.

### Historique des parties

Les parties passées sont conservées sur l'appareil et peuvent être **reprises** : une partie
terminée redevient courante et les manches se poursuivent là où elles s'étaient arrêtées. Seules les
vingt parties les plus récentes sont conservées.

Une partie passée peut aussi être **supprimée**. L'opération demande confirmation sur place, car
elle est définitive : rien n'ayant jamais quitté l'appareil, il n'existe aucune copie à restaurer.

## 7. Périmètre fonctionnel

### Dans le périmètre

- Tirage de grilles 4×4 et 5×5 conforme aux dés français
- Chronomètre de manche, avec durée réglable et alerte visuelle et sonore avant la fin
- Gestion des joueurs d'une partie, et répertoire local des joueurs déjà rencontrés
- Choix du mode de fin de partie (libre, nombre de manches, score à atteindre)
- Saisie manuelle des scores par joueur et par manche, et suppression d'une manche
- Totaux cumulés, classement, historique des manches
- Rappel du barème à l'écran
- Persistance locale de la partie en cours et des parties passées, reprise et suppression possibles
- Lien sortant vers un vérificateur de mots externe, pour trancher un litige
- Installation sur l'écran d'accueil et fonctionnement hors ligne après le premier chargement

### Hors périmètre (décisions assumées)

| Exclusion | Raison |
| --- | --- |
| Saisie des mots trouvés | Le papier-crayon est nettement plus rapide en séance |
| Dictionnaire embarqué | Poids de téléchargement injustifié pour un usage marginal |
| Validation automatique des mots | Découle de l'absence de dictionnaire |
| Calcul des points à partir des mots | Découle de l'absence de saisie des mots |
| Comptes utilisateurs, backend, synchronisation | L'application doit rester purement statique |
| Multijoueur en réseau | Le jeu se joue autour d'une même table |
| Ajout d'un joueur en cours de partie | Les joueurs sont là dès la première manche ; le modèle le supporterait, l'interface ne l'expose pas |

### Vérification d'un mot litigieux

Elle est **déléguée par lien sortant**. Le panneau des règles renvoie au
[vérificateur de mots de la Fédération française de Scrabble](https://www.ffscrabble.fr/verificateur-de-mots/),
à côté du rappel que l'ODS fait référence.

C'est le **seul lien externe** de l'application, et il doit le rester : la délégation est justement
ce qui permet de trancher un litige sans réintroduire de liste de mots dans le bundle. Hors ligne,
le lien ne fonctionne pas — tout le reste, si.
