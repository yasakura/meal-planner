import { type Firestore, collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';

import { type RecipeRepository } from '../domain/ports/recipe-repository';
import { type Recipe } from '../domain/entities/recipe';
import {
  DEFAULT_ACK_TIMEOUT_MS,
  DEFAULT_READ_TIMEOUT_MS,
  withServerDeadline,
} from './firestore-server-deadline';
import { documentToRecipe, recipeToDocument } from './recipe-mapper';

export type FirestoreRecipeRepositoryOptions = {
  ackTimeoutMs?: number;
  readTimeoutMs?: number;
};

export class FirestoreRecipeRepository implements RecipeRepository {
  private constructor(
    private readonly db: Firestore,
    private readonly ackTimeoutMs: number,
    private readonly readTimeoutMs: number,
  ) {}

  static create(
    db: Firestore,
    options?: FirestoreRecipeRepositoryOptions,
  ): FirestoreRecipeRepository {
    return new FirestoreRecipeRepository(
      db,
      options?.ackTimeoutMs ?? DEFAULT_ACK_TIMEOUT_MS,
      options?.readTimeoutMs ?? DEFAULT_READ_TIMEOUT_MS,
    );
  }

  async save(recipe: Recipe): Promise<void> {
    await withServerDeadline(
      setDoc(doc(this.db, 'recipes', recipe.id), recipeToDocument(recipe)),
      this.ackTimeoutMs,
    );
  }

  async findAll(): Promise<Recipe[]> {
    const snapshot = await withServerDeadline(
      getDocs(collection(this.db, 'recipes')),
      this.readTimeoutMs,
    );
    return snapshot.docs.map((snapshotDoc) => documentToRecipe(snapshotDoc.id, snapshotDoc.data()));
  }

  async findById(id: string): Promise<Recipe | undefined> {
    const snapshot = await withServerDeadline(
      getDoc(doc(this.db, 'recipes', id)),
      this.readTimeoutMs,
    );
    return snapshot.exists() ? documentToRecipe(snapshot.id, snapshot.data()) : undefined;
  }
}
