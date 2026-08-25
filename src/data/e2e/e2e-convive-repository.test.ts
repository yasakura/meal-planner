import { describe, it, expect, vi } from 'vitest';

import { createConvive, type Convive } from '../../domain/entities/convive';
import { RepositoryUnavailableError } from '../../domain/errors/repository-unavailable-error';
import { ConviveBuilder } from '../../domain/test-builders/convive.builder';
import { E2eConviveRepository } from './e2e-convive-repository';
import { E2E_SERVER_VERDICT_MS, E2eFailureSwitch } from './e2e-failure-switch';

const alice = ConviveBuilder.aConvive().withId('c-1').withName('Alice').build();
const bruno = ConviveBuilder.aConvive().withId('c-2').withName('Bruno').build();
const chloe = ConviveBuilder.aConvive().withId('c-3').withName('Chloé').build();

function sansPanne(): E2eFailureSwitch {
  return E2eFailureSwitch.reporting(() => {});
}

describe('E2eConviveRepository', () => {
  it('rend un ordre DIFFÉRENT de l’ordre d’insertion : le port n’en garantit aucun', async () => {
    const repository = E2eConviveRepository.seededWith([alice, bruno, chloe], sansPanne());

    expect(await repository.findAll()).toEqual([chloe, alice, bruno]);
  });

  it('enregistre un convive, en UPSERT : même id, entrée remplacée', async () => {
    const repository = E2eConviveRepository.seededWith([alice], sansPanne());

    await repository.save(createConvive({ id: 'c-1', name: 'Alicia' }));

    expect(await repository.findAll()).toEqual([createConvive({ id: 'c-1', name: 'Alicia' })]);
  });

  it('réécrit le convive existant sous son propre id', async () => {
    const repository = E2eConviveRepository.seededWith([alice], sansPanne());

    await repository.updateOnlyIfExists(createConvive({ id: 'c-1', name: 'Alicia' }));

    expect(await repository.findAll()).toEqual([createConvive({ id: 'c-1', name: 'Alicia' })]);
  });

  it('n’écrit rien quand l’id est inconnu : le port ne promet aucune création', async () => {
    const repository = E2eConviveRepository.seededWith([alice], sansPanne());

    await repository.updateOnlyIfExists(createConvive({ id: 'inconnu', name: 'Alicia' }));

    expect(await repository.findAll()).toEqual([alice]);
  });

  it('efface le convive demandé', async () => {
    const repository = E2eConviveRepository.seededWith([alice, bruno], sansPanne());

    await repository.remove('c-1');

    expect(await repository.findAll()).toEqual([bruno]);
  });

  it('efface un id inconnu en succès silencieux : le port est idempotent', async () => {
    const repository = E2eConviveRepository.seededWith([alice], sansPanne());

    await expect(repository.remove('inconnu')).resolves.toBeUndefined();
    expect(await repository.findAll()).toEqual([alice]);
  });

  it('rejette findAll avec RepositoryUnavailableError quand les lectures sont en panne', async () => {
    const failures = sansPanne();
    const repository = E2eConviveRepository.seededWith([alice], failures);

    failures.failReads();

    await expect(repository.findAll()).rejects.toBeInstanceOf(RepositoryUnavailableError);
  });

  it('failWrites : save est pris tout de suite, puis annulé quand le serveur le refuse', async () => {
    const onWriteRejected = vi.fn();
    const failures = E2eFailureSwitch.reporting(onWriteRejected);
    const repository = E2eConviveRepository.seededWith([], failures);
    failures.failWrites();

    await repository.save(alice);
    expect(await repository.findAll()).toEqual([alice]);

    await vi.waitFor(async () => {
      expect(await repository.findAll()).toEqual([]);
    });
    expect(onWriteRejected).toHaveBeenCalledTimes(1);
  });

  it('failWrites : le renommage est pris tout de suite, puis annulé quand le serveur le refuse', async () => {
    const onWriteRejected = vi.fn();
    const failures = E2eFailureSwitch.reporting(onWriteRejected);
    const repository = E2eConviveRepository.seededWith([alice], failures);
    failures.failWrites();

    await repository.updateOnlyIfExists(createConvive({ id: 'c-1', name: 'Alicia' }));
    expect(await repository.findAll()).toEqual([createConvive({ id: 'c-1', name: 'Alicia' })]);

    await vi.waitFor(async () => {
      expect(await repository.findAll()).toEqual([alice]);
    });
    expect(onWriteRejected).toHaveBeenCalledTimes(1);
  });

  it('failWrites : le retrait est pris tout de suite, puis annulé quand le serveur le refuse', async () => {
    const onWriteRejected = vi.fn();
    const failures = E2eFailureSwitch.reporting(onWriteRejected);
    const repository = E2eConviveRepository.seededWith([alice], failures);
    failures.failWrites();

    await repository.remove('c-1');
    expect(await repository.findAll()).toEqual([]);

    await vi.waitFor(async () => {
      expect(await repository.findAll()).toEqual([alice]);
    });
    expect(onWriteRejected).toHaveBeenCalledTimes(1);
  });

  it('le refus d’une écriture n’efface pas celle faite après le rétablissement', async () => {
    const onWriteRejected = vi.fn();
    const failures = E2eFailureSwitch.reporting(onWriteRejected);
    const repository = E2eConviveRepository.seededWith([], failures);

    failures.failWrites();
    await repository.save(alice);
    failures.restore();
    await repository.save(bruno);

    await vi.waitFor(() => expect(onWriteRejected).toHaveBeenCalledTimes(1));
    expect(await repository.findAll()).toEqual([bruno]);
  });

  it('deux refus dans la même fenêtre annulent chacun leur écriture, pas la collection entière', async () => {
    const onWriteRejected = vi.fn();
    const failures = E2eFailureSwitch.reporting(onWriteRejected);
    const repository = E2eConviveRepository.seededWith([], failures);
    failures.failWrites();

    await repository.save(alice);
    await repository.save(bruno);

    await vi.waitFor(() => expect(onWriteRejected).toHaveBeenCalledTimes(2));
    expect(await repository.findAll()).toEqual([]);
  });

  it('deux refus sur le MÊME convive rendent la valeur d’origine, pas la première refusée', async () => {
    const onWriteRejected = vi.fn();
    const failures = E2eFailureSwitch.reporting(onWriteRejected);
    const repository = E2eConviveRepository.seededWith([alice], failures);
    failures.failWrites();

    await repository.save(createConvive({ id: 'c-1', name: 'Alicia' }));
    await repository.save(createConvive({ id: 'c-1', name: 'Alix' }));

    await vi.waitFor(() => expect(onWriteRejected).toHaveBeenCalledTimes(2));
    expect(await repository.findAll()).toEqual([alice]);
  });

  it('un ajout refusé puis un retrait refusé du MÊME convive ne laissent rien derrière eux', async () => {
    const onWriteRejected = vi.fn();
    const failures = E2eFailureSwitch.reporting(onWriteRejected);
    const repository = E2eConviveRepository.seededWith([], failures);
    failures.failWrites();

    await repository.save(alice);
    await repository.remove('c-1');

    await vi.waitFor(() => expect(onWriteRejected).toHaveBeenCalledTimes(2));
    expect(await repository.findAll()).toEqual([]);
  });

  it('le refus d’un enregistrement ne défait pas la réécriture du MÊME convive faite depuis', async () => {
    const onWriteRejected = vi.fn();
    const failures = E2eFailureSwitch.reporting(onWriteRejected);
    const repository = E2eConviveRepository.seededWith([], failures);
    const alicia = createConvive({ id: 'c-1', name: 'Alicia' });

    failures.failWrites();
    await repository.save(alice);
    failures.restore();
    await repository.save(alicia);

    await vi.waitFor(() => expect(onWriteRejected).toHaveBeenCalledTimes(1));
    expect(await repository.findAll()).toEqual([alicia]);
  });

  it('renommer un id inconnu est acquitté localement, puis refusé par le serveur', async () => {
    const onWriteRejected = vi.fn();
    const failures = E2eFailureSwitch.reporting(onWriteRejected);
    const repository = E2eConviveRepository.seededWith([alice], failures);

    await expect(
      repository.updateOnlyIfExists(createConvive({ id: 'inconnu', name: 'Alicia' })),
    ).resolves.toBeUndefined();

    await vi.waitFor(() => expect(onWriteRejected).toHaveBeenCalledTimes(1));
    expect(await repository.findAll()).toEqual([alice]);
  });

  it('renommer un convive PRÉSENT ne réveille aucun refus du serveur', async () => {
    const onWriteRejected = vi.fn();
    const failures = E2eFailureSwitch.reporting(onWriteRejected);
    const repository = E2eConviveRepository.seededWith([alice], failures);

    await repository.updateOnlyIfExists(createConvive({ id: 'c-1', name: 'Alicia' }));
    await new Promise((resolve) => setTimeout(resolve, E2E_SERVER_VERDICT_MS + 50));

    expect(onWriteRejected).not.toHaveBeenCalled();
    expect(await repository.findAll()).toEqual([createConvive({ id: 'c-1', name: 'Alicia' })]);
  });
});

