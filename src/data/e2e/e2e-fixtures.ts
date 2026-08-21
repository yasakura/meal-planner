import { createAccount, type Account } from '../../domain/entities/account';
import { createCalendarDate, type CalendarDate } from '../../domain/entities/calendar-date';
import { createConvive, type Convive } from '../../domain/entities/convive';
import { createIngredient } from '../../domain/entities/ingredient';
import { createRecipe, type Recipe } from '../../domain/entities/recipe';

export const E2E_ACCOUNT: Account = createAccount({
  id: 'e2e-account',
  email: 'e2e@foyer.test',
});

export const E2E_TODAY: CalendarDate = createCalendarDate({ year: 2026, month: 1, day: 1 });

export const E2E_CONVIVES: readonly Convive[] = Object.freeze([
  createConvive({ id: 'convive-alice', name: 'Alice' }),
  createConvive({ id: 'convive-bruno', name: 'Bruno' }),
  createConvive({ id: 'convive-chloe', name: 'Chloé' }),
  createConvive({ id: 'convive-emile', name: 'Émile' }),
]);

export const E2E_RECIPES: readonly Recipe[] = Object.freeze([
  createRecipe({
    id: 'recipe-curry-pois-chiches',
    title: 'Curry de pois chiches',
    ingredients: [
      createIngredient({ name: 'Pois chiches', quantity: 400, unit: 'g' }),
      createIngredient({ name: 'Lait de coco', quantity: 400, unit: 'ml' }),
      createIngredient({ name: 'Oignon', quantity: 1, unit: 'piece' }),
    ],
    convivesReference: 4,
    instructions: 'Faire revenir l’oignon, ajouter les pois chiches et le lait de coco.',
  }),
  createRecipe({
    id: 'recipe-gratin-dauphinois',
    title: 'Gratin dauphinois',
    ingredients: [
      createIngredient({ name: 'Pommes de terre', quantity: 1, unit: 'kg' }),
      createIngredient({ name: 'Crème', quantity: 500, unit: 'ml' }),
    ],
    convivesReference: 6,
    instructions: 'Émincer les pommes de terre, napper de crème, cuire 1 h à 160 °C.',
  }),
  createRecipe({
    id: 'recipe-omelette-herbes',
    title: 'Omelette aux herbes',
    ingredients: [
      createIngredient({ name: 'Œufs', quantity: 6, unit: 'piece' }),
      createIngredient({ name: 'Herbes fraîches', quantity: 20, unit: 'g' }),
    ],
    convivesReference: 3,
  }),
]);
