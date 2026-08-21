import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type Firestore,
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
  setDoc,
} from 'firebase/firestore';
import { FirestoreRecipeRepository } from './firestore-recipe-repository';
import { recipeToDocument } from './recipe-mapper';
import { RecipeBuilder } from '../domain/test-builders/recipe.builder';
import { isRepositoryUnavailable } from '../domain/errors/repository-unavailable-error';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
  getDocsFromServer: vi.fn(),
  getDoc: vi.fn(),
  getDocFromServer: vi.fn(),
}));

const mockedDoc = vi.mocked(doc);
const mockedSetDoc = vi.mocked(setDoc);
const mockedCollection = vi.mocked(collection);
const mockedGetDocs = vi.mocked(getDocs);
const mockedGetDocsFromServer = vi.mocked(getDocsFromServer);
const mockedGetDoc = vi.mocked(getDoc);
const mockedGetDocFromServer = vi.mocked(getDocFromServer);

function firestoreError(code: string): Error {
  return Object.assign(new Error(`firestore: ${code}`), { code, name: 'FirebaseError' });
}

describe('FirestoreRecipeRepository', () => {
  const db = { marker: 'db-sentinel' } as unknown as Firestore;

  beforeEach(() => {
    mockedDoc.mockReset();
    mockedSetDoc.mockReset();
    mockedCollection.mockReset();
    mockedGetDocs.mockReset();
    mockedGetDocsFromServer.mockReset();
    mockedGetDoc.mockReset();
    mockedGetDocFromServer.mockReset();
  });

  it('save écrit la recette à recipes/{id} avec le document mappé', async () => {
    const docRef = { marker: 'doc-ref-sentinel' };
    mockedDoc.mockReturnValue(docRef as never);
    mockedSetDoc.mockResolvedValue(undefined);
    const recipe = RecipeBuilder.aRecipe().withId('recipe-42').build();
    const repository = FirestoreRecipeRepository.create(db);

    await repository.save(recipe);

    expect(mockedDoc).toHaveBeenCalledWith(db, 'recipes', 'recipe-42');
    expect(mockedSetDoc).toHaveBeenCalledWith(docRef, recipeToDocument(recipe));
  });

  it("save propage l'erreur Firestore sans l'avaler", async () => {
    mockedDoc.mockReturnValue({} as never);
    mockedSetDoc.mockRejectedValue(new Error('permission-denied'));
    const recipe = RecipeBuilder.aRecipe().build();
    const repository = FirestoreRecipeRepository.create(db);

    await expect(repository.save(recipe)).rejects.toThrow('permission-denied');
  });

  it(
    "signale une écriture que le serveur n'a pas acquittée dans la borne d'attente",
    { timeout: 1000 },
    async () => {
      mockedDoc.mockReturnValue({} as never);
      mockedSetDoc.mockReturnValue(new Promise<void>(() => {}));
      const repository = FirestoreRecipeRepository.create(db, { ackTimeoutMs: 10 });

      await expect(repository.save(RecipeBuilder.aRecipe().build())).rejects.toSatisfy(
        isRepositoryUnavailable,
      );
    },
  );

  it("ne laisse aucune borne en suspens une fois l'écriture acquittée", async () => {
    vi.useFakeTimers();
    try {
      mockedDoc.mockReturnValue({} as never);
      mockedSetDoc.mockResolvedValue(undefined);
      const repository = FirestoreRecipeRepository.create(db);

      await repository.save(RecipeBuilder.aRecipe().build());
      await Promise.resolve();

      expect(mockedSetDoc).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("findAll lit la collection 'recipes' et mappe chaque document via documentToRecipe", async () => {
    const collectionRef = { marker: 'collection-ref-sentinel' };
    mockedCollection.mockReturnValue(collectionRef as never);
    const recipeA = RecipeBuilder.aRecipe().withId('recipe-a').withTitle('Tarte').build();
    const recipeB = RecipeBuilder.aRecipe().withId('recipe-b').withTitle('Soupe').build();
    const snapshot = {
      docs: [
        { id: 'recipe-a', data: () => recipeToDocument(recipeA) },
        { id: 'recipe-b', data: () => recipeToDocument(recipeB) },
      ],
    };
    mockedGetDocsFromServer.mockResolvedValue(snapshot as never);
    const repository = FirestoreRecipeRepository.create(db);

    const recipes = await repository.findAll();

    expect(mockedCollection).toHaveBeenCalledWith(db, 'recipes');
    expect(mockedGetDocsFromServer).toHaveBeenCalledWith(collectionRef);
    expect(recipes).toHaveLength(2);
    expect(recipes.map((r) => r.id)).toEqual(['recipe-a', 'recipe-b']);
    expect(recipes.map((r) => r.title)).toEqual(['Tarte', 'Soupe']);
  });

  it("findAll propage l'erreur Firestore sans l'avaler", async () => {
    mockedCollection.mockReturnValue({} as never);
    mockedGetDocsFromServer.mockRejectedValue(new Error('permission-denied'));
    const repository = FirestoreRecipeRepository.create(db);

    await expect(repository.findAll()).rejects.toThrow('permission-denied');
  });

  it('findById lit recipes/{id} et mappe le document via documentToRecipe quand il existe', async () => {
    const docRef = { marker: 'doc-ref-sentinel' };
    mockedDoc.mockReturnValue(docRef as never);
    const recipe = RecipeBuilder.aRecipe().withId('recipe-42').withTitle('Tarte').build();
    const snapshot = {
      exists: () => true,
      id: 'recipe-42',
      data: () => recipeToDocument(recipe),
    };
    mockedGetDocFromServer.mockResolvedValue(snapshot as never);
    const repository = FirestoreRecipeRepository.create(db);

    const found = await repository.findById('recipe-42');

    expect(mockedDoc).toHaveBeenCalledWith(db, 'recipes', 'recipe-42');
    expect(mockedGetDocFromServer).toHaveBeenCalledWith(docRef);
    expect(found?.id).toBe('recipe-42');
    expect(found?.title).toBe('Tarte');
  });

  it("findById retourne undefined quand le document n'existe pas", async () => {
    mockedDoc.mockReturnValue({} as never);
    mockedGetDocFromServer.mockResolvedValue({ exists: () => false } as never);
    const repository = FirestoreRecipeRepository.create(db);

    expect(await repository.findById('inexistant')).toBeUndefined();
  });

  it("findById propage l'erreur Firestore sans l'avaler", async () => {
    mockedDoc.mockReturnValue({} as never);
    mockedGetDocFromServer.mockRejectedValue(new Error('permission-denied'));
    const repository = FirestoreRecipeRepository.create(db);

    await expect(repository.findById('recipe-42')).rejects.toThrow('permission-denied');
  });

  it('findAll interroge le serveur et ne se rabat jamais sur le cache Firestore', async () => {
    const collectionRef = { marker: 'collection-ref-sentinel' };
    mockedCollection.mockReturnValue(collectionRef as never);
    mockedGetDocsFromServer.mockResolvedValue({ docs: [] } as never);
    const repository = FirestoreRecipeRepository.create(db);

    await repository.findAll();

    expect(mockedGetDocsFromServer).toHaveBeenCalledWith(collectionRef);
    expect(mockedGetDocs).not.toHaveBeenCalled();
  });

  it('findAll traduit une lecture impossible faute de réseau en indisponibilité de dépôt', async () => {
    mockedCollection.mockReturnValue({} as never);
    mockedGetDocsFromServer.mockRejectedValue(firestoreError('unavailable'));
    const repository = FirestoreRecipeRepository.create(db);

    await expect(repository.findAll()).rejects.toSatisfy(isRepositoryUnavailable);
  });

  it("findAll ne traduit pas un refus de permission en indisponibilité : l'erreur remonte telle quelle", async () => {
    mockedCollection.mockReturnValue({} as never);
    const refus = firestoreError('permission-denied');
    mockedGetDocsFromServer.mockRejectedValue(refus);
    const repository = FirestoreRecipeRepository.create(db);

    await expect(repository.findAll()).rejects.toBe(refus);
  });

  it('findById interroge le serveur et ne se rabat jamais sur le cache Firestore', async () => {
    const docRef = { marker: 'doc-ref-sentinel' };
    mockedDoc.mockReturnValue(docRef as never);
    mockedGetDocFromServer.mockResolvedValue({ exists: () => false } as never);
    const repository = FirestoreRecipeRepository.create(db);

    await repository.findById('recipe-42');

    expect(mockedGetDocFromServer).toHaveBeenCalledWith(docRef);
    expect(mockedGetDoc).not.toHaveBeenCalled();
  });

  it('findById traduit une lecture impossible faute de réseau en indisponibilité de dépôt', async () => {
    mockedDoc.mockReturnValue({} as never);
    mockedGetDocFromServer.mockRejectedValue(firestoreError('unavailable'));
    const repository = FirestoreRecipeRepository.create(db);

    await expect(repository.findById('recipe-42')).rejects.toSatisfy(isRepositoryUnavailable);
  });

  it("findById ne traduit pas un refus de permission en indisponibilité : l'erreur remonte telle quelle", async () => {
    mockedDoc.mockReturnValue({} as never);
    const refus = firestoreError('permission-denied');
    mockedGetDocFromServer.mockRejectedValue(refus);
    const repository = FirestoreRecipeRepository.create(db);

    await expect(repository.findById('recipe-42')).rejects.toBe(refus);
  });

  it(
    "findAll signale une lecture que le serveur n'a pas rendue dans la borne d'attente",
    { timeout: 1000 },
    async () => {
      mockedCollection.mockReturnValue({} as never);
      mockedGetDocsFromServer.mockReturnValue(new Promise(() => {}) as never);
      const repository = FirestoreRecipeRepository.create(db, { readTimeoutMs: 10 });

      await expect(repository.findAll()).rejects.toSatisfy(isRepositoryUnavailable);
    },
  );

  it(
    "findById signale une lecture que le serveur n'a pas rendue dans la borne d'attente",
    { timeout: 1000 },
    async () => {
      mockedDoc.mockReturnValue({} as never);
      mockedGetDocFromServer.mockReturnValue(new Promise(() => {}) as never);
      const repository = FirestoreRecipeRepository.create(db, { readTimeoutMs: 10 });

      await expect(repository.findById('recipe-42')).rejects.toSatisfy(isRepositoryUnavailable);
    },
  );
});
