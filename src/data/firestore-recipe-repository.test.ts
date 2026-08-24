import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type Firestore,
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import { FirestoreRecipeRepository } from './firestore-recipe-repository';
import { type Recipe } from '../domain/entities/recipe';
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
  onSnapshot: vi.fn(),
}));

const mockedDoc = vi.mocked(doc);
const mockedSetDoc = vi.mocked(setDoc);
const mockedCollection = vi.mocked(collection);
const mockedGetDocs = vi.mocked(getDocs);
const mockedGetDocsFromServer = vi.mocked(getDocsFromServer);
const mockedGetDoc = vi.mocked(getDoc);
const mockedGetDocFromServer = vi.mocked(getDocFromServer);
const mockedOnSnapshot = vi.mocked(onSnapshot);

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
    mockedGetDocs.mockResolvedValue(snapshot as never);
    const repository = FirestoreRecipeRepository.create(db);

    const recipes = await repository.findAll();

    expect(mockedCollection).toHaveBeenCalledWith(db, 'recipes');
    expect(mockedGetDocs).toHaveBeenCalledWith(collectionRef);
    expect(recipes).toHaveLength(2);
    expect(recipes.map((r) => r.id)).toEqual(['recipe-a', 'recipe-b']);
    expect(recipes.map((r) => r.title)).toEqual(['Tarte', 'Soupe']);
  });

  it("findAll propage l'erreur Firestore sans l'avaler", async () => {
    mockedCollection.mockReturnValue({} as never);
    mockedGetDocs.mockRejectedValue(new Error('permission-denied'));
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
    mockedGetDoc.mockResolvedValue(snapshot as never);
    const repository = FirestoreRecipeRepository.create(db);

    const found = await repository.findById('recipe-42');

    expect(mockedDoc).toHaveBeenCalledWith(db, 'recipes', 'recipe-42');
    expect(mockedGetDoc).toHaveBeenCalledWith(docRef);
    expect(found?.id).toBe('recipe-42');
    expect(found?.title).toBe('Tarte');
  });

  it("findById retourne undefined quand le document n'existe pas", async () => {
    mockedDoc.mockReturnValue({} as never);
    mockedGetDoc.mockResolvedValue({ exists: () => false } as never);
    const repository = FirestoreRecipeRepository.create(db);

    expect(await repository.findById('inexistant')).toBeUndefined();
  });

  it("findById propage l'erreur Firestore sans l'avaler", async () => {
    mockedDoc.mockReturnValue({} as never);
    mockedGetDoc.mockRejectedValue(new Error('permission-denied'));
    const repository = FirestoreRecipeRepository.create(db);

    await expect(repository.findById('recipe-42')).rejects.toThrow('permission-denied');
  });

  it("findAll accepte le repli sur le cache Firestore, et n'exige jamais le serveur", async () => {
    const collectionRef = { marker: 'collection-ref-sentinel' };
    mockedCollection.mockReturnValue(collectionRef as never);
    mockedGetDocs.mockResolvedValue({ docs: [] } as never);
    mockedGetDocsFromServer.mockResolvedValue({ docs: [] } as never);
    const repository = FirestoreRecipeRepository.create(db);

    await repository.findAll();

    expect(mockedGetDocs).toHaveBeenCalledWith(collectionRef);
    expect(mockedGetDocsFromServer).not.toHaveBeenCalled();
  });

  it('findAll traduit une lecture impossible faute de réseau en indisponibilité de dépôt', async () => {
    mockedCollection.mockReturnValue({} as never);
    mockedGetDocs.mockRejectedValue(firestoreError('unavailable'));
    const repository = FirestoreRecipeRepository.create(db);

    await expect(repository.findAll()).rejects.toSatisfy(isRepositoryUnavailable);
  });

  it("findAll ne traduit pas un refus de permission en indisponibilité : l'erreur remonte telle quelle", async () => {
    mockedCollection.mockReturnValue({} as never);
    const refus = firestoreError('permission-denied');
    mockedGetDocs.mockRejectedValue(refus);
    const repository = FirestoreRecipeRepository.create(db);

    await expect(repository.findAll()).rejects.toBe(refus);
  });

  it("findById accepte le repli sur le cache Firestore, et n'exige jamais le serveur", async () => {
    const docRef = { marker: 'doc-ref-sentinel' };
    mockedDoc.mockReturnValue(docRef as never);
    mockedGetDoc.mockResolvedValue({ exists: () => false } as never);
    mockedGetDocFromServer.mockResolvedValue({ exists: () => false } as never);
    const repository = FirestoreRecipeRepository.create(db);

    await repository.findById('recipe-42');

    expect(mockedGetDoc).toHaveBeenCalledWith(docRef);
    expect(mockedGetDocFromServer).not.toHaveBeenCalled();
  });

  it('findById traduit une lecture impossible faute de réseau en indisponibilité de dépôt', async () => {
    mockedDoc.mockReturnValue({} as never);
    mockedGetDoc.mockRejectedValue(firestoreError('unavailable'));
    const repository = FirestoreRecipeRepository.create(db);

    await expect(repository.findById('recipe-42')).rejects.toSatisfy(isRepositoryUnavailable);
  });

  it("findById ne traduit pas un refus de permission en indisponibilité : l'erreur remonte telle quelle", async () => {
    mockedDoc.mockReturnValue({} as never);
    const refus = firestoreError('permission-denied');
    mockedGetDoc.mockRejectedValue(refus);
    const repository = FirestoreRecipeRepository.create(db);

    await expect(repository.findById('recipe-42')).rejects.toBe(refus);
  });

  it(
    "findAll signale une lecture que le serveur n'a pas rendue dans la borne d'attente",
    { timeout: 1000 },
    async () => {
      mockedCollection.mockReturnValue({} as never);
      mockedGetDocs.mockReturnValue(new Promise(() => {}) as never);
      const repository = FirestoreRecipeRepository.create(db, { readTimeoutMs: 10 });

      await expect(repository.findAll()).rejects.toSatisfy(isRepositoryUnavailable);
    },
  );

  it(
    "findById signale une lecture que le serveur n'a pas rendue dans la borne d'attente",
    { timeout: 1000 },
    async () => {
      mockedDoc.mockReturnValue({} as never);
      mockedGetDoc.mockReturnValue(new Promise(() => {}) as never);
      const repository = FirestoreRecipeRepository.create(db, { readTimeoutMs: 10 });

      await expect(repository.findById('recipe-42')).rejects.toSatisfy(isRepositoryUnavailable);
    },
  );

  it(
    "save rend la main dès que Firestore a pris l'écriture, sans attendre l'acquittement du serveur",
    { timeout: 1000 },
    async () => {
      mockedDoc.mockReturnValue({} as never);
      mockedSetDoc.mockReturnValue(new Promise<void>(() => {}));
      const repository = FirestoreRecipeRepository.create(db, { onWriteRejected: vi.fn() });

      await expect(repository.save(RecipeBuilder.aRecipe().build())).resolves.toBeUndefined();
    },
  );

  it(
    'un refus serveur arrivé après coup ne reprend pas la main : il part au constat global',
    { timeout: 1000 },
    async () => {
      mockedDoc.mockReturnValue({} as never);
      let refuser: (raison: unknown) => void = () => {};
      mockedSetDoc.mockReturnValue(
        new Promise<void>((_resolve, reject) => {
          refuser = reject;
        }),
      );
      const onWriteRejected = vi.fn();
      const repository = FirestoreRecipeRepository.create(db, { onWriteRejected });

      await expect(repository.save(RecipeBuilder.aRecipe().build())).resolves.toBeUndefined();
      refuser(firestoreError('permission-denied'));

      await vi.waitFor(() => {
        expect(onWriteRejected).toHaveBeenCalledTimes(1);
      });
    },
  );
});

