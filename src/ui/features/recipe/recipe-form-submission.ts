import { validRowsOf, type IngredientRow } from './ingredient-rows';

/**
 * Quand le bouton « Enregistrer » est VERROUILLÉ. Ce qui est partagé entre la création et la
 * modification, c'est le PRÉDICAT DE SAISIE — titre non vide, au moins une ligne valide —, que
 * les deux écrans portaient chacun en clair dans leur `.tsx` : deux expressions jumelles,
 * dupliquées, qu'aucun mutant ne surveillait (Stryker ne mute pas les `.tsx`). Une dérive entre
 * les deux écrans n'aurait été signalée par rien.
 *
 * `locked`, lui, n'est PAS partagé : le verrou est INJECTÉ par l'appelant, et les deux écrans
 * n'y mettent délibérément pas la même chose. La création passe `saving || unconfirmed`
 * (`selectIsCreationLocked`) : rouvrir le bouton sur une écriture non acquittée relancerait la
 * fabrique de cuid, donc un doublon. La modification passe `saving` seul — son écriture est un
 * upsert sur un identifiant conservé, qui ne peut rien dupliquer.
 *
 * Module voisin de `ingredient-rows.ts` plutôt qu'ajout dedans : des trois termes, un seul parle
 * des lignes. Y loger un prédicat qui lit un titre et un statut d'enregistrement ferait mentir un
 * fichier qui se présente comme « la ligne d'ingrédient telle que le formulaire la porte ».
 *
 * Verrou, et non refus : la ligne INCOMPLÈTE, elle, laisse le bouton actif et se fait refuser au
 * clic (`hasIncompleteRow`) — l'écarter d'avance détruirait un ingrédient en silence.
 */
export function isSubmitDisabled(form: {
  locked: boolean;
  title: string;
  rows: IngredientRow[];
}): boolean {
  return form.locked || form.title.trim() === '' || validRowsOf(form.rows).length === 0;
}
