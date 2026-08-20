import { createRecipe, type Recipe } from '../entities/recipe';
import { type Ingredient } from '../entities/ingredient';
import { type RecipeRepository } from '../ports/recipe-repository';

export type UpdateRecipeInput = {
  id: string;
  title: string;
  ingredients: Ingredient[];
  convivesReference?: number;
  instructions?: string;
};

/**
 * Modifier une recette existante.
 *
 * L'identifiant est CONSERVÉ : c'est la même recette, pas une nouvelle. Ni ce use-case ni
 * `createRecipeUseCase` ne dépendent d'un `IdGenerator` — la création reçoit elle aussi son
 * identifiant, posé à l'ouverture du formulaire par `newRecipeIdUseCase`. Les deux ne se
 * distinguent donc plus que par leur INTENTION, et c'est elle que l'écran choisit.
 *
 * La modification REMPLACE intégralement le contenu, elle ne le fusionne pas : ce que le
 * formulaire n'envoie plus disparaît. C'est le comportement naturel de `save`, qui est un
 * upsert (`setDoc` avec identifiant explicite côté Firestore), et il n'y a donc rien à écrire
 * pour l'obtenir.
 *
 * Les invariants — titre non vide, au moins un ingrédient, personnes entier ≥ 1, préparation
 * vidée retirée plutôt qu'enregistrée vide — sont ceux de l'entité, réutilisés tels quels : on
 * ne peut pas rendre invalide par modification une recette qui était valide. `createRecipe`
 * lève AVANT le `save`, donc rien d'invalide n'atteint jamais le dépôt.
 *
 * Aucune vérification d'existence : l'application ne supprime aucune recette, le cas est donc
 * inatteignable et un garde que rien n'exige serait du code mort. Un identifiant qui ne désigne
 * rien est arrêté à l'ÉCRAN, qui affiche « Recette introuvable » au lieu d'un formulaire.
 */
export function updateRecipeUseCase(deps: {
  recipeRepository: RecipeRepository;
}): (input: UpdateRecipeInput) => Promise<Recipe> {
  return async (input) => {
    const recipe = createRecipe(input);
    await deps.recipeRepository.save(recipe);
    return recipe;
  };
}

export type UpdateRecipe = ReturnType<typeof updateRecipeUseCase>;
