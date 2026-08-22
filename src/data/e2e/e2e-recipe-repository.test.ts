import { describe, it, expect } from 'vitest';

import { RepositoryUnavailableError } from '../../domain/errors/repository-unavailable-error';
import { RecipeBuilder } from '../../domain/test-builders/recipe.builder';
import { E2eFailureSwitch } from './e2e-failure-switch';
import { E2eRecipeRepository } from './e2e-recipe-repository';

const gratin = RecipeBuilder.aRecipe().withId('r-1').withTitle('Gratin').build();
const curry = RecipeBuilder.aRecipe().withId('r-2').withTitle('Curry').build();
const omelette = RecipeBuilder.aRecipe().withId('r-3').withTitle('Omelette').build();

describe('E2eRecipeRepository', () => {
  it('rend un ordre DIFFÉRENT de l’ordre d’insertion : le port n’en garantit aucun', async () => {
    const repository = E2eRecipeRepository.seededWith(
      [gratin, curry, omelette],
      E2eFailureSwitch.create(),
    );

    expect(await repository.findAll()).toEqual([omelette, curry, gratin]);
  });

  it('rend undefined pour un id inconnu — une absence, pas une panne', async () => {
    const repository = E2eRecipeRepository.seededWith([gratin], E2eFailureSwitch.create());

    expect(await repository.findById('inconnu')).toBeUndefined();
  });

  it('rejette findAll avec RepositoryUnavailableError quand les lectures sont en panne', async () => {
    const failures = E2eFailureSwitch.create();
    const repository = E2eRecipeRepository.seededWith([gratin], failures);

    failures.failReads();

    await expect(repository.findAll()).rejects.toBeInstanceOf(RepositoryUnavailableError);
  });

  it('rejette findById avec RepositoryUnavailableError quand les lectures sont en panne', async () => {
    const failures = E2eFailureSwitch.create();
    const repository = E2eRecipeRepository.seededWith([gratin], failures);

    failures.failReads();

    await expect(repository.findById('r-1')).rejects.toBeInstanceOf(RepositoryUnavailableError);
  });

  it('rejette save quand les écritures sont en panne, et n’enregistre rien', async () => {
    const failures = E2eFailureSwitch.create();
    const repository = E2eRecipeRepository.seededWith([], failures);

    failures.failWrites();

    await expect(repository.save(curry)).rejects.toBeInstanceOf(RepositoryUnavailableError);
    failures.restore();
    expect(await repository.findAll()).toEqual([]);
  });

  it('un dépôt muet ne refuse pas save : c’est la borne qui le déclare indisponible, et rien n’est enregistré', async () => {
    const failures = E2eFailureSwitch.create({ ackTimeoutMs: 10 });
    const repository = E2eRecipeRepository.seededWith([], failures);

    failures.hangWrites();

    await expect(repository.save(curry)).rejects.toBeInstanceOf(RepositoryUnavailableError);
    failures.restore();
    expect(await repository.findAll()).toEqual([]);
  });
});