describe('E2eConviveRepository — observation', () => {
  it("livre l'instantané courant dès l'abonnement, dans un ordre DIFFÉRENT de l'ordre d'insertion", () => {
    const repository = E2eConviveRepository.seededWith([alice, bruno], sansPanne());
    const instantanes: (readonly Convive[])[] = [];

    repository.observeAll(
      (convives) => instantanes.push(convives),
      () => {},
    );

    expect(instantanes).toEqual([[bruno, alice]]);
  });

  it('réémet la liste entière à chaque enregistrement, mise à jour et retrait', async () => {
    const repository = E2eConviveRepository.seededWith([], sansPanne());
    const instantanes: (readonly Convive[])[] = [];
    repository.observeAll(
      (convives) => instantanes.push(convives),
      () => {},
    );

    await repository.save(alice);
    const alicia = createConvive({ id: 'c-1', name: 'Alicia' });
    await repository.updateOnlyIfExists(alicia);
    await repository.remove('c-1');

    expect(instantanes).toEqual([[], [alice], [alicia], []]);
  });

  it("n'émet plus rien une fois le désabonnement appelé", async () => {
    const repository = E2eConviveRepository.seededWith([], sansPanne());
    const instantanes: (readonly Convive[])[] = [];
    const stop = repository.observeAll(
      (convives) => instantanes.push(convives),
      () => {},
    );
    await repository.save(alice);
    expect(instantanes).toHaveLength(2);

    stop();
    await repository.save(bruno);

    expect(instantanes).toHaveLength(2);
  });

  it("signale l'indisponibilité sur le canal d'erreur quand les lectures sont en panne, au lieu de livrer un instantané", () => {
    const failures = sansPanne();
    const repository = E2eConviveRepository.seededWith([alice], failures);
    const instantanes: (readonly Convive[])[] = [];
    const echecs: unknown[] = [];

    failures.failReads();
    repository.observeAll(
      (convives) => instantanes.push(convives),
      (error) => echecs.push(error),
    );

    expect(echecs).toHaveLength(1);
    expect(echecs[0]).toBeInstanceOf(RepositoryUnavailableError);
    expect(instantanes).toEqual([]);
  });
});
