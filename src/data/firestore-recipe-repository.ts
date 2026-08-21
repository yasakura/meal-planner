import {
  type Firestore,
  collection,
  doc,
  getDocFromServer,
  getDocsFromServer,
  setDoc,
} from 'firebase/firestore';

import { type RecipeRepository } from '../domain/ports/recipe-repository';
import { type Recipe } from '../domain/entities/recipe';
import { DEFAULT_ACK_TIMEOUT_MS, withAckDeadline } from './firestore-ack-deadline';
import { asDomainFailure } from './firestore-failure';
import { documentToRecipe, recipeToDocument } from './recipe-mapper';

export type FirestoreRecipeRepositoryOptions = {
  ackTimeoutMs?: number;
};

export class FirestoreRecipeRepository implements RecipeRepository {
  private constructor(
    private readonly db: Firestore,
    private readonly ackTimeoutMs: number,
  ) {}

  static create(
    db: Firestore,
    options?: FirestoreRecipeRepositoryOptions,
  ): FirestoreRecipeRepository {
    return new FirestoreRecipeRepository(db, options?.ackTimeoutMs ?? DEFAULT_ACK_TIMEOUT_MS);
  }

  async save(recipe: Recipe): Promise<void> {
    await withAckDeadline(
      setDoc(doc(this.db, 'recipes', recipe.id), recipeToDocument(recipe)),
      this.ackTimeoutMs,
    );
  }

  async findAll(): Promise<Recipe[]> {
    let snapshot;
    try {
      snapshot = await getDocsFromServer(collection(this.db, 'recipes'));
    } catch (error) {
      throw asDomainFailure(error);
    }
    return snapshot.docs.map((snapshotDoc) => documentToRecipe(snapshotDoc.id, snapshotDoc.data()));
  }

  async findById(id: string): Promise<Recipe | undefined> {
    let snapshot;
    try {
      snapshot = await getDocFromServer(doc(this.db, 'recipes', id));
    } catch (error) {
      throw asDomainFailure(error);
    }
    return snapshot.exists() ? documentToRecipe(snapshot.id, snapshot.data()) : undefined;
  }
}
