import { describe, it, expect } from 'vitest';

import { createConvive } from '../../domain/entities/convive';
import { RepositoryUnavailableError } from '../../domain/errors/repository-unavailable-error';
import { ConviveBuilder } from '../../domain/test-builders/convive.builder';
import { E2eConviveRepository } from './e2e-convive-repository';
import { E2eFailureSwitch } from './e2e-failure-switch';

const alice = ConviveBuilder.aConvive().withId('c-1').withName('Alice').build();
const bruno = ConviveBuilder.aConvive().withId('c-2').withName('Bruno').build();
const chloe = ConviveBuilder.aConvive().withId('c-3').withName('Chloé').build();

describe('E2eConviveRepository', () => {
  it('rend un ordre DIFFÉRENT de l’ordre d’insertion : le port n’en garantit aucun', async () => {
    const repository = E2eConviveRepository.seededWith(
      [alice, bruno, chloe],
      E2eFailureSwitch.create(),
    );

    expect(await repository.findAll()).toEqual([chloe, bruno, alice]);
  });

  it('enregistre un convive, en UPSERT : même id, entrée remplacée', async () => {
    const repository = E2eConviveRepository.seededWith([alice], E2eFailureSwitch.create());

    await repository.save(createConvive({ id: 'c-1', name: 'Alicia' }));

    expect(await repository.findAll()).toEqual([createConvive({ id: 'c-1', name: 'Alicia' })]);
  });

  it('transforme et réécrit le convive existant, et rend le résultat', async () => {
    const repository = E2eConviveRepository.seededWith([alice], E2eFailureSwitch.create());

    const updated = await repository.updateExisting('c-1', (existing) =>
      createConvive({ id: existing.id, name: 'Alicia' }),
    );

    expect(updated).toEqual(createConvive({ id: 'c-1', name: 'Alicia' }));
    expect(await repository.findAll()).toEqual([createConvive({ id: 'c-1', name: 'Alicia' })]);
  });

  it('REJOUE transform : le port prévient qu’une transaction rejoue son corps', async () => {
    const repository = E2eConviveRepository.seededWith([alice], E2eFailureSwitch.create());
    let appels = 0;

    await repository.updateExisting('c-1', (existing) => {
      appels += 1;
      return createConvive({ id: existing.id, name: 'Alicia' });
    });

    expect(appels).toBe(2);
  });

  it('écrit sous l’id DEMANDÉ, jamais sous celui rendu par transform', async () => {
    const repository = E2eConviveRepository.seededWith([alice], E2eFailureSwitch.create());

    await repository.updateExisting('c-1', () => createConvive({ id: 'autre-id', name: 'Alicia' }));

    expect(await repository.findAll()).toEqual([createConvive({ id: 'autre-id', name: 'Alicia' })]);
    expect(await repository.updateExisting('autre-id', (existing) => existing)).toBeUndefined();
  });

  it('rend undefined et n’écrit rien quand l’id est inconnu', async () => {
    const repository = E2eConviveRepository.seededWith([alice], E2eFailureSwitch.create());

    const updated = await repository.updateExisting('inconnu', (existing) => existing);

    expect(updated).toBeUndefined();
    expect(await repository.findAll()).toEqual([alice]);
  });

  it('efface le convive demandé', async () => {
    const repository = E2eConviveRepository.seededWith([alice, bruno], E2eFailureSwitch.create());

    await repository.remove('c-1');

    expect(await repository.findAll()).toEqual([bruno]);
  });

  it('efface un id inconnu en succès silencieux : le port est idempotent', async () => {
    const repository = E2eConviveRepository.seededWith([alice], E2eFailureSwitch.create());

    await expect(repository.remove('inconnu')).resolves.toBeUndefined();
    expect(await repository.findAll()).toEqual([alice]);
  });

  it('rejette findAll avec RepositoryUnavailableError quand les lectures sont en panne', async () => {
    const failures = E2eFailureSwitch.create();
    const repository = E2eConviveRepository.seededWith([alice], failures);

    failures.failReads();

    await expect(repository.findAll()).rejects.toBeInstanceOf(RepositoryUnavailableError);
  });

  it('rejette save quand les écritures sont en panne, et n’enregistre rien', async () => {
    const failures = E2eFailureSwitch.create();
    const repository = E2eConviveRepository.seededWith([], failures);

    failures.failWrites();

    await expect(repository.save(alice)).rejects.toBeInstanceOf(RepositoryUnavailableError);
    failures.restore();
    expect(await repository.findAll()).toEqual([]);
  });

  it('rejette updateExisting quand les écritures sont en panne, et ne renomme rien', async () => {
    const failures = E2eFailureSwitch.create();
    const repository = E2eConviveRepository.seededWith([alice], failures);

    failures.failWrites();

    await expect(
      repository.updateExisting('c-1', (existing) =>
        createConvive({ id: existing.id, name: 'Alicia' }),
      ),
    ).rejects.toBeInstanceOf(RepositoryUnavailableError);
    failures.restore();
    expect(await repository.findAll()).toEqual([alice]);
  });

  it('rejette remove quand les écritures sont en panne, et n’efface rien', async () => {
    const failures = E2eFailureSwitch.create();
    const repository = E2eConviveRepository.seededWith([alice], failures);

    failures.failWrites();

    await expect(repository.remove('c-1')).rejects.toBeInstanceOf(RepositoryUnavailableError);
    failures.restore();
    expect(await repository.findAll()).toEqual([alice]);
  });

  it('un dépôt muet ne refuse pas save : c’est la borne qui le déclare indisponible, et rien n’est enregistré', async () => {
    const failures = E2eFailureSwitch.create({ ackTimeoutMs: 10 });
    const repository = E2eConviveRepository.seededWith([], failures);

    failures.hangWrites();

    await expect(repository.save(alice)).rejects.toBeInstanceOf(RepositoryUnavailableError);
    failures.restore();
    expect(await repository.findAll()).toEqual([]);
  });
});
