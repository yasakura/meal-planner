import { describe, it, expect } from 'vitest';
import { renameConviveUseCase } from './rename-convive';
import { InMemoryConviveRepository } from '../test-doubles/in-memory-convive-repository';
import { ConviveBuilder } from '../test-builders/convive.builder';
import { type ConviveRepository } from '../ports/convive-repository';
import { RepositoryUnavailableError } from '../errors/repository-unavailable-error';

async function foyerSeedeAvecRoryEtAurelie(): Promise<InMemoryConviveRepository> {
  const conviveRepository = InMemoryConviveRepository.create();
  await conviveRepository.save(ConviveBuilder.aConvive().withId('c1').withName('Rory').build());
  await conviveRepository.save(ConviveBuilder.aConvive().withId('c2').withName('Aurélie').build());
  return conviveRepository;
}

describe('renameConviveUseCase', () => {
  it('rend le convive portant son nouveau prénom', async () => {
    const conviveRepository = await foyerSeedeAvecRoryEtAurelie();
    const renameConvive = renameConviveUseCase({ conviveRepository });

    const convive = await renameConvive({ id: 'c2', name: 'Aurélia' });

    expect(convive.name).toBe('Aurélia');
  });

  it('renomme sans changer d’identité : le convive rendu garde son id', async () => {
    const conviveRepository = await foyerSeedeAvecRoryEtAurelie();
    const renameConvive = renameConviveUseCase({ conviveRepository });

    const convive = await renameConvive({ id: 'c2', name: 'Aurélia' });

    expect(convive.id).toBe('c2');
  });

  it('persiste le nouveau prénom sur le convive existant', async () => {
    const conviveRepository = await foyerSeedeAvecRoryEtAurelie();
    const renameConvive = renameConviveUseCase({ conviveRepository });

    await renameConvive({ id: 'c2', name: 'Aurélia' });

    expect(conviveRepository.byId('c2')?.name).toBe('Aurélia');
  });

  it('remplace le convive visé, sans en ajouter un second ni toucher aux autres', async () => {
    const conviveRepository = await foyerSeedeAvecRoryEtAurelie();
    const renameConvive = renameConviveUseCase({ conviveRepository });

    await renameConvive({ id: 'c2', name: 'Aurélia' });

    const foyer = await conviveRepository.findAll();
    expect(foyer.sort((a, b) => a.id.localeCompare(b.id))).toEqual([
      { id: 'c1', name: 'Rory' },
      { id: 'c2', name: 'Aurélia' },
    ]);
  });

  it('autorise un prénom déjà porté par un autre convive (les homonymes sont permis)', async () => {
    const conviveRepository = await foyerSeedeAvecRoryEtAurelie();
    const renameConvive = renameConviveUseCase({ conviveRepository });

    await renameConvive({ id: 'c2', name: 'Rory' });

    expect(conviveRepository.byId('c1')?.name).toBe('Rory');
    expect(conviveRepository.byId('c2')?.name).toBe('Rory');
  });

  it('trime le nouveau prénom, comme à la création', async () => {
    const conviveRepository = await foyerSeedeAvecRoryEtAurelie();
    const renameConvive = renameConviveUseCase({ conviveRepository });

    const convive = await renameConvive({ id: 'c2', name: '  Aurélia  ' });

    expect(convive.name).toBe('Aurélia');
    expect(conviveRepository.byId('c2')?.name).toBe('Aurélia');
  });

  it('refuse un nouveau prénom vide, avec la même erreur qu’à la création', async () => {
    const conviveRepository = await foyerSeedeAvecRoryEtAurelie();
    const renameConvive = renameConviveUseCase({ conviveRepository });

    await expect(renameConvive({ id: 'c2', name: '   ' })).rejects.toThrow(
      'Le nom du convive est obligatoire',
    );
  });

  it('ne persiste rien quand le nouveau prénom est invalide', async () => {
    const conviveRepository = await foyerSeedeAvecRoryEtAurelie();
    const saveCountAvant = conviveRepository.saveCount;
    const renameConvive = renameConviveUseCase({ conviveRepository });

    await expect(renameConvive({ id: 'c2', name: '   ' })).rejects.toThrow();

    expect(conviveRepository.saveCount).toBe(saveCountAvant);
    expect(conviveRepository.byId('c2')?.name).toBe('Aurélie');
  });

  it('refuse de renommer un convive qui n’existe pas', async () => {
    const conviveRepository = await foyerSeedeAvecRoryEtAurelie();
    const renameConvive = renameConviveUseCase({ conviveRepository });

    await expect(renameConvive({ id: 'inconnu', name: 'Aurélia' })).rejects.toThrow(
      "Le convive à renommer n'existe pas",
    );
  });

  it('ne ressuscite pas un convive supprimé entre-temps', async () => {
    const conviveRepository = await foyerSeedeAvecRoryEtAurelie();
    await conviveRepository.remove('c2');
    const saveCountAvant = conviveRepository.saveCount;
    const renameConvive = renameConviveUseCase({ conviveRepository });

    await expect(renameConvive({ id: 'c2', name: 'Aurélia' })).rejects.toThrow();

    expect(conviveRepository.saveCount).toBe(saveCountAvant);
    const foyer = await conviveRepository.findAll();
    expect(foyer.map((c) => c.id)).toEqual(['c1']);
  });

  it('écrit exactement une fois', async () => {
    const conviveRepository = await foyerSeedeAvecRoryEtAurelie();
    const saveCountAvant = conviveRepository.saveCount;
    const renameConvive = renameConviveUseCase({ conviveRepository });

    await renameConvive({ id: 'c2', name: 'Aurélia' });

    expect(conviveRepository.updateCount).toBe(1);
    expect(conviveRepository.saveCount).toBe(saveCountAvant);
  });

  it('propage la panne du dépôt, sans la traduire en absence', async () => {
    const conviveRepository: ConviveRepository = {
      save: () => Promise.resolve(),
      findAll: () => Promise.resolve([]),
      updateExisting: () => Promise.reject(RepositoryUnavailableError.create()),
      remove: () => Promise.resolve(),
      observeAll: () => () => {},
    };
    const renameConvive = renameConviveUseCase({ conviveRepository });

    await expect(renameConvive({ id: 'c2', name: 'Aurélia' })).rejects.toThrow(
      "Le dépôt n'a pas répondu.",
    );
  });

  it('propage une erreur quelconque du dépôt', async () => {
    const conviveRepository: ConviveRepository = {
      save: () => Promise.resolve(),
      findAll: () => Promise.resolve([]),
      updateExisting: () => Promise.reject(new Error('boom')),
      remove: () => Promise.resolve(),
      observeAll: () => () => {},
    };
    const renameConvive = renameConviveUseCase({ conviveRepository });

    await expect(renameConvive({ id: 'c2', name: 'Aurélia' })).rejects.toThrow('boom');
  });
});
