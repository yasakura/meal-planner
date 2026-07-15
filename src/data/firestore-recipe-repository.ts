import { type Firestore, doc, setDoc } from 'firebase/firestore';

import { type RecipeRepository } from '../domain/ports/recipe-repository';
import { type Recipe } from '../domain/entities/recipe';
import { recipeToDocument } from './recipe-mapper';

export class FirestoreRecipeRepository implements RecipeRepository {
  private constructor(private readonly db: Firestore) {}

  static create(db: Firestore): FirestoreRecipeRepository {
    return new FirestoreRecipeRepository(db);
  }

  async save(recipe: Recipe): Promise<void> {
    await setDoc(doc(this.db, 'recipes', recipe.id), recipeToDocument(recipe));
  }
}
