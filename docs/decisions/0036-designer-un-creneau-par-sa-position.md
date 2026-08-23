# ADR 0036 — Désigner un créneau par sa position, pas par son jour

- **Statut** : en vigueur
- **Date** : 2026-08-23 (branche `iter-51-fr13-choix-manuel`)
- **Portée** : `src/domain/entities/menu.ts`, et tout appelant de FR-12 à FR-15

## Contexte

FR-13 laisse l'utilisateur choisir manuellement une recette pour **un** créneau du menu brouillon.
L'opération vit dans `src/domain/entities/menu.ts#replaceSlotRecipe` et doit donc recevoir une
désignation du créneau visé. FR-12 (régénérer un créneau), FR-14 (ajouter, supprimer, libérer) et
FR-15 (ajuster les convives) prendront la même.

La désignation qui vient à l'esprit — jour + créneau midi/soir — **n'identifie rien**. Deux faits du
modèle s'y opposent, tous deux vérifiés dans le code :

- un `Repas` porte **plusieurs** créneaux (`src/domain/entities/repas.ts#createRepas` reçoit un
  tableau de slots), parce que le foyer cuisine deux plats le même soir — gamelle d'Aurélie, plat de
  Rory ;
- **deux `Repas` de même jour et même créneau sont constructibles** : ni
  `src/domain/entities/menu.ts#createMenu` ni `createRepas` n'imposent d'unicité. Constaté en
  fermant l'issue [#64](https://github.com/yasakura/meal-planner/issues/64).

`src/domain/use-cases/generate-menu.ts#generateMenuUseCase` ne produit aujourd'hui qu'un repas par
couple jour/créneau, avec un slot chacun. C'est une propriété de la **pioche**, pas du modèle, et
FR-14 la fera tomber le jour où l'utilisateur ajoutera un slot.

## Décision

Le créneau se désigne par sa **position** : `src/domain/entities/menu.ts#SlotAddress`, soit
`{ repasIndex, slotIndex }` — rang dans `menu.repas`, puis rang dans `repas.slots`.

Un index de tableau désigne toujours **exactement un élément, ou aucun**. C'est la seule propriété
qui manque au couple jour/créneau, et elle ne dépend d'aucun invariant qu'il faudrait ensuite tenir.

Une adresse qui ne résout pas **lève une erreur** — `Error` nu, comme toutes les validations
d'entités du dépôt, avec le message « Le créneau visé est introuvable dans le menu ». Le cas est
atteignable, puisque l'adresse transitera par l'URL (`0022-la-provenance-vit-dans-l-url.md`) et
qu'une URL se colle. L'alternative — rendre le menu inchangé — produirait un **faux signal de
succès** : l'écran annonce « recette choisie », rien n'a bougé, l'utilisateur perd son geste sans
savoir pourquoi. C'est la classe de défaut que `CLAUDE.md` qualifie de bloquante.

Une seule erreur pour les deux niveaux d'échec, repas absent et slot absent : côté utilisateur,
c'est le même constat.

## Ce que la décision coûte, et qu'on accepte

Une position est valide **relativement à un menu donné**. Un brouillon régénéré (FR-11 écrase le
précédent) réordonne les repas ; une adresse conservée d'avant — URL collée, onglet resté ouvert —
désignera alors **un autre créneau au lieu d'échouer**. Le remplacement réussira, sur la mauvaise
ligne.

C'est le seul défaut connu, et il est assumé pour FR-13 : aucune désignation dépourvue d'identité
persistante ne peut l'éviter.

## Alternatives écartées

**Un `id` sur le `Slot`.** Le remède complet : stable à toute réorganisation, une adresse périmée
échoue au lieu de mentir. Écarté sur son coût, qui déborde très au-delà du domaine — modifier
`src/domain/entities/slot.ts#createSlot`, injecter `IdGenerator` dans `generateMenuUseCase`, étendre
`src/data/menu-mapper.ts#menuToDocument` et sa lecture, et décider du sort des documents Firestore
**déjà écrits**, qui n'ont pas ces ids. Payer quatre couches pour un défaut qui ne se manifeste
qu'avec une adresse périmée n'est pas le bon moment. Le jour où FR-14 rendra les repas jumeaux
courants, c'est cette alternative qu'on rouvre.

**Un index plat unique sur tous les slots du menu.** Tout aussi non ambigu, et plus court à écrire
dans une URL. Écarté parce qu'il oblige à aplatir puis à ré-adresser dans une structure imbriquée,
et surtout parce qu'il **fond les deux échecs en un** : avec la paire, « ce repas n'existe pas » et
« ce repas n'a pas ce créneau » sont deux branches distinctes, donc deux tests distincts. Le format
plat ne sait plus dire lequel des deux s'est produit.

**Jour + créneau + rang du slot.** La forme lisible, celle que l'URL aurait affichée le plus
volontiers. Écartée par le contexte ci-dessus : elle est ambiguë dès que deux repas partagent un
couple jour/créneau, et cette ambiguïté est **silencieuse** — elle frappe le premier repas trouvé,
sans rien signaler.

## Ce que le lot ne fait pas

`replaceSlotRecipe` ne vérifie **pas** que la recette choisie existe au catalogue : cela demanderait
`RecipeRepository`, donc un use case asynchrone. La recette vient d'une liste du catalogue affichée
à l'utilisateur.

Elle ne refuse **pas** une recette déjà employée ailleurs dans la fenêtre : la répétition est un
usage réel du PRD (« pâtes de Rory mardi et mercredi »), signalée par l'UI mais jamais interdite.

Les index négatifs, `NaN` et non-entiers n'ont pas de traitement propre : l'indexation d'un tableau
les rend tous `undefined`, ils tombent dans la branche « introuvable ». L'assainissement d'un
paramètre d'URL appartient à la couche qui le lit.
