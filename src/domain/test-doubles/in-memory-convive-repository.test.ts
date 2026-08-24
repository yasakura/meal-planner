import { describe, it, expect } from 'vitest';
import { createConvive, type Convive } from '../entities/convive';
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

describe('InMemoryConviveRepository — observation', () => {
  it("livre l'instantané courant dès l'abonnement, dans un ordre DIFFÉRENT de l'ordre d'insertion", async () => {
    const repository = InMemoryConviveRepository.create();
    await repository.save(alice);
    await repository.save(bruno);
    const instantanes: (readonly Convive[])[] = [];

    repository.observeAll((convives) => instantanes.push(convives));

    expect(instantanes).toEqual([[bruno, alice]]);
  });

  it('réémet la liste entière à chaque enregistrement, mise à jour et retrait', async () => {
    const repository = InMemoryConviveRepository.create();
    const instantanes: (readonly Convive[])[] = [];
    repository.observeAll((convives) => instantanes.push(convives));

    await repository.save(alice);
    const alicia = createConvive({ id: 'c-1', name: 'Alicia' });
    await repository.updateExisting('c-1', () => alicia);
    await repository.remove('c-1');

    expect(instantanes).toEqual([[], [alice], [alicia], []]);
  });

  it("n'émet plus rien une fois le désabonnement appelé", async () => {
    const repository = InMemoryConviveRepository.create();
    const instantanes: (readonly Convive[])[] = [];
    const stop = repository.observeAll((convives) => instantanes.push(convives));
    await repository.save(alice);
    expect(instantanes).toHaveLength(2);

    stop();
    await repository.save(bruno);

    expect(instantanes).toHaveLength(2);
  });
});
