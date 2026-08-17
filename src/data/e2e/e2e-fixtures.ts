import { createAccount, type Account } from '../../domain/entities/account';
import { createConvive, type Convive } from '../../domain/entities/convive';
import { createIngredient } from '../../domain/entities/ingredient';
import { createRecipe, type Recipe } from '../../domain/entities/recipe';

/**
 * Jeu de départ du mode e2e. Déclaré ICI et nulle part ailleurs : un scénario qui pilote
 * l'état par l'URL (`?convives=2`) prélève un préfixe de ces listes, donc leur ORDRE de
 * déclaration fait partie du contrat — le changer change ce que les scénarios chargent.
 *
 * Ids stables et lisibles (`convive-alice`, `recipe-gratin-dauphinois`) : ce sont des cibles
 * de navigation directe (`/catalogue/recipe-gratin-dauphinois`). Ils sont délibérément
 * DISJOINTS des ids produits par `SequentialIdGenerator` (`e2e-convive-1`…) — un chevauchement
 * ferait qu'ajouter un convive écraserait silencieusement une fixture, `save` étant un upsert.
 *
 * Passe par les factories du domaine : une fixture ne peut pas violer un invariant d'entité.
 */

export const E2E_ACCOUNT: Account = createAccount({
  id: 'e2e-account',
  email: 'e2e@foyer.test',
});

export const E2E_CONVIVES: readonly Convive[] = Object.freeze([
  createConvive({ id: 'convive-alice', name: 'Alice' }),
  createConvive({ id: 'convive-bruno', name: 'Bruno' }),
  // Prénom accentué : la collation française du tri du foyer reste exercée en scénario.
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