type ObservedSnapshot = { docs: { id: string; data: () => unknown }[] };

function documentDe(recipe: Recipe): { id: string; data: () => unknown } {
  return { id: recipe.id, data: () => recipeToDocument(recipe) };
}

function abonnementCourant(): {
  reference: unknown;
  emettre: (snapshot: ObservedSnapshot) => void;
  echouer: (error: unknown) => void;
} {
  const [reference, emettre, echouer] = mockedOnSnapshot.mock.calls[0] as unknown as [
    unknown,
    (snapshot: ObservedSnapshot) => void,
    (error: unknown) => void,
  ];
  return { reference, emettre, echouer };
}

describe("FirestoreRecipeRepository — observation de la collection 'recipes'", () => {
  const db = { marker: 'db-sentinel' } as unknown as Firestore;
  const gratin = RecipeBuilder.aRecipe().withId('recipe-a').withTitle('Gratin').build();
  const curry = RecipeBuilder.aRecipe().withId('recipe-b').withTitle('Curry').build();

  beforeEach(() => {
    mockedCollection.mockReset();
    mockedOnSnapshot.mockReset();
    mockedOnSnapshot.mockReturnValue(vi.fn() as never);
  });

  it("observeAll s'abonne à la collection 'recipes' et livre chaque instantané mappé, à chaque émission", () => {
    const collectionRef = { marker: 'collection-ref-sentinel' };
    mockedCollection.mockReturnValue(collectionRef as never);
    const listener = vi.fn();

    FirestoreRecipeRepository.create(db).observeAll(listener, vi.fn());
    const { reference, emettre } = abonnementCourant();
    emettre({ docs: [documentDe(gratin)] });
    emettre({ docs: [documentDe(gratin), documentDe(curry)] });

    expect(mockedCollection).toHaveBeenCalledWith(db, 'recipes');
    expect(reference).toBe(collectionRef);
    expect(listener).toHaveBeenNthCalledWith(1, [gratin]);
    expect(listener).toHaveBeenNthCalledWith(2, [gratin, curry]);
  });

  it('observeAll traduit une écoute impossible faute de réseau en indisponibilité de dépôt', () => {
    mockedCollection.mockReturnValue({} as never);
    const echecs: unknown[] = [];

    FirestoreRecipeRepository.create(db).observeAll(vi.fn(), (error) => echecs.push(error));
    abonnementCourant().echouer(firestoreError('unavailable'));

    expect(echecs).toHaveLength(1);
    expect(echecs[0]).toSatisfy(isRepositoryUnavailable);
  });

  it("observeAll ne traduit pas un refus de permission en indisponibilité : l'erreur remonte telle quelle", () => {
    mockedCollection.mockReturnValue({} as never);
    const refus = firestoreError('permission-denied');
    const echecs: unknown[] = [];

    FirestoreRecipeRepository.create(db).observeAll(vi.fn(), (error) => echecs.push(error));
    abonnementCourant().echouer(refus);

    expect(echecs).toEqual([refus]);
  });

  it('observeAll rend le désabonnement Firestore, et ne le déclenche pas de lui-même', () => {
    mockedCollection.mockReturnValue({} as never);
    const desabonnement = vi.fn();
    mockedOnSnapshot.mockReturnValue(desabonnement as never);

    const stop = FirestoreRecipeRepository.create(db).observeAll(vi.fn(), vi.fn());

    expect(desabonnement).not.toHaveBeenCalled();
    stop();
    expect(desabonnement).toHaveBeenCalledTimes(1);
  });

  it("observeAll ne pose aucune borne d'attente : un abonnement muet ne devient jamais une indisponibilité", () => {
    vi.useFakeTimers();
    try {
      mockedCollection.mockReturnValue({} as never);
      const onError = vi.fn();

      FirestoreRecipeRepository.create(db, { readTimeoutMs: 10 }).observeAll(vi.fn(), onError);
      vi.advanceTimersByTime(60_000);

      expect(vi.getTimerCount()).toBe(0);
      expect(onError).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
