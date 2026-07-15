import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type Firestore, collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { FirestoreRecipeRepository } from './firestore-recipe-repository';
import { recipeToDocument } from './recipe-mapper';
import { RecipeBuilder } from '../domain/test-builders/recipe.builder';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
}));

const mockedDoc = vi.mocked(doc);
const mockedSetDoc = vi.mocked(setDoc);
const mockedCollection = vi.mocked(collection);
const mockedGetDocs = vi.mocked(getDocs);
const mockedGetDoc = vi.mocked(getDoc);

describe('FirestoreRecipeRepository', () => {
  const db = { marker: 'db-sentinel' } as unknown as Firestore;

  beforeEach(() => {
    mockedDoc.mockReset();
    mockedSetDoc.mockReset();
    mockedCollection.mockReset();
    mockedGetDocs.mockReset();
    mockedGetDoc.mockReset();
  });

  it('save écrit la recette à recipes/{id} avec le document mappé', async () => {
    const docRef = { marker: 'doc-ref-sentinel' };
    mockedDoc.mockReturnValue(docRef as never);
    mockedSetDoc.mockResolvedValue(undefined as never);
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
});
