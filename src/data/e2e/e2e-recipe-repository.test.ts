import { describe, it, expect, vi } from 'vitest';

import { RepositoryUnavailableError } from '../../domain/errors/repository-unavailable-error';
import { type Recipe } from '../../domain/entities/recipe';
import { RecipeBuilder } from '../../domain/test-builders/recipe.builder';
import { E2eFailureSwitch } from './e2e-failure-switch';
import { E2eRecipeRepository } from './e2e-recipe-repository';

const gratin = RecipeBuilder.aRecipe().withId('r-1').withTitle('Gratin').build();
const curry = RecipeBuilder.aRecipe().withId('r-2').withTitle('Curry').build();
const omelette = RecipeBuilder.aRecipe().withId('r-3').withTitle('Omelette').build();

function sansPanne(): E2eFailureSwitch {
  return E2eFailureSwitch.reporting(() => {});
}

describe('E2eRecipeRepository', () => {
  it('rend un ordre DIFFÉRENT de l’ordre d’insertion : le port n’en garantit aucun', async () => {
    const repository = E2eRecipeRepository.seededWith([gratin, curry, omelette], sansPanne());

    expect(await repository.findAll()).toEqual([omelette, gratin, curry]);
  });

  it('rend undefined pour un id inconnu — une absence, pas une panne', async () => {
    const repository = E2eRecipeRepository.seededWith([gratin], sansPanne());

    expect(await repository.findById('inconnu')).toBeUndefined();
  });

  it('rejette findAll avec RepositoryUnavailableError quand les lectures sont en panne', async () => {
    const failures = sansPanne();
    const repository = E2eRecipeRepository.seededWith([gratin], failures);

    failures.failReads();

    await expect(repository.findAll()).rejects.toBeInstanceOf(RepositoryUnavailableError);
  });

  it('rejette findById avec RepositoryUnavailableError quand les lectures sont en panne', async () => {
    const failures = sansPanne();
    const repository = E2eRecipeRepository.seededWith([gratin], failures);

    failures.failReads();

    await expect(repository.findById('r-1')).rejects.toBeInstanceOf(RepositoryUnavailableError);
  });

  it('failWrites : save est pris tout de suite, puis annulé quand le serveur le refuse', async () => {
    const onWriteRejected = vi.fn();
    const failures = E2eFailureSwitch.reporting(onWriteRejected);
    const repository = E2eRecipeRepository.seededWith([], failures);
    failures.failWrites();

    await repository.save(curry);
    expect(await repository.findAll()).toEqual([curry]);

    await vi.waitFor(async () => {
      expect(await repository.findAll()).toEqual([]);
    });
    expect(onWriteRejected).toHaveBeenCalledTimes(1);
  });

  it('failWrites : la réécriture est prise tout de suite, puis la recette revient telle qu’elle était', async () => {
    const onWriteRejected = vi.fn();
    const failures = E2eFailureSwitch.reporting(onWriteRejected);
    const repository = E2eRecipeRepository.seededWith([curry], failures);
    const curryRevu = RecipeBuilder.aRecipe().withId('r-2').withTitle('Curry revu').build();
    failures.failWrites();

    await repository.save(curryRevu);
    expect(await repository.findAll()).toEqual([curryRevu]);

    await vi.waitFor(async () => {
      expect(await repository.findAll()).toEqual([curry]);
    });
    expect(onWriteRejected).toHaveBeenCalledTimes(1);
  });

  it('le refus d’une écriture n’efface pas celle faite après le rétablissement', async () => {
    const onWriteRejected = vi.fn();
    const failures = E2eFailureSwitch.reporting(onWriteRejected);
    const repository = E2eRecipeRepository.seededWith([], failures);

    failures.failWrites();
    await repository.save(curry);
    failures.restore();
    await repository.save(gratin);

    await vi.waitFor(() => expect(onWriteRejected).toHaveBeenCalledTimes(1));
    expect(await repository.findAll()).toEqual([gratin]);
  });

  it('deux refus dans la même fenêtre annulent chacun leur écriture, pas la collection entière', async () => {
    const onWriteRejected = vi.fn();
    const failures = E2eFailureSwitch.reporting(onWriteRejected);
    const repository = E2eRecipeRepository.seededWith([], failures);
    failures.failWrites();

    await repository.save(curry);
    await repository.save(gratin);

    await vi.waitFor(() => expect(onWriteRejected).toHaveBeenCalledTimes(2));
    expect(await repository.findAll()).toEqual([]);
  });

  it('deux refus sur la MÊME recette rendent la valeur d’origine, pas la première refusée', async () => {
    const onWriteRejected = vi.fn();
    const failures = E2eFailureSwitch.reporting(onWriteRejected);
    const repository = E2eRecipeRepository.seededWith([curry], failures);
    failures.failWrites();

    await repository.save(RecipeBuilder.aRecipe().withId('r-2').withTitle('Curry doux').build());
    await repository.save(RecipeBuilder.aRecipe().withId('r-2').withTitle('Curry fort').build());

    await vi.waitFor(() => expect(onWriteRejected).toHaveBeenCalledTimes(2));
    expect(await repository.findAll()).toEqual([curry]);
  });

  it('le refus d’un enregistrement ne défait pas la réécriture de la MÊME recette faite depuis', async () => {
    const onWriteRejected = vi.fn();
    const failures = E2eFailureSwitch.reporting(onWriteRejected);
    const repository = E2eRecipeRepository.seededWith([], failures);
    const curryRevu = RecipeBuilder.aRecipe().withId('r-2').withTitle('Curry revu').build();

    failures.failWrites();
    await repository.save(curry);
    failures.restore();
    await repository.save(curryRevu);

    await vi.waitFor(() => expect(onWriteRejected).toHaveBeenCalledTimes(1));
    expect(await repository.findAll()).toEqual([curryRevu]);
  });
});

describe('E2eRecipeRepository — observation', () => {
  it("livre l'instantané courant dès l'abonnement, dans un ordre DIFFÉRENT de l'ordre d'insertion", () => {
    const repository = E2eRecipeRepository.seededWith([gratin, curry], sansPanne());
    const instantanes: (readonly Recipe[])[] = [];

    repository.observeAll(
      (recipes) => instantanes.push(recipes),
      () => {},
    );

    expect(instantanes).toEqual([[curry, gratin]]);
  });

  it('réémet la liste entière à chaque enregistrement', async () => {
    const repository = E2eRecipeRepository.seededWith([gratin], sansPanne());
    const instantanes: (readonly Recipe[])[] = [];
    repository.observeAll(
      (recipes) => instantanes.push(recipes),
      () => {},
    );

    await repository.save(curry);

    expect(instantanes).toEqual([[gratin], [curry, gratin]]);
  });

  it("n'émet plus rien une fois le désabonnement appelé", async () => {
    const repository = E2eRecipeRepository.seededWith([gratin], sansPanne());
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
    const failures = sansPanne();
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
    const failures = sansPanne();
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
