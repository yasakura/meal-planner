import { validRowsOf, type IngredientRow } from './ingredient-rows';

/**
 * Quand le bouton « Enregistrer » est VERROUILLÉ. La même décision pour la création et pour la
 * modification, qui la portaient chacune en clair dans leur `.tsx` — deux expressions jumelles,
 * dupliquées, qu'aucun mutant ne surveillait (Stryker ne mute pas les `.tsx`). Une dérive entre
 * les deux écrans n'aurait été signalée par rien.
 *
 * Module voisin de `ingredient-rows.ts` plutôt qu'ajout dedans : des trois termes, un seul parle
 * des lignes. Y loger un prédicat qui lit un titre et un statut d'enregistrement ferait mentir un
 * fichier qui se présente comme « la ligne d'ingrédient telle que le formulaire la porte ».
 *
 * Verrou, et non refus : la ligne INCOMPLÈTE, elle, laisse le bouton actif et se fait refuser au
 * clic (`hasIncompleteRow`) — l'écarter d'avance détruirait un ingrédient en silence.
 */
export function isSubmitDisabled(form: {
  saving: boolean;
  title: string;
  rows: IngredientRow[];
}): boolean {
  return form.saving || form.title.trim() === '' || validRowsOf(form.rows).length === 0;
}
