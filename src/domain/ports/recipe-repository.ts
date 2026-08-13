import { type Recipe } from '../entities/recipe';

export interface RecipeRepository {
  save(recipe: Recipe): Promise<void>;
  /**
   * Retourne TOUTES les recettes, dans un ordre **non garanti** : l'adapter Firestore lit
   * la collection sans `orderBy` et restitue donc l'ordre des identifiants de documents.
   * L'ordre d'affichage est décidé par `listRecipesUseCase` (alphabétique par titre).
   */
  findAll(): Promise<Recipe[]>;
  /** `undefined` quand la recette n'existe pas — c'est une absence, pas une panne. */
  findById(id: string): Promise<Recipe | undefined>;
}

/**
 * CONTRAT DE REJET, commun aux trois méthodes.
 *
 * Une panne d'infrastructure est signalée par un `RepositoryUnavailableError`
 * (`domain/errors/`), jamais par une erreur de SDK laissée telle quelle : l'UI distingue
 * « aucune connexion » de « impossible de charger », et les deux n'appellent pas la même
 * action de l'utilisateur. Tout adapter, y compris un test-double, doit s'y conformer —
 * un double muet sur cette distinction rendrait vert un chemin que le vrai adapter n'a
 * jamais eu.
 *
 * Côté lecture, l'adapter Firestore impose la source SERVEUR (`getDocsFromServer` /
 * `getDocFromServer`). Les variantes à repli cache mentent hors ligne : elles rendent un
 * snapshot vide sans rejeter, et l'app affichait alors un catalogue vide inventé.
 */
