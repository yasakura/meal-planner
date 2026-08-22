# ADR 0010 — Le non-garde de `generateMenu.fulfilled` tient à une seule ligne

- **Statut** : en vigueur — **piège, à ne pas casser sans lire cette page**
- **Date** : 2026-08-18 (PR #42, `b70c5e6`)
- **Portée** : `src/ui/features/menu/menu-slice.ts`

## Contexte

Le slice du menu a deux producteurs du champ `recipes` : `generateMenu` et `refreshMenuRecipes`.
Le second est gardé par la mémoire de fraîcheur `latestRecipesRequestId`
([ADR 0009](0009-garde-de-fraicheur-par-requestid.md)) ; **le premier ne l'est pas**, délibérément
— deux générations qui se chevaucheraient se courraient après.

Ce non-garde n'est sûr **que** parce que le chevauchement est inatteignable depuis l'interface. Et
il l'est par **une seule ligne**, située ailleurs dans le fichier : `state.menu = null` dans
`generateMenu.pending`.

## Décision

Garder `generateMenu.fulfilled` **hors** de la mémoire de fraîcheur, et considérer
`state.menu = null` de `generateMenu.pending` comme une **dépendance structurelle**, pas comme un
nettoyage d'affichage.

Cette ligne produit deux effets dont dépend toute la sûreté de l'ensemble :

1. le `condition` de `refreshMenuRecipes` (`getState().menu.menu !== null`) **bloque** : aucune
   relecture ne part pendant une génération, effet de remontage compris ;
2. `MenuContainer` rend l'état `loading` : ni « Générer », ni « Régénérer », ni « Réessayer » ne
   sont à l'écran — **aucune** seconde génération ne peut être lancée.

## La mesure

Constat de revue, PR #42 : « aucun test existant ne rougirait si l'on retirait ce blanchiment ».
**C'était faux à la rédaction, et ça l'est resté.** Retirer `state.menu = null` fait rouge **trois**
tests de `menu-slice.test.ts` (`:133`, `:169`, `:355`), dont le plus ancien précédait cette page
d'un mois. La phrase a été héritée d'un constat de revue sans être rejouée.

Ce qui est vrai est plus étroit, et c'est ce qui compte ici : ces trois tests tiennent la **forme**
— le champ vaut bien `null` après `generateMenu.pending` — et **aucun ne tient la conséquence**,
c'est-à-dire la sûreté du non-garde de `generateMenu.fulfilled` qui en dépend. Ni l'un ni l'autre
des deux effets énumérés plus haut n'a de test : rien ne montre une relecture refusant de partir
**pendant une génération**, rien ne montre l'absence des trois commandes à l'écran en `loading`.
Le blanchiment est donc verrouillé comme valeur, pas comme mécanisme — qui le déplacerait en
gardant `null` dans `pending` garderait les trois tests verts sans avoir rien préservé.

Le défaut n'apparaîtrait qu'en navigateur, sur un réseau lent, sous forme d'un catalogue périmé
revenu par-dessus une génération réussie, avec des créneaux retombés sur « Recette inconnue ».

Le même prédicat est écrit **deux fois** à dessein — dans le `condition` du thunk et dans
`menuOpened` (`state.menu === null`) : qui touche à l'un doit revenir à l'autre.

## Conséquences

- Une évolution d'ergonomie parfaitement plausible — **garder le menu affiché pendant une
  régénération** — fait de `generateMenu.fulfilled` un écrivain concurrent **non gardé**.
- Qui retire ce blanchiment doit, **dans la même passe**, garder `generateMenu.fulfilled` par
  `latestRecipesRequestId`.
- Les `.tsx` n'étant pas mutés ([ADR 0011](0011-les-decisions-vivent-dans-des-fichiers-mutes.md)),
  le second effet — « aucun bouton à l'écran » — n'a **aucun** filet de mutation. Seuls la RTL et
  les scénarios Playwright le tiennent.
