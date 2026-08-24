import {
  type Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';

import { type RecipeRepository } from '../domain/ports/recipe-repository';
import { type WriteRejectionReporter } from '../domain/ports/write-rejection-reporter';
import { type Unsubscribe } from '../domain/ports/unsubscribe';
import { asDomainFailure } from './firestore-failure';
import { acceptedLocally } from './firestore-local-acceptance';
import { type Recipe } from '../domain/entities/recipe';
import { DEFAULT_READ_TIMEOUT_MS, withServerDeadline } from './firestore-server-deadline';
import { documentToRecipe, recipeToDocument } from './recipe-mapper';

export type FirestoreRecipeRepositoryOptions = {
  readTimeoutMs?: number;
  onWriteRejected?: WriteRejectionReporter;
};

export class FirestoreRecipeRepository implements RecipeRepository {
  private constructor(
    private readonly db: Firestore,
    private readonly readTimeoutMs: number,
    private readonly onWriteRejected: WriteRejectionReporter | undefined,
  ) {}

  static create(
    db: Firestore,
    options?: FirestoreRecipeRepositoryOptions,
  ): FirestoreRecipeRepository {
    return new FirestoreRecipeRepository(
      db,
      options?.readTimeoutMs ?? DEFAULT_READ_TIMEOUT_MS,
      options?.onWriteRejected,
    );
  }

  save(recipe: Recipe): Promise<void> {
    return acceptedLocally(
      setDoc(doc(this.db, 'recipes', recipe.id), recipeToDocument(recipe)),
      this.onWriteRejected,
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

  observeAll(
    listener: (recipes: Recipe[]) => void,
    onError: (error: unknown) => void,
  ): Unsubscribe {
    return onSnapshot(
      collection(this.db, 'recipes'),
      (snapshot) => {
        listener(
          snapshot.docs.map((snapshotDoc) => documentToRecipe(snapshotDoc.id, snapshotDoc.data())),
        );
      },
      (error) => {
        onError(asDomainFailure(error));
      },
    );
  }
}
