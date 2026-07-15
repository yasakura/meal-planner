import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type Firestore, collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { FirestoreRecipeRepository } from './firestore-recipe-repository';
import { recipeToDocument } from './recipe-mapper';
import { RecipeBuilder } from '../domain/test-builders/recipe.builder';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
}));

const mockedDoc = vi.mocked(doc);
const mockedSetDoc = vi.mocked(setDoc);
const mockedCollection = vi.mocked(collection);
const mockedGetDocs = vi.mocked(getDocs);

describe('FirestoreRecipeRepository', () => {
  const db = { marker: 'db-sentinel' } as unknown as Firestore;

  beforeEach(() => {
    mockedDoc.mockReset();
    mockedSetDoc.mockReset();
    mockedCollection.mockReset();
    mockedGetDocs.mockReset();
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
});
