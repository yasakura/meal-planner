import { describe, it, expect } from 'vitest';

import { RepositoryUnavailableError } from '../../domain/errors/repository-unavailable-error';
import { type Recipe } from '../../domain/entities/recipe';
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

describe('E2eRecipeRepository — observation', () => {
  it("livre l'instantané courant dès l'abonnement, dans un ordre DIFFÉRENT de l'ordre d'insertion", () => {
    const repository = E2eRecipeRepository.seededWith([gratin, curry], E2eFailureSwitch.create());
    const instantanes: (readonly Recipe[])[] = [];

    repository.observeAll(
      (recipes) => instantanes.push(recipes),
      () => {},
    );

    expect(instantanes).toEqual([[curry, gratin]]);
  });

  it('réémet la liste entière à chaque enregistrement', async () => {
    const repository = E2eRecipeRepository.seededWith([gratin], E2eFailureSwitch.create());
    const instantanes: (readonly Recipe[])[] = [];
    repository.observeAll(
      (recipes) => instantanes.push(recipes),
      () => {},
    );

    await repository.save(curry);

    expect(instantanes).toEqual([[gratin], [curry, gratin]]);
  });

  it("n'émet plus rien une fois le désabonnement appelé", async () => {
    const repository = E2eRecipeRepository.seededWith([gratin], E2eFailureSwitch.create());
    const instantanes: (readonly Recipe[])[] = [];
    const stop = repository.observeAll(
      (recipes) => instantanes.push(recipes),
      () => {},
    );
    await repository.save(curry);
    expect(instantanes).toHaveLength(2);

    stop();
    await repository.save(omelette);

    expect(instantanes).toHaveLength(2);
  });

  it("signale l'indisponibilité sur le canal d'erreur quand les lectures sont en panne, au lieu de livrer un instantané", () => {
    const failures = E2eFailureSwitch.create();
    const repository = E2eRecipeRepository.seededWith([gratin], failures);
    const instantanes: (readonly Recipe[])[] = [];
    const echecs: unknown[] = [];

    failures.failReads();
    repository.observeAll(
      (recipes) => instantanes.push(recipes),
      (error) => echecs.push(error),
    );

    expect(echecs).toHaveLength(1);
    expect(echecs[0]).toBeInstanceOf(RepositoryUnavailableError);
    expect(instantanes).toEqual([]);
  });

  it('reprend ses instantanés à la première écriture qui suit le rétablissement des lectures', async () => {
    const failures = E2eFailureSwitch.create();
    const repository = E2eRecipeRepository.seededWith([gratin], failures);
    const instantanes: (readonly Recipe[])[] = [];
    failures.failReads();
    repository.observeAll(
      (recipes) => instantanes.push(recipes),
      () => {},
    );

    failures.restore();
    await repository.save(curry);

    expect(instantanes).toEqual([[curry, gratin]]);
  });
});
