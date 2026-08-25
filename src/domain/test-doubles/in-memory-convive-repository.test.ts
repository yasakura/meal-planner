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

    expect(await repository.findAll()).toEqual([chloe, alice, bruno]);
  });

  it('updateOnlyIfExists remplace le convive visé quand il existe', async () => {
    const repository = InMemoryConviveRepository.create();
    await repository.save(alice);

    await repository.updateOnlyIfExists(createConvive({ id: 'c-1', name: 'Alicia' }));

    expect(repository.byId('c-1')).toEqual(createConvive({ id: 'c-1', name: 'Alicia' }));
  });

  it('updateOnlyIfExists ne crée rien quand le convive visé n’existe pas : le port ne promet aucune création', async () => {
    const repository = InMemoryConviveRepository.create();
    await repository.save(alice);

    await repository.updateOnlyIfExists(createConvive({ id: 'inconnu', name: 'Alicia' }));

    expect(repository.byId('inconnu')).toBeUndefined();
    expect(repository.byId('c-1')).toEqual(alice);
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
    await repository.updateOnlyIfExists(alicia);
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
