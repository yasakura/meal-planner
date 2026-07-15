import { type Firestore, collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';

import { type RecipeRepository } from '../domain/ports/recipe-repository';
import { type Recipe } from '../domain/entities/recipe';
import { documentToRecipe, recipeToDocument } from './recipe-mapper';

export class FirestoreRecipeRepository implements RecipeRepository {
  private constructor(private readonly db: Firestore) {}

  static create(db: Firestore): FirestoreRecipeRepository {
    return new FirestoreRecipeRepository(db);
  }

  async save(recipe: Recipe): Promise<void> {
    await setDoc(doc(this.db, 'recipes', recipe.id), recipeToDocument(recipe));
  }

  async findAll(): Promise<Recipe[]> {
    const snapshot = await getDocs(collection(this.db, 'recipes'));
    return snapshot.docs.map((snapshotDoc) => documentToRecipe(snapshotDoc.id, snapshotDoc.data()));
  }

  async findById(id: string): Promise<Recipe | undefined> {
    const snapshot = await getDoc(doc(this.db, 'recipes', id));
    return snapshot.exists() ? documentToRecipe(snapshot.id, snapshot.data()) : undefined;
  }
}
