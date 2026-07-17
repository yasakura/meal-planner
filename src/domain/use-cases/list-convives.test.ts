import { describe, it, expect } from 'vitest';
import { listConvivesUseCase } from './list-convives';
import { InMemoryConviveRepository } from '../test-doubles/in-memory-convive-repository';
import { ConviveBuilder } from '../test-builders/convive.builder';
import { type ConviveRepository } from '../ports/convive-repository';

describe('listConvivesUseCase', () => {
  it('retourne tous les convives fournis par le repository', async () => {
    const conviveRepository = InMemoryConviveRepository.create();
    await conviveRepository.save(
      ConviveBuilder.aConvive().withId('c1').withName('Aurélie').build(),
    );
    await conviveRepository.save(ConviveBuilder.aConvive().withId('c2').withName('Lionel').build());
    const listConvives = listConvivesUseCase({ conviveRepository });

    const convives = await listConvives();

    expect(convives.map((c) => c.id)).toEqual(['c1', 'c2']);
  });

  // Divergence ASSUMÉE vs listRecipes (qui trie par titre) : les convives d'un foyer
  // se lisent dans l'ordre d'ajout, jamais réordonnés. Insertion DÉLIBÉRÉMENT
  // non-alphabétique (Rory, Aurélie, Lionel) : un tri accidentel par nom sortirait
  // ['Aurélie', 'Lionel', 'Rory'] — l'attendu discrimine donc « ordre d'insertion » vs « trié ».
  it("préserve l'ordre d'insertion, sans tri", async () => {
    const conviveRepository = InMemoryConviveRepository.create();
    await conviveRepository.save(ConviveBuilder.aConvive().withId('c1').withName('Rory').build());
    await conviveRepository.save(
      ConviveBuilder.aConvive().withId('c2').withName('Aurélie').build(),
    );
    await conviveRepository.save(ConviveBuilder.aConvive().withId('c3').withName('Lionel').build());
    const listConvives = listConvivesUseCase({ conviveRepository });

    const convives = await listConvives();

    expect(convives.map((c) => c.name)).toEqual(['Rory', 'Aurélie', 'Lionel']);
  });

  it('retourne une liste vide quand aucun convive', async () => {
    const conviveRepository = InMemoryConviveRepository.create();
    const listConvives = listConvivesUseCase({ conviveRepository });

    const convives = await listConvives();

    expect(convives).toEqual([]);
  });

  it('propage une erreur rejetée par le repository', async () => {
    const conviveRepository: ConviveRepository = {
      save: () => Promise.resolve(),
      findAll: () => Promise.reject(new Error('boom')),
    };
    const listConvives = listConvivesUseCase({ conviveRepository });

    await expect(listConvives()).rejects.toThrow('boom');
  });
});
