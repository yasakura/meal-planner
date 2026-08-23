import { describe, it, expect } from 'vitest';
import { type Recipe } from '../entities/recipe';
import { RecipeBuilder } from '../test-builders/recipe.builder';
import { InMemoryRecipeRepository } from './in-memory-recipe-repository';

const gratin = RecipeBuilder.aRecipe().withId('r-1').withTitle('Gratin').build();
const curry = RecipeBuilder.aRecipe().withId('r-2').withTitle('Curry').build();
const omelette = RecipeBuilder.aRecipe().withId('r-3').withTitle('Omelette').build();

describe('InMemoryRecipeRepository', () => {
  it('rend un ordre DIFFÉRENT de l’ordre d’insertion : le port n’en garantit aucun', async () => {
    const repository = InMemoryRecipeRepository.create();
    await repository.save(gratin);
    await repository.save(curry);
    await repository.save(omelette);

    expect(await repository.findAll()).toEqual([omelette, curry, gratin]);
  });
});

describe('InMemoryRecipeRepository — observation', () => {
  it("livre l'instantané courant dès l'abonnement, dans un ordre DIFFÉRENT de l'ordre d'insertion", async () => {
    const repository = InMemoryRecipeRepository.create();
    await repository.save(gratin);
    await repository.save(curry);
    const instantanes: (readonly Recipe[])[] = [];

    repository.observeAll((recipes) => instantanes.push(recipes));

    expect(instantanes).toEqual([[curry, gratin]]);
  });

  it('réémet la liste entière à chaque enregistrement', async () => {
    const repository = InMemoryRecipeRepository.create();
    const instantanes: (readonly Recipe[])[] = [];
    repository.observeAll((recipes) => instantanes.push(recipes));

    await repository.save(gratin);
    await repository.save(curry);

    expect(instantanes).toEqual([[], [gratin], [curry, gratin]]);
  });

  it("n'émet plus rien une fois le désabonnement appelé", async () => {
    const repository = InMemoryRecipeRepository.create();
    const instantanes: (readonly Recipe[])[] = [];
    const stop = repository.observeAll((recipes) => instantanes.push(recipes));
    await repository.save(gratin);
    expect(instantanes).toHaveLength(2);

    stop();
    await repository.save(curry);

    expect(instantanes).toHaveLength(2);
  });
});
