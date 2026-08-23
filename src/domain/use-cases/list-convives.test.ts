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

  it('retourne une liste vide quand aucun convive', async () => {
    const conviveRepository = InMemoryConviveRepository.create();
    const listConvives = listConvivesUseCase({ conviveRepository });

    const convives = await listConvives();

    expect(convives).toEqual([]);
  });

  it('trie les convives par prénom, alphabétique croissant, quel que soit l’ordre du repository', async () => {
    const conviveRepository = InMemoryConviveRepository.create();
    await conviveRepository.save(ConviveBuilder.aConvive().withId('c1').withName('Rory').build());
    await conviveRepository.save(
      ConviveBuilder.aConvive().withId('c2').withName('Aurélie').build(),
    );
    await conviveRepository.save(ConviveBuilder.aConvive().withId('c3').withName('Lionel').build());
    const listConvives = listConvivesUseCase({ conviveRepository });

    const convives = await listConvives();

    expect(convives.map((c) => c.name)).toEqual(['Aurélie', 'Lionel', 'Rory']);
  });

  it('range un prénom accentué à la lettre de sa base, pas après Z', async () => {
    const conviveRepository = InMemoryConviveRepository.create();
    await conviveRepository.save(ConviveBuilder.aConvive().withId('c1').withName('Zoé').build());
    await conviveRepository.save(ConviveBuilder.aConvive().withId('c2').withName('Emma').build());
    await conviveRepository.save(ConviveBuilder.aConvive().withId('c3').withName('Élise').build());
    const listConvives = listConvivesUseCase({ conviveRepository });

    const convives = await listConvives();

    expect(convives.map((c) => c.name)).toEqual(['Élise', 'Emma', 'Zoé']);
  });

  it('range un prénom saisi en minuscules à sa lettre, pas après tous les prénoms capitalisés', async () => {
    const conviveRepository = InMemoryConviveRepository.create();
    await conviveRepository.save(ConviveBuilder.aConvive().withId('c1').withName('Lionel').build());
    await conviveRepository.save(
      ConviveBuilder.aConvive().withId('c2').withName('aurélie').build(),
    );
    const listConvives = listConvivesUseCase({ conviveRepository });

    const convives = await listConvives();

    expect(convives.map((c) => c.name)).toEqual(['aurélie', 'Lionel']);
  });

  it('garde les deux homonymes, dans l’ordre où le repository les a fournis', async () => {
    const conviveRepository = InMemoryConviveRepository.create();
    await conviveRepository.save(ConviveBuilder.aConvive().withId('r1').withName('Rory').build());
    await conviveRepository.save(
      ConviveBuilder.aConvive().withId('a1').withName('Aurélie').build(),
    );
    await conviveRepository.save(ConviveBuilder.aConvive().withId('r2').withName('Rory').build());
    const listConvives = listConvivesUseCase({ conviveRepository });

    const convives = await listConvives();

    const fournis = await conviveRepository.findAll();
    const homonymesDansLOrdreDuRepository = fournis
      .filter((c) => c.name === 'Rory')
      .map((c) => c.id);

    expect(convives.map((c) => c.id)).toEqual(['a1', ...homonymesDansLOrdreDuRepository]);
  });

  it('propage une erreur rejetée par le repository', async () => {
    const conviveRepository: ConviveRepository = {
      save: () => Promise.resolve(),
      findAll: () => Promise.reject(new Error('boom')),
      updateExisting: () => Promise.resolve(undefined),
      remove: () => Promise.resolve(),
      observeAll: () => () => {},
    };
    const listConvives = listConvivesUseCase({ conviveRepository });

    await expect(listConvives()).rejects.toThrow('boom');
  });
});
