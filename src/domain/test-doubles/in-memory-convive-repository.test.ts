import { describe, it, expect } from 'vitest';
import { createConvive } from '../entities/convive';
import { ConviveBuilder } from '../test-builders/convive.builder';
import { InMemoryConviveRepository } from './in-memory-convive-repository';

const alice = ConviveBuilder.aConvive().withId('c-1').withName('Alice').build();
const bruno = ConviveBuilder.aConvive().withId('c-2').withName('Bruno').build();
const chloe = ConviveBuilder.aConvive().withId('c-3').withName('Chloé').build();

describe('InMemoryConviveRepository', () => {
  it('rend un ordre DIFFÉRENT de l’ordre d’insertion : le port n’en garantit aucun', async () => {
    const repository = InMemoryConviveRepository.create();
    await repository.save(alice);
    await repository.save(bruno);
    await repository.save(chloe);

    expect(await repository.findAll()).toEqual([chloe, bruno, alice]);
  });

  it('REJOUE transform : le port prévient qu’une transaction rejoue son corps', async () => {
    const repository = InMemoryConviveRepository.create();
    await repository.save(alice);
    let appels = 0;

    await repository.updateExisting('c-1', (existing) => {
      appels += 1;
      return createConvive({ id: existing.id, name: 'Alicia' });
    });

    expect(appels).toBe(2);
  });

  it('écrit sous l’id DEMANDÉ, jamais sous celui rendu par transform', async () => {
    const repository = InMemoryConviveRepository.create();
    await repository.save(alice);

    await repository.updateExisting('c-1', () => createConvive({ id: 'autre-id', name: 'Alicia' }));

    expect(repository.byId('c-1')).toEqual(createConvive({ id: 'autre-id', name: 'Alicia' }));
    expect(repository.byId('autre-id')).toBeUndefined();
  });
});
