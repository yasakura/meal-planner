# ADR 0023 — L'élision française : se tromper sur les h aspirés, sciemment

- **Statut** : caduque depuis le 2026-08-24 — son objet a disparu avec l'état `unconfirmed`
  ([ADR 0038](0038-une-ecriture-acceptee-localement-est-reussie.md)) : plus aucun constat ne nomme
  la personne concernée, `french-elision.ts` n'avait plus d'appelant et a été supprimé. La décision
  n'est pas remplacée, elle n'a plus de sujet ; elle est conservée pour qui rouvrirait la question.
- **Date** : 2026-08-12 (`bbc9f0f`), étendue aux constats de renommage et de retrait le 2026-08-14
- **Portée** : plus aucune — le module a été supprimé le 2026-08-24

## Contexte

Les constats du foyer nomment la personne concernée : « le renommage **d'Aurélie** n'a pas pu être
confirmé », « le retrait **de Rory** ». Le français impose l'élision devant voyelle, et devant un
**h muet** — mais pas devant un **h aspiré**.

Or **aucun caractère ne distingue les deux**. « Henri » prend l'élision, « Hakim » non, et rien dans
la chaîne ne le dit. Trancher correctement exigerait un **dictionnaire des h aspirés**, pas une
heuristique.

## Décision

Élider devant **voyelle ET devant h**, sans exception. C'est juste sur les h muets (« d'Henri »,
« d'Hugo ») et **fautif** sur les h aspirés, qui ne sont pas marginaux dans un foyer français :
Hakim, Hamza, Hicham, Halima, Hind rendront « d'Hicham » là où « de Hicham » est correct.

Le choix est donc de **se tromper sur une famille de prénoms plutôt que sur l'autre**, pas de bien
faire dans tous les cas. L'alternative — embarquer un dictionnaire — a été écartée : coût et
maintenance sans commune mesure avec l'enjeu (un constat transitoire), pour une liste qui resterait
de toute façon incomplète.

Le **« y » n'est pas élidé** : son usage est partagé (« d'Yves » mais « de Yolande »), aucune règle
ne tranche, et l'absence d'élision est la forme la moins souvent fautive.

## La mesure

Aucune mesure : c'est une décision linguistique arbitrée, pas un résultat d'expérience. Les prénoms
cités sont des exemples de la famille sur laquelle la règle se trompe, pas un relevé d'usage.

## Conséquences

- Le prénom est **trimé une seule fois**, et le résultat sert à la fois à décider et à afficher : le
  slice mémorise l'argument brut de la soumission, donc un espace de tête déciderait « de » au lieu
  de « d' » **tout en recrachant la saisie parasite** dans le constat.
- La normalisation **NFD** décompose « É » en « E » + accent combinant, et le caractère de base vient
  **en premier** : lire la première unité suffit, sans avoir à retirer les diacritiques. Ajouter un
  retrait de diacritiques après cette normalisation serait du code mort — rien ne l'emprunterait.
- La casse ne change rien à la grammaire : la comparaison est faite sur la forme normalisée en
  minuscules.
- Si un jour un prénom à h aspiré devait être traité correctement, c'est une **table de prénoms**
  qu'il faudrait, pas une règle supplémentaire — et cette ADR passerait à « remplacée ».
