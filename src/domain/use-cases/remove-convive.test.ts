import { describe, it, expect } from 'vitest';
import { removeConviveUseCase } from './remove-convive';
import { InMemoryConviveRepository } from '../test-doubles/in-memory-convive-repository';
import { ConviveBuilder } from '../test-builders/convive.builder';
import { type ConviveRepository } from '../ports/convive-repository';

async function foyerSeedeAvecTroisConvives(): Promise<InMemoryConviveRepository> {
  const conviveRepository = InMemoryConviveRepository.create();
  await conviveRepository.save(ConviveBuilder.aConvive().withId('c1').withName('Rory').build());
  await conviveRepository.save(ConviveBuilder.aConvive().withId('c2').withName('Aurélie').build());
  await conviveRepository.save(ConviveBuilder.aConvive().withId('c3').withName('Lionel').build());
  return conviveRepository;
}

async function idsDuFoyer(conviveRepository: ConviveRepository): Promise<string[]> {
  const foyer = await conviveRepository.findAll();
  return foyer.map((c) => c.id).sort();
}

describe('removeConviveUseCase', () => {
  it('retire du foyer le convive visé, et lui seul', async () => {
    const conviveRepository = await foyerSeedeAvecTroisConvives();
    const removeConvive = removeConviveUseCase({ conviveRepository });

    await removeConvive({ id: 'c2' });

    expect(await idsDuFoyer(conviveRepository)).toEqual(['c1', 'c3']);
  });

  it('efface définitivement : le convive retiré n’est plus retrouvable par son id', async () => {
    const conviveRepository = await foyerSeedeAvecTroisConvives();
    const removeConvive = removeConviveUseCase({ conviveRepository });

    await removeConvive({ id: 'c2' });

    expect(conviveRepository.byId('c2')).toBeUndefined();
  });

  it('délègue l’effacement au dépôt exactement une fois', async () => {
    const conviveRepository = await foyerSeedeAvecTroisConvives();
    const removeConvive = removeConviveUseCase({ conviveRepository });

    await removeConvive({ id: 'c2' });

    expect(conviveRepository.removeCount).toBe(1);
  });

  it('accepte de vider le foyer : retirer le dernier convive est un état légitime', async () => {
    const conviveRepository = InMemoryConviveRepository.create();
    await conviveRepository.save(ConviveBuilder.aConvive().withId('c1').withName('Rory').build());
    const removeConvive = removeConviveUseCase({ conviveRepository });

    await removeConvive({ id: 'c1' });

    expect(await idsDuFoyer(conviveRepository)).toEqual([]);
  });

  it('reste silencieux sur un identifiant inconnu, sans effacer personne d’autre', async () => {
    const conviveRepository = await foyerSeedeAvecTroisConvives();
    const removeConvive = removeConviveUseCase({ conviveRepository });

    await expect(removeConvive({ id: 'inconnu' })).resolves.toBeUndefined();

    expect(conviveRepository.removeCount).toBe(1);
    expect(await idsDuFoyer(conviveRepository)).toEqual(['c1', 'c2', 'c3']);
  });

  it('est idempotent : retirer deux fois le même convive ne rejette pas', async () => {
    const conviveRepository = await foyerSeedeAvecTroisConvives();
    const removeConvive = removeConviveUseCase({ conviveRepository });

    await removeConvive({ id: 'c2' });

    await expect(removeConvive({ id: 'c2' })).resolves.toBeUndefined();
    expect(conviveRepository.removeCount).toBe(2);
    expect(await idsDuFoyer(conviveRepository)).toEqual(['c1', 'c3']);
  });

  it('propage la panne du dépôt', async () => {
    const conviveRepository: ConviveRepository = {
      save: () => Promise.resolve(),
      findAll: () => Promise.resolve([]),
      updateExisting: () => Promise.resolve(undefined),
      remove: () => Promise.reject(new Error('boom')),
      observeAll: () => () => {},
    };
    const removeConvive = removeConviveUseCase({ conviveRepository });

    await expect(removeConvive({ id: 'c2' })).rejects.toThrow('boom');
  });
});
