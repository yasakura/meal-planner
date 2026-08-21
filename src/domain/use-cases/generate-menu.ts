import { type CalendarDate } from '../entities/calendar-date';
import { CRENEAUX } from '../entities/creneau';
import { createMenu, type Menu } from '../entities/menu';
import { createRepas, type Repas } from '../entities/repas';
import { createSlot } from '../entities/slot';
import { elementAt } from '../lib/element-at';
import { type RandomPicker } from '../ports/random-picker';
import { type RecipeRepository } from '../ports/recipe-repository';

export function generateMenuUseCase(deps: {
  recipeRepository: RecipeRepository;
  randomPicker: RandomPicker;
}): (input: { days: number; dateDebut: CalendarDate }) => Promise<Menu> {
  return async ({ days, dateDebut }) => {
    if (!Number.isInteger(days) || days < 1) {
      throw new Error('Le nombre de jours doit être un entier positif');
    }
    const recipes = await deps.recipeRepository.findAll();
    if (recipes.length === 0) {
      throw new Error('Impossible de générer un menu sans recette');
    }
    const repas: Repas[] = [];
    let pool = recipes;
    for (let jour = 0; jour < days; jour += 1) {
      for (const creneau of CRENEAUX) {
        if (pool.length === 0) {
          pool = recipes;
        }
        const index = deps.randomPicker.nextIndex(pool.length);
        const recipe = elementAt(pool, index);
        pool = pool.filter((_, i) => i !== index);
        repas.push(createRepas({ jour, creneau, slots: [createSlot({ recipeId: recipe.id })] }));
      }
    }
    return createMenu({ repas, dateDebut });
  };
}

export type GenerateMenu = ReturnType<typeof generateMenuUseCase>;
