import { describe, it, expect } from 'vitest';
import { type Recipe } from '../entities/recipe';
import { ThrowingRecipeRepository } from './throwing-recipe-repository';

describe('ThrowingRecipeRepository', () => {
  it("échoue aussi sur le canal d'erreur de l'observation, sans jamais livrer d'instantané", () => {
    const repository = ThrowingRecipeRepository.rejectingWith('boom');
    const instantanes: (readonly Recipe[])[] = [];
    const echecs: unknown[] = [];

    repository.observeAll(
      (recipes) => instantanes.push(recipes),
      (error) => echecs.push(error),
    );

    expect(echecs).toEqual([new Error('boom')]);
    expect(instantanes).toEqual([]);
  });
});
