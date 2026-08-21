# ADR 0021 — Naviguer sur l'issue d'une écriture, pas sur l'observation du statut

- **Statut** : en vigueur
- **Date** : 2026-08-18 (`cf4711f`, modification de recette ; défaut d'origine : issue #27)
- **Portée** : `RecipeCreateContainer.tsx`, `RecipeEditContainer.tsx`

## Contexte

Après un enregistrement réussi, l'écran doit partir ailleurs — au catalogue pour la création, au
détail de la recette pour la modification. La forme spontanée est un `useEffect` qui observe
`status === 'success'`. Elle est fausse, et de plusieurs manières à la fois.

## Décision

La navigation est déclenchée par l'**issue de l'action dispatchée** :

```ts
void dispatch(updateRecipe(...)).then((result) => {
  if (updateRecipe.fulfilled.match(result) && monte.current) navigate(...);
});
```

Trois pièges que cette forme évite, chacun rencontré :

1. **Un effet qui observe le statut renavigue au remontage suivant**, avant même que la remise à
   zéro signalée à l'ouverture du formulaire n'ait pu être lue — les effets d'un même commit voient
   tous le statut de leur rendu.
2. **`dispatch()` seul résout aussi bien un `fulfilled` qu'un `rejected`.** Sans le filtre
   `.fulfilled.match`, un échec produirait exactement le même effet qu'un succès : navigation, ou
   champ vidé. C'est un **faux signal de succès**, la classe de défaut que ce projet refuse partout.
3. **`useNavigate` ne se protège pas du démontage.** Son garde interne (`activeRef`) est posé par un
   effet **sans nettoyage** : après le démontage il **reste à `true`**, et la navigation part quand
   même, sans le moindre avertissement. Vérifié dans `react-router` 7.18
   (`useIsomorphicLayoutEffect(() => { activeRef.current = true; })`, aucun retour de nettoyage).

D'où le drapeau `monte` : une promesse **n'est pas démontée avec son composant**, et c'est le seul
lien au cycle de vie dont dispose la suite du `.then`. Si l'utilisateur a quitté le formulaire
entre-temps, l'enregistrement aboutit quand même (rien ne l'annule) — mais **son geste de navigation
prime**.

**Point non évident** : la réaffectation `monte.current = true` **dans** l'effet n'est pas
redondante avec la valeur initiale du `useRef`. **StrictMode rejoue montage/démontage** ; sans elle,
le drapeau resterait à `false` pour toute la vie du formulaire en développement, et la navigation ne
partirait jamais.

## La mesure

Aucune mesure chiffrée. Trois défauts constatés en navigateur et en RTL, et une lecture du code de
`react-router` pour le troisième. Constaté, vérifié par lecture de la dépendance.

## Conséquences

- Sur erreur, **on reste** sur le formulaire pour afficher le constat.
- La modification renvoie au **détail**, pas au catalogue : l'écran d'arrivée montre déjà le
  résultat, une confirmation n'aurait le temps de rien dire. Seule une issue **manquée** a quelque
  chose à annoncer.
- Le formulaire de modification s'initialise **au montage** depuis la recette, sous une `key` portant
  l'identifiant — et jamais par un effet qui recopierait la recette dans un état après coup. C'est ce
  qui garantit qu'aucune frappe de l'utilisateur n'est écrasée par une relecture tardive du dépôt.
- L'effet qui signale l'ouverture du formulaire dépend de `id` : **React Router conserve l'élément
  quand seul le paramètre change**, donc passer d'une recette à l'autre ne démonte rien. Sans cette
  dépendance, la recette serait rechargée et le statut ne le serait pas — le nouveau formulaire
  s'ouvrirait sur le constat d'échec hérité du précédent.
