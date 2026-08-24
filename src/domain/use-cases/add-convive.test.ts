import { describe, it, expect } from 'vitest';
import { addConviveUseCase } from './add-convive';
import { InMemoryConviveRepository } from '../test-doubles/in-memory-convive-repository';
import { type ConviveRepository } from '../ports/convive-repository';

describe('addConviveUseCase', () => {
  it("attribue au convive l'id reçu en entrée", async () => {
    const addConvive = addConviveUseCase({
      conviveRepository: InMemoryConviveRepository.create(),
    });

    const convive = await addConvive({ id: 'id-recu-42', name: 'Aurélie' });

    expect(convive.id).toBe('id-recu-42');
  });

  it('forwarde le name du input vers le convive', async () => {
    const addConvive = addConviveUseCase({
      conviveRepository: InMemoryConviveRepository.create(),
    });

    const convive = await addConvive({ id: 'id-recu-42', name: 'Lionel' });

    expect(convive.name).toBe('Lionel');
  });

  it('persiste le convive créé dans le repository (identité de référence)', async () => {
    const conviveRepository = InMemoryConviveRepository.create();
    const addConvive = addConviveUseCase({ conviveRepository });

    const convive = await addConvive({ id: 'id-recu-42', name: 'Aurélie' });

    expect(conviveRepository.all()).toEqual([convive]);
    expect(conviveRepository.all()[0]).toBe(convive);
  });

  it('appelle save() exactement une fois', async () => {
    const conviveRepository = InMemoryConviveRepository.create();
    const addConvive = addConviveUseCase({ conviveRepository });

    await addConvive({ id: 'id-recu-42', name: 'Aurélie' });

    expect(conviveRepository.saveCount).toBe(1);
  });

  it('propage une erreur de persistance rejetée par le repository', async () => {
    const conviveRepository: ConviveRepository = {
      save: () => Promise.reject(new Error('boom')),
      findAll: () => Promise.resolve([]),
      updateExisting: () => Promise.resolve(undefined),
      remove: () => Promise.resolve(),
      observeAll: () => () => {},
    };
    const addConvive = addConviveUseCase({ conviveRepository });

    await expect(addConvive({ id: 'id-recu-42', name: 'Aurélie' })).rejects.toThrow('boom');
  });

  it("propage l'erreur de validation de la factory sur un name vide", async () => {
    const addConvive = addConviveUseCase({
      conviveRepository: InMemoryConviveRepository.create(),
    });

    await expect(addConvive({ id: 'id-recu-42', name: '' })).rejects.toThrow(
      'Le nom du convive est obligatoire',
    );
  });

  it('ne persiste rien quand le input est invalide', async () => {
    const conviveRepository = InMemoryConviveRepository.create();
    const addConvive = addConviveUseCase({ conviveRepository });

    await expect(addConvive({ id: 'id-recu-42', name: '' })).rejects.toThrow();

    expect(conviveRepository.saveCount).toBe(0);
    expect(conviveRepository.all()).toEqual([]);
  });
});
