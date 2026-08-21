import { describe, it, expect } from 'vitest';

import { createCalendarDate } from '../../domain/entities/calendar-date';
import { createMenu } from '../../domain/entities/menu';
import { createRepas } from '../../domain/entities/repas';
import { createSlot } from '../../domain/entities/slot';
import { IngredientBuilder } from '../../domain/test-builders/ingredient.builder';
import { RecipeBuilder } from '../../domain/test-builders/recipe.builder';
import { loadCatalogue, selectCatalogue } from '../features/catalogue/catalogue-slice';
import { addConvive, loadConvives, selectConvives } from '../features/convives/convives-slice';
import {
  loadRecipeDetail,
  selectRecipeDetail,
} from '../features/recipe-detail/recipe-detail-slice';
import { generateMenu, loadSavedMenus, saveMenu, selectMenu } from '../features/menu/menu-slice';
import { createRecipe } from '../features/recipe/recipe-slice';
import { updateRecipe } from '../features/recipe/recipe-edit-slice';
import { createTestStore } from './create-test-store';

describe('createTestStore', () => {
  it('câble les use-cases convives sur un même repository : un convive ajouté est retrouvé au rechargement', async () => {
    const store = createTestStore();

    await store.dispatch(addConvive({ name: 'Rory' }));
    await store.dispatch(loadConvives());

    expect(selectConvives(store.getState()).convives.map((convive) => convive.name)).toEqual([
      'Rory',
    ]);
  });

  it('câble browseMenus et saveMenu sur un même repository : un menu enregistré est retrouvé à la relecture', async () => {
    const menu = createMenu({
      dateDebut: createCalendarDate({ year: 2026, month: 8, day: 24 }),
      repas: [createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'r1' })] })],
    });
    const store = createTestStore({
      generateMenu: async () => menu,
      listRecipes: async () => [RecipeBuilder.aRecipe().withId('r1').build()],
    });

    await store.dispatch(generateMenu(7));
    await store.dispatch(saveMenu());
    await store.dispatch(loadSavedMenus());

    expect(selectMenu(store.getState()).menus).toEqual([menu]);
  });

  it('câble les use-cases recettes sur un même repository : une recette modifiée est relue à jour', async () => {
    const store = createTestStore();

    await store.dispatch(
      updateRecipe({
        id: 'r-1',
        title: 'Gratin dauphinois',
        ingredients: [IngredientBuilder.anIngredient().build()],
        convivesReference: 6,
      }),
    );
    await store.dispatch(loadRecipeDetail('r-1'));

    expect(selectRecipeDetail(store.getState()).recipe?.title).toBe('Gratin dauphinois');
  });

  it('câble les use-cases recettes sur un même repository : une recette créée apparaît dans le catalogue', async () => {
    const store = createTestStore();

    await store.dispatch(
      createRecipe({
        title: 'Tarte tatin',
        ingredients: [IngredientBuilder.anIngredient().build()],
      }),
    );
    await store.dispatch(loadCatalogue());

    expect(selectCatalogue(store.getState()).recipes.map((recipe) => recipe.title)).toEqual([
      'Tarte tatin',
    ]);
  });
});
