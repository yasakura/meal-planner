# ADR 0041 — Une liste de courses par menu, et l'abandon de la liste secondaire

- **Statut** : en vigueur
- **Date** : 2026-08-28
- **Portée** : `src/domain/use-cases/liste-de-courses.ts`,
  `src/ui/features/menu/liste-de-courses-view.ts`, `src/ui/features/menu/liste-de-courses-route.ts`,
  `src/ui/features/menu/liste-de-courses-relance.ts`,
  `src/ui/features/menu/ListeDeCoursesContainer.tsx`,
  `src/ui/features/menu/ListeDeCoursesScreen.tsx`, `src/ui/features/menu/menu-return.ts`,
  `src/ui/features/menu/menu-slice.ts`
- **PRD** : révoque **FR-21** à **FR-24** (§4.5 pour la bascule, §4.6 en entier) et rétrécit **FR-20**
- **Issue** : [#166](https://github.com/yasakura/meal-planner/issues/166)

## Contexte

Le PRD décrivait **deux listes globales**, l'une et l'autre uniques dans l'application :

- la **Liste principale** (F5, FR-20), agrégée à la validation d'un menu, groupée par catégorie de
  rayon, et qui « reste affichée entre les utilisations, jusqu'au prochain FR-16 **qui la
  remplace** » ;
- la **Liste secondaire** (F6, FR-21 à FR-24), où l'on bascule à la main les items introuvables au
  drive, qu'on coche en magasin avec un soft-delete à 24 h, qui « persiste indéfiniment » et qu'on
  vide explicitement. Le PRD la présentait comme **« la seule vraie innovation produit du MVP »**.

Aucune des deux n'est attachée à un menu. Une ligne « 800 g de tomates » n'y sait pas de quelle
semaine elle vient, et la seconde liste ne sait de la première que ce qu'un geste d'utilisateur lui
a dit.

## Le cas qui a fait tomber la forme

Dans les mots de l'utilisateur, parce qu'ils portent le cas mieux qu'une reformulation :

> « imagine, on est mercredi, j'ai fait que les courses jusqu'à ce jour, et j'ai généré le menu de la
> semaine suivante, si tout est mélangé dans la liste de course, je ne sais pas quoi acheter pour
> finir la semaine, et qu'est-ce qui est pour la semaine d'après »

Deux menus coexistent — celui de la semaine en cours, à moitié acheté, et celui de la suivante, déjà
généré. Une liste **globale** ne peut pas les distinguer : elle n'a pas la donnée. Le PRD comblait ce
trou par de la **mécanique** — basculer item par item (FR-21), cocher avec une fenêtre de 24 h
(FR-23), vider en bloc (FR-24) —, c'est-à-dire trois gestes pour reconstituer à la main une
information que le menu portait déjà.

Une liste **par menu** rend la question sans mécanisme : chaque liste est celle de sa semaine, et
c'est l'adresse qui le dit. Une fois qu'elle est par menu, la principale et la secondaire **perdent
leur objet** — la secondaire n'était que « ce qui reste de la liste courante », propriété qu'une
liste attachée à son menu tient par construction.

## Décision

**Une liste de courses par menu enregistré**, dérivée du menu à la volée, **à plat**, en **lecture
seule**, à l'adresse `/menu/:dateDebut/courses`
(`src/ui/features/menu/liste-de-courses-route.ts#LISTE_DE_COURSES_ROUTE`).

Six décisions de forme en découlent, chacune arbitrée pour elle-même.

### 1. Dérivée, jamais stockée

`src/domain/use-cases/liste-de-courses.ts#listeDeCourses` est une **fonction pure**
`menu + recettes + foyer → lignes`. Elle cumule par nom d'ingrédient et par unité de base, en passant
par le prorata de `src/domain/use-cases/effective-ingredients.ts#effectiveIngredients` et l'effectif
de créneau de `src/domain/use-cases/effectif-du-repas.ts#effectifDuRepas`.

**Aucune collection Firestore, aucune écriture, aucune règle de sécurité, aucune purge de
rétention** — et surtout aucune désynchronisation possible : une liste stockée devrait être invalidée
quand une recette change, quand un créneau change, quand un convive arrive. Ici la question ne se
pose pas, parce qu'il n'y a rien à invalider.

### 2. À plat, sans catégorie

Les lignes sont triées par nom puis par unité, sans regroupement. **OQ-3** du PRD — taxonomie des
rayons et méthode d'assignation d'un ingrédient à une catégorie — **reste ouverte**, et n'est pas de
ce lot. Le « fallback catégorie Autre » de FR-20 n'a donc pas d'objet aujourd'hui.

### 3. Lecture seule

Pas de cochage, pas de bascule, pas de suppression de ligne. Conséquence directe et voulue : **aucun
état persisté**, donc **rien à remettre à zéro** — ni au démontage, ni au changement de menu, ni au
changement de compte. La rémanence de store qui hante les écrans porteurs d'un constat transitoire
n'a pas de prise ici.

### 4. Tout le menu, pas seulement les jours restants

La liste couvre **tous** les créneaux du menu, y compris ceux dont le jour est passé. Filtrer sur
« ce qui reste » demanderait une horloge dans un écran qui n'en a pas besoin, et se tromperait pour
qui fait ses courses la veille au soir ou le lendemain matin. Le découpage par **menu** suffit déjà à
séparer les semaines, qui était la question posée.

### 5. L'adresse porte la période

`/menu/:dateDebut/courses` désigne le menu **par sa période**, conformément à
[ADR 0006](0006-la-periode-identifie-le-menu.md), et l'écran se lit d'un lien collé ou d'un signet
sans état préalable, conformément à [ADR 0022](0022-la-provenance-vit-dans-l-url.md). Une période qui
ne correspond à aucun menu enregistré rend un constat dédié, pas une liste vide.

Le retour, lui, doit ramener sur **la semaine d'où l'on vient** et non sur le curseur courant du
menu : `src/ui/features/menu/menu-return.ts#retourAuMenuDeLaSemaine` fabrique `/menu?semaine=…`, que
`src/ui/features/menu/menu-return.ts#semaineConsultee` relit pour repositionner le curseur. Ce
paramètre **décrit** — le relire dix fois désigne dix fois la même semaine —, il ne déclenche rien
et il **reste dans l'adresse**, du côté de `?depuis=` et non de `?enregistre` au sens de
l'[ADR 0029](0029-deux-provenances-pour-deux-ecrans-de-menu.md).

### 6. On ne génère pas de menu sans convive

`src/ui/features/menu/menu-slice.ts#NO_CONVIVES` refuse la génération quand le foyer est vide, avec
le message « Ajoute d'abord un convive pour générer un menu. »

**Motif mesuré**, et c'est la liste de courses qui l'a révélé : `src/ui/features/menu/menu-days.ts`
affiche les plats à leur **échelle de référence** quand `foyer.length === 0`, tandis que
`listeDeCourses` écarte les créneaux d'effectif nul et rendait donc une **liste vide**. Un compte
neuf qui ajoutait des recettes puis générait un menu voyait **une semaine de plats d'un côté et
« Rien à acheter » de l'autre** — deux écrans du même menu qui se contredisent, au premier parcours.

Le garde porte sur une absence **constatée** (`src/ui/features/convives/convives-slice.ts#received`),
pas sur un foyer pas encore livré. Refuser pendant le chargement afficherait « Ajoute d'abord un
convive » à quelqu'un qui en a — c'est le même piège que l'on aurait tendu à un écran qui confond
« vide » et « pas encore arrivé ».

## Ce que la décision coûte

**L'usage « acheter le reste en magasin physique » n'est plus servi par l'application.** C'était
l'objet entier de F6 : la liste hors ligne, cochable d'une main au sous-sol du Monoprix, partagée
entre les deux comptes, adressant ce que le brief appelait la troisième charge mentale — « se
souvenir de quoi acheter en semaine ».

C'est un **abandon, pas un report déguisé**. Rien dans le code d'aujourd'hui n'en prépare le retour :
il n'y a ni collection, ni item, ni notion d'état d'une ligne. Le jour où l'usage reviendra, il
reviendra comme une feature neuve, et il devra se poser la question que la présente ADR tranche —
**à quel menu appartient cette ligne ?** —, à laquelle « une liste globale de plus » n'est plus une
réponse acceptable.

Ce qui disparaît avec F6 disparaît en bloc : la bascule bidirectionnelle (FR-21) et son compteur
« X items sur la liste secondaire », la consultation hors ligne (FR-22), le cochage à soft-delete de
24 h et sa résolution de conflit multi-compte (FR-23), le vidage manuel avec confirmation (FR-24).
**OQ-10** — Firestore offline persistence vs CRDT — perd du même coup son sujet.

## Ce qui est ignoré en silence

`listeDeCourses` **ignore sans le dire** un créneau dont la recette est introuvable au catalogue, ou
dont la mise à l'échelle déborde le plafond du compte juste
([ADR 0039](0039-un-seul-plafond-celui-du-compte-juste.md)). Un menu dont toutes les recettes
auraient disparu annoncerait « Rien à acheter ».

C'est une **révocation assumée** : le use-case rendait d'abord la liste des créneaux non comptables,
et l'écran en portait un constat. Le chemin a été **supprimé plutôt que testé**, l'utilisateur ayant
tranché après en avoir vu la conséquence — aucune suppression de recette n'existe dans
l'application, et l'autre chemin demande d'écrire ~10¹² g dans une recette.

La conséquence à connaître est que **le domaine ne porte plus aucun signal d'omission** : rouvrir
demandera de le rétablir, pas seulement de changer un libellé. Le scénario complet, ses références et
son classement vivent dans [#166](https://github.com/yasakura/meal-planner/issues/166).

## Conséquences

- **L'écran attend trois sources, pas une** : les menus enregistrés, le catalogue et le foyer. Tant
  que l'une manque, `src/ui/features/menu/liste-de-courses-view.ts#listeDeCoursesViewOf` rend un
  constat unique pour les trois — indisponible l'emporte sur illisible, qui l'emporte sur en cours de
  chargement —, parce qu'une liste dérivée d'une source incomplète serait **fausse sans le dire**.
  La relance ne rouvre que les sources **effectivement en panne**
  (`src/ui/features/menu/liste-de-courses-relance.ts#coursesRelancees`), et pas les deux autres.
- **Une liste vide reste un état légitime**, distinct de l'attente : un menu dont aucun repas n'a de
  mangeur — `src/domain/use-cases/effectif-du-repas.ts#effectifDuRepas` rend `0`, le créneau est
  écarté — n'apporte rien à acheter. C'est ce que « Rien à acheter » dit, et c'est ce que #166 rend
  menteur le jour où un créneau pourra devenir non comptable pour une autre raison.
- **L'agrégation par nom est insensible à la casse et aux espaces répétés**, et cumule par **unité de
  base** : « 500 g » et « 0,5 kg » du même ingrédient font une ligne, « 2 pièces » en fait une autre.
  Le rendu remonte en grande unité au-delà du seuil, avec deux décimales
  (`src/ui/features/quantites/quantite-affichee.ts#quantiteAffichee` pour l'écriture française).
- **Le lien vers la liste vit sur la consultation d'un menu enregistré**, pas sur le brouillon : il
  n'y a pas d'adresse pour un menu qui n'existe qu'en mémoire, et
  `src/ui/features/menu/liste-de-courses-route.ts#listeDeCoursesHref` prend un menu pour la fabriquer.
- **Le PRD reste en contradiction avec le code sur §4.5 et §4.6** tant qu'il n'est pas amendé. La
  présente ADR est la trace qui fait autorité en attendant.
