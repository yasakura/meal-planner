import { describe, it, expect } from 'vitest';

import { createCalendarDate } from '../domain/entities/calendar-date';
import { createMenu } from '../domain/entities/menu';
import { createRepas } from '../domain/entities/repas';
import { createSlot } from '../domain/entities/slot';
import { IngredientBuilder } from '../domain/test-builders/ingredient.builder';
import { RecipeBuilder } from '../domain/test-builders/recipe.builder';
import { observeRecipes, selectCatalogue } from '../ui/features/catalogue/catalogue-slice';
import { addConvive, loadConvives, selectConvives } from '../ui/features/convives/convives-slice';
import { recipeOfRoute } from '../ui/features/recipe-detail/recipe-detail-states';
import { generateMenu, saveMenu } from '../ui/features/menu/menu-slice';
import { loadSavedMenus, selectSavedMenus } from '../ui/features/menu/saved-menus-slice';
import { createRecipe } from '../ui/features/recipe/recipe-slice';
import { updateRecipe } from '../ui/features/recipe/recipe-edit-slice';
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
    await store.dispatch(loadSavedMenus({ fromSave: false }));

    expect(selectSavedMenus(store.getState()).menus).toEqual([menu]);
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
    store.dispatch(observeRecipes());

    expect(recipeOfRoute(selectCatalogue(store.getState()), 'r-1')?.title).toBe(
      'Gratin dauphinois',
    );
  });

  it('câble les use-cases recettes sur un même repository : une recette créée apparaît dans le catalogue', async () => {
    const store = createTestStore();

    await store.dispatch(
      createRecipe({
        title: 'Tarte tatin',
        ingredients: [IngredientBuilder.anIngredient().build()],
      }),
    );
    store.dispatch(observeRecipes());

    expect(selectCatalogue(store.getState()).recipes?.map((recipe) => recipe.title)).toEqual([
      'Tarte tatin',
    ]);
  });
});
