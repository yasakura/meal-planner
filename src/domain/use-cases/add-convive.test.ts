import { describe, it, expect } from 'vitest';
import { addConviveUseCase } from './add-convive';
import { StubIdGenerator } from '../test-doubles/stub-id-generator';
import { InMemoryConviveRepository } from '../test-doubles/in-memory-convive-repository';
import { type ConviveRepository } from '../ports/convive-repository';

describe('addConviveUseCase', () => {
  it("attribue au convive l'id produit par le IdGenerator", async () => {
    const idGenerator = StubIdGenerator.returning('id-connu-42');
    const addConvive = addConviveUseCase({
      idGenerator,
      conviveRepository: InMemoryConviveRepository.create(),
    });

    const convive = await addConvive({ name: 'Aurélie' });

    expect(convive.id).toBe('id-connu-42');
  });

  it('appelle generate() exactement une fois', async () => {
    const idGenerator = StubIdGenerator.returning('id-connu-42');
    const addConvive = addConviveUseCase({
      idGenerator,
      conviveRepository: InMemoryConviveRepository.create(),
    });

    await addConvive({ name: 'Aurélie' });

    expect(idGenerator.callCount).toBe(1);
  });

  it('forwarde le name du input vers le convive', async () => {
    const addConvive = addConviveUseCase({
      idGenerator: StubIdGenerator.create(),
      conviveRepository: InMemoryConviveRepository.create(),
    });

    const convive = await addConvive({ name: 'Lionel' });

    expect(convive.name).toBe('Lionel');
  });

  it('persiste le convive créé dans le repository (identité de référence)', async () => {
    const conviveRepository = InMemoryConviveRepository.create();
    const addConvive = addConviveUseCase({
      idGenerator: StubIdGenerator.returning('id-connu-42'),
      conviveRepository,
    });

    const convive = await addConvive({ name: 'Aurélie' });

    expect(conviveRepository.all()).toEqual([convive]);
    expect(conviveRepository.all()[0]).toBe(convive);
  });

  it('appelle save() exactement une fois', async () => {
    const conviveRepository = InMemoryConviveRepository.create();
    const addConvive = addConviveUseCase({
      idGenerator: StubIdGenerator.create(),
      conviveRepository,
    });

    await addConvive({ name: 'Aurélie' });

    expect(conviveRepository.saveCount).toBe(1);
  });

  it('propage une erreur de persistance rejetée par le repository', async () => {
    const conviveRepository: ConviveRepository = {
      save: () => Promise.reject(new Error('boom')),
      findAll: () => Promise.resolve([]),
    };
    const addConvive = addConviveUseCase({
      idGenerator: StubIdGenerator.create(),
      conviveRepository,
    });

    await expect(addConvive({ name: 'Aurélie' })).rejects.toThrow('boom');
  });

  it("propage l'erreur de validation de la factory sur un name vide", async () => {
    const addConvive = addConviveUseCase({
      idGenerator: StubIdGenerator.create(),
      conviveRepository: InMemoryConviveRepository.create(),
    });

    await expect(addConvive({ name: '' })).rejects.toThrow('Le nom du convive est obligatoire');
  });

  it('ne persiste rien quand le input est invalide', async () => {
    const conviveRepository = InMemoryConviveRepository.create();
    const addConvive = addConviveUseCase({
      idGenerator: StubIdGenerator.create(),
      conviveRepository,
    });

    await expect(addConvive({ name: '' })).rejects.toThrow();

    expect(conviveRepository.saveCount).toBe(0);
    expect(conviveRepository.all()).toEqual([]);
  });
});
