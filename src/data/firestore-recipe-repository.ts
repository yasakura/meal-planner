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
    // Bornée : hors ligne, `setDoc` ne rejette pas, il met l'écriture en file locale et
    // n'acquitte qu'au serveur — la promesse ne se règle jamais. Sans borne, l'écran resterait
    // figé sur « enregistrement en cours », sans jamais rien dire.
    await withAckDeadline(
      setDoc(doc(this.db, 'recipes', recipe.id), recipeToDocument(recipe)),
      this.ackTimeoutMs,
    );
  }

  async findAll(): Promise<Recipe[]> {
    // `getDocsFromServer` et non `getDocs` : hors ligne, `getDocs` ne rejette pas, il sert
    // le cache et renvoie un snapshot VIDE. L'écran d'accueil annonçait alors « Aucune
    // recette » à quelqu'un qui en a des dizaines. On veut la vérité du serveur, ou l'aveu
    // qu'on ne l'a pas.
    // Rien n'est sacrifié en ligne : mesuré sur la vraie base, `getDocs` interroge DÉJÀ le
    // serveur à chaque appel (`fromCache=false`, médiane 63 ms) et la lecture serveur est
    // même plus rapide et plus régulière (31 ms). Il n'y a aucun repli cache à perdre.
    let snapshot;
    try {
      snapshot = await getDocsFromServer(collection(this.db, 'recipes'));
    } catch (error) {
      throw asDomainFailure(error);
    }
    return snapshot.docs.map((snapshotDoc) => documentToRecipe(snapshotDoc.id, snapshotDoc.data()));
  }

  async findById(id: string): Promise<Recipe | undefined> {
    // Même raison que `findAll`, conséquence plus grave : hors ligne, `getDoc` sert le cache
    // et rend un snapshot dont `exists()` est faux. L'écran affirmait « Recette introuvable »
    // — l'inexistence d'une recette qu'il n'avait simplement pas pu lire.
    let snapshot;
    try {
      snapshot = await getDocFromServer(doc(this.db, 'recipes', id));
    } catch (error) {
      throw asDomainFailure(error);
    }
    return snapshot.exists() ? documentToRecipe(snapshot.id, snapshot.data()) : undefined;
  }
}
