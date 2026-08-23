# ADR 0035 — Une ADR désigne un symbole, pas une ligne

- **Statut** : en vigueur
- **Date** : 2026-08-23 (branche `iter-50-references-adr`)
- **Portée** : `docs/decisions/**`, `src/test/adr-references.test.ts`

## Contexte

Le corpus compte 35 ADR. Vingt endroits y désignaient du code par un **numéro de ligne**, sous trois
formes :

```text
src/config/firebase.ts:23          chemin complet
MenuScreen.tsx:367                 nom de fichier nu
(ligne 97)                         en prose, sans fichier
```

Un numéro de ligne est un chiffre figé dans une prose que rien ne vérifie. C'est la maladie déjà
diagnostiquée pour les commentaires de code (issue
[#76](https://github.com/yasakura/meal-planner/issues/76)) et pour les compteurs du README : la
référence est juste le jour où on l'écrit, et **elle pourrit en silence** — un ajout de dix lignes en
amont suffit, sans que rien ne bronche.

## La mesure

Balayage exhaustif du corpus le 2026-08-23, chaque référence résolue à la main contre le fichier
réel. **Sept des vingt étaient fausses** :

```text
0024  e2e/catalogue.spec.ts:292-293    décalée d'un cran : la paire décrite est en 291-292
0024  e2e/convives.spec.ts:86          le }); de fin de test ; la mesure est en 84
0027  src/config/firebase.ts:23        hors fichier : il fait 18 lignes depuis un requireEnv
0028  src/test/architecture.test.ts:76 le corps de violationsIn ; featureEdges est en 127
0028  idem, second emploi              idem
0028  « (ligne 97) » pour findCycle    testInfraImportsIn ; le visit visé est en 148
0028  MenuScreen.tsx:367               un <path> de SVG ; le composant Body est en 286
```

Deux constats se dégagent, et ce sont eux qui décident.

**Le pourrissement suit la modification, pas l'ancienneté.** `src/test/architecture.test.ts` a grossi
de cinquante lignes en une journée et emporté trois références ; `src/config/firebase.ts` a rétréci
et en a emporté une. Les fichiers stables n'ont rien perdu. Réparer les chiffres, c'est donc réparer
ce qui cassera en premier la prochaine fois.

**Une référence fausse ne se voit pas.** Six des sept pointent sur une ligne qui **existe** : celle
que `0028` donnait pour `featureEdges` désigne du code parfaitement valide, simplement pas celui dont
l'ADR parle. Une seule, celle de `0027`, était sortie du fichier.

## Décision

Une ADR désigne le code par **`chemin/depuis/la/racine.ext#symbole`** :
`src/test/architecture.test.ts#featureEdges`, `src/config/firebase.ts#getFirestore`. Jamais par un
numéro de ligne.

Le symbole n'est pas immortel — un renommage le casse. Mais un renommage est un **geste délibéré**,
que la recherche textuelle rattrape et que le garde ci-dessous transforme en test rouge. Un décalage
de lignes n'est ni délibéré, ni cherché, ni visible.

Quand le symbole choisi peut **porter la conclusion de l'ADR**, c'est lui qu'on prend. `0027` affirme
que le cache est un cache mémoire _parce que_ l'initialisation passe par `getFirestore(app)` ; ancrée
sur `#getFirestore`, l'ADR devient rouge le jour où le dépôt passe à `initializeFirestore` avec
persistance — c'est-à-dire le jour où sa conclusion cesse d'être vraie. Ancrée sur `#db`, l'export
voisin, elle serait restée verte en mentant.

Les vingt références sont converties en une passe. En laisser sept fragiles à côté de treize robustes
garantissait qu'on rouvre le dossier.

**Deux exemptions, et elles ont la même raison** : ce qui est **cité dans un bloc de code** n'est pas
une affirmation sur le code d'aujourd'hui, c'est une **citation figée**. La trace d'échec Vitest de
`0026` porte un numéro de ligne et de colonne, et le garde ne la touche pas : réécrire une sortie
d'outil, ce serait falsifier une mesure. Les légendes de `0028` qui titrent des extraits, elles, sont
bien nos affirmations, et passent au `#symbole` alors même qu'elles vivent dans un bloc.

## Le garde-fou

`src/test/adr-references.test.ts` tient deux assertions sur tout `.md` de `docs/` :

1. **Aucune désignation par numéro de ligne en prose** — hors blocs de code, où une sortie d'outil a
   le droit d'en contenir. C'est le cliquet : sans lui, la prochaine ADR réintroduit la forme.
2. **Tout `fichier.ext#symbole` résout** — le fichier existe depuis la racine, et le symbole y
   apparaît. Celle-là scanne **aussi** les blocs de code : la forme `#symbole` est de nous, donc elle
   est de nous partout.

**Un garde posé sur les numéros de ligne aurait été presque inutile**, et c'est l'argument décisif
contre le remède « corriger les chiffres, puis outiller » : la seule chose vérifiable sur un numéro
est que le fichier soit assez long. Sur les sept références fausses mesurées, il en aurait attrapé
**une**. Le garde sur les symboles les attrape **toutes les sept**, parce qu'un symbole est une
affirmation falsifiable là qu'un entier n'en est pas une.

Confronté à son introduction, sur le corpus réel : la première assertion a nommé les seize références
de prose avant conversion ; puis, corpus converti, un `#featureGraph` posé exprès, un numéro de ligne
réintroduit et un chemin déplacé en `firebase-config.ts` ont chacun rendu le rouge attendu, nommant
la référence fautive. Trois **gages permanents** rejouent ces cas sur un corpus synthétique, y
compris l'exemption de bloc de code — une exemption est une affirmation, et elle se gage comme le
reste.

## Ce que le garde ne voit pas

- **Un symbole qui reste pendant que la conclusion change.** `0028` dit `createRecipe` à complexité
  10 ; si elle tombe à 8, la référence résout toujours. Le garde tient la **désignation**, pas le
  **chiffre**. Il n'y a pas de remède mécanique à cela — un chiffre reste un chiffre.
- **Les références sans symbole.** Une mention nue comme `` `store.ts` `` n'est pas vérifiée : le
  corpus en compte environ deux cents, dont des chemins étrangers au dépôt
  (`node_modules/typescript/lib/lib.dom.d.ts`, `Rules/External.js` d'un outil PHP). Les couvrir
  demanderait une liste d'exceptions plus longue que le garde. Elles ne portent aucun numéro : elles
  ne peuvent pas dériver en silence, seulement disparaître.
- **Le contenu cité dans un bloc de code**, qui est une copie et vieillit comme telle.

## Alternative écartée

**Corriger les trois numéros repérés à la main, et s'arrêter là.** Écartée par la mesure : le
balayage manuel avait cherché la forme `src/…:NN` et trouvé trois références fausses ; le balayage
exhaustif, qui couvre aussi `e2e/…`, les noms de fichiers nus et la prose « (ligne 97) », en a trouvé
**sept**. Un remède qui dépend d'une relecture humaine rate déjà plus de la moitié des cas le jour où
on le prend au sérieux.
