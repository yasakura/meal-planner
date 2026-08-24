import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type Firestore,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDocsFromServer,
  onSnapshot,
  runTransaction,
  setDoc,
} from 'firebase/firestore';
import { FirestoreConviveRepository } from './firestore-convive-repository';
import { conviveToDocument } from './convive-mapper';
import { ConviveBuilder } from '../domain/test-builders/convive.builder';
import { isRepositoryUnavailable } from '../domain/errors/repository-unavailable-error';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
  getDocsFromServer: vi.fn(),
  runTransaction: vi.fn(),
  onSnapshot: vi.fn(),
}));

const mockedDoc = vi.mocked(doc);
const mockedSetDoc = vi.mocked(setDoc);
const mockedDeleteDoc = vi.mocked(deleteDoc);
const mockedCollection = vi.mocked(collection);
const mockedRunTransaction = vi.mocked(runTransaction);
const mockedGetDocs = vi.mocked(getDocs);
const mockedGetDocsFromServer = vi.mocked(getDocsFromServer);
const mockedOnSnapshot = vi.mocked(onSnapshot);

function firestoreError(code: string): Error {
  return Object.assign(new Error(`firestore: ${code}`), { code, name: 'FirebaseError' });
}

describe('FirestoreConviveRepository', () => {
  const db = { marker: 'db-sentinel' } as unknown as Firestore;

  beforeEach(() => {
    mockedDoc.mockReset();
    mockedSetDoc.mockReset();
    mockedDeleteDoc.mockReset();
    mockedCollection.mockReset();
    mockedRunTransaction.mockReset();
    mockedGetDocs.mockReset();
    mockedGetDocsFromServer.mockReset();
  });

  it('save écrit le convive à convives/{id} avec le document mappé', async () => {
    const docRef = { marker: 'doc-ref-sentinel' };
    mockedDoc.mockReturnValue(docRef as never);
    mockedSetDoc.mockResolvedValue(undefined);
    const convive = ConviveBuilder.aConvive().withId('convive-42').build();
    const repository = FirestoreConviveRepository.create(db);

    await repository.save(convive);

    expect(mockedDoc).toHaveBeenCalledWith(db, 'convives', 'convive-42');
    expect(mockedSetDoc).toHaveBeenCalledWith(docRef, conviveToDocument(convive));
  });

  it("save propage l'erreur Firestore sans l'avaler", async () => {
    mockedDoc.mockReturnValue({} as never);
    mockedSetDoc.mockRejectedValue(new Error('permission-denied'));
    const convive = ConviveBuilder.aConvive().build();
    const repository = FirestoreConviveRepository.create(db);

    await expect(repository.save(convive)).rejects.toThrow('permission-denied');
  });

  it("findAll lit la collection 'convives' et mappe chaque document via documentToConvive", async () => {
    const collectionRef = { marker: 'collection-ref-sentinel' };
    mockedCollection.mockReturnValue(collectionRef as never);
    const conviveA = ConviveBuilder.aConvive().withId('convive-a').withName('Aurélie').build();
    const conviveB = ConviveBuilder.aConvive().withId('convive-b').withName('Benoît').build();
    const snapshot = {
      docs: [
        { id: 'convive-a', data: () => conviveToDocument(conviveA) },
        { id: 'convive-b', data: () => conviveToDocument(conviveB) },
      ],
    };
    mockedGetDocs.mockResolvedValue(snapshot as never);
    const repository = FirestoreConviveRepository.create(db);

    const convives = await repository.findAll();

    expect(mockedCollection).toHaveBeenCalledWith(db, 'convives');
    expect(mockedGetDocs).toHaveBeenCalledWith(collectionRef);
    expect(convives).toHaveLength(2);
    expect(convives.map((c) => c.id)).toEqual(['convive-a', 'convive-b']);
    expect(convives.map((c) => c.name)).toEqual(['Aurélie', 'Benoît']);
  });

  it("findAll propage l'erreur Firestore sans l'avaler", async () => {
    mockedCollection.mockReturnValue({} as never);
    mockedGetDocs.mockRejectedValue(new Error('permission-denied'));
    const repository = FirestoreConviveRepository.create(db);

    await expect(repository.findAll()).rejects.toThrow('permission-denied');
  });

  it("findAll accepte le repli sur le cache Firestore, et n'exige jamais le serveur", async () => {
    const collectionRef = { marker: 'collection-ref-sentinel' };
    mockedCollection.mockReturnValue(collectionRef as never);
    mockedGetDocs.mockResolvedValue({ docs: [] } as never);
    mockedGetDocsFromServer.mockResolvedValue({ docs: [] } as never);
    const repository = FirestoreConviveRepository.create(db);

    await repository.findAll();

    expect(mockedGetDocs).toHaveBeenCalledWith(collectionRef);
    expect(mockedGetDocsFromServer).not.toHaveBeenCalled();
  });

  it('traduit une lecture impossible faute de réseau en indisponibilité de dépôt', async () => {
    mockedCollection.mockReturnValue({} as never);
    mockedGetDocs.mockRejectedValue(firestoreError('unavailable'));
    const repository = FirestoreConviveRepository.create(db);

    await expect(repository.findAll()).rejects.toSatisfy(isRepositoryUnavailable);
  });

  it("ne traduit pas un refus de permission en indisponibilité : l'erreur remonte telle quelle", async () => {
    mockedCollection.mockReturnValue({} as never);
    const refus = firestoreError('permission-denied');
    mockedGetDocs.mockRejectedValue(refus);
    const repository = FirestoreConviveRepository.create(db);

    await expect(repository.findAll()).rejects.toBe(refus);
  });

  it("laisse passer une valeur rejetée qui n'est pas un objet, sans crasher la traduction", async () => {
    mockedCollection.mockReturnValue({} as never);
    const repository = FirestoreConviveRepository.create(db);

    mockedGetDocs.mockRejectedValue('boom');
    await expect(repository.findAll()).rejects.toBe('boom');

    mockedGetDocs.mockRejectedValue(null);
    await expect(repository.findAll()).rejects.toBeNull();
  });

  it("traduit un refus d'écriture faute de réseau en indisponibilité de dépôt", async () => {
    mockedDoc.mockReturnValue({} as never);
    mockedSetDoc.mockRejectedValue(firestoreError('unavailable'));
    const repository = FirestoreConviveRepository.create(db);

    await expect(repository.save(ConviveBuilder.aConvive().build())).rejects.toSatisfy(
      isRepositoryUnavailable,
    );
  });

  it("ne laisse aucune borne en suspens une fois l'écriture acquittée", async () => {
    vi.useFakeTimers();
    try {
      mockedDoc.mockReturnValue({} as never);
      mockedSetDoc.mockResolvedValue(undefined);
      const repository = FirestoreConviveRepository.create(db);

      await repository.save(ConviveBuilder.aConvive().build());
      await Promise.resolve();

      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it(
    "signale une écriture que le serveur n'a pas acquittée dans la borne d'attente",
    { timeout: 1000 },
    async () => {
      mockedDoc.mockReturnValue({} as never);
      mockedSetDoc.mockReturnValue(new Promise<void>(() => {}));
      const repository = FirestoreConviveRepository.create(db, { ackTimeoutMs: 10 });

      await expect(repository.save(ConviveBuilder.aConvive().build())).rejects.toSatisfy(
        isRepositoryUnavailable,
      );
    },
  );

  it('remove efface le document convives/{id}', async () => {
    const docRef = { marker: 'doc-ref-sentinel' };
    mockedDoc.mockReturnValue(docRef as never);
    mockedDeleteDoc.mockResolvedValue(undefined);
    const repository = FirestoreConviveRepository.create(db);

    await repository.remove('convive-42');

    expect(mockedDoc).toHaveBeenCalledWith(db, 'convives', 'convive-42');
    expect(mockedDeleteDoc).toHaveBeenCalledWith(docRef);
  });

  it('remove traduit un effacement impossible faute de réseau en indisponibilité de dépôt', async () => {
    mockedDoc.mockReturnValue({} as never);
    mockedDeleteDoc.mockRejectedValue(firestoreError('unavailable'));
    const repository = FirestoreConviveRepository.create(db);

    await expect(repository.remove('convive-42')).rejects.toSatisfy(isRepositoryUnavailable);
  });

  it("remove ne traduit pas un refus de permission en indisponibilité : l'erreur remonte telle quelle", async () => {
    mockedDoc.mockReturnValue({} as never);
    const refus = firestoreError('permission-denied');
    mockedDeleteDoc.mockRejectedValue(refus);
    const repository = FirestoreConviveRepository.create(db);

    await expect(repository.remove('convive-42')).rejects.toBe(refus);
  });

  it(
    "signale un effacement que le serveur n'a pas acquitté dans la borne d'attente",
    { timeout: 1000 },
    async () => {
      mockedDoc.mockReturnValue({} as never);
      mockedDeleteDoc.mockReturnValue(new Promise<void>(() => {}));
      const repository = FirestoreConviveRepository.create(db, { ackTimeoutMs: 10 });

      await expect(repository.remove('convive-42')).rejects.toSatisfy(isRepositoryUnavailable);
    },
  );

  it("ne laisse aucune borne en suspens une fois l'effacement acquitté", async () => {
    vi.useFakeTimers();
    try {
      mockedDoc.mockReturnValue({} as never);
      mockedDeleteDoc.mockResolvedValue(undefined);
      const repository = FirestoreConviveRepository.create(db);

      await repository.remove('convive-42');
      await Promise.resolve();

      expect(mockedDeleteDoc).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  function transactionLisant(snapshot: unknown) {
    const tx = { get: vi.fn().mockResolvedValue(snapshot), set: vi.fn() };
    mockedRunTransaction.mockImplementation((_db, updateFunction) =>
      (updateFunction as (t: unknown) => Promise<unknown>)(tx),
    );
    return tx;
  }

  it('updateExisting lit et réécrit convives/{id} DANS la transaction, en appliquant la transformation', async () => {
    const docRef = { marker: 'doc-ref-sentinel' };
    mockedDoc.mockReturnValue(docRef as never);
    const convive = ConviveBuilder.aConvive().withId('convive-42').withName('Aurélie').build();
    const tx = transactionLisant({
      id: 'convive-42',
      exists: () => true,
      data: () => conviveToDocument(convive),
    });
    const repository = FirestoreConviveRepository.create(db);

    const renomme = await repository.updateExisting('convive-42', (existing) =>
      ConviveBuilder.aConvive().withId(existing.id).withName('Alix').build(),
    );

    expect(mockedDoc).toHaveBeenCalledWith(db, 'convives', 'convive-42');
    expect(tx.get).toHaveBeenCalledWith(docRef);
    expect(tx.set).toHaveBeenCalledWith(docRef, conviveToDocument(renomme!));
    expect(renomme).toEqual({ id: 'convive-42', name: 'Alix' });
  });

  it("updateExisting rend undefined et n'écrit rien quand le convive n'existe pas", async () => {
    mockedDoc.mockReturnValue({} as never);
    const tx = transactionLisant({ exists: () => false });
    const repository = FirestoreConviveRepository.create(db);

    const renomme = await repository.updateExisting('inconnu', () => {
      throw new Error('la transformation ne doit pas être appelée sur un convive absent');
    });

    expect(renomme).toBeUndefined();
    expect(tx.set).not.toHaveBeenCalled();
  });

  it("updateExisting n'écrit rien et propage l'erreur quand la transformation refuse", async () => {
    mockedDoc.mockReturnValue({} as never);
    const convive = ConviveBuilder.aConvive().withId('convive-42').build();
    const tx = transactionLisant({
      id: 'convive-42',
      exists: () => true,
      data: () => conviveToDocument(convive),
    });
    const repository = FirestoreConviveRepository.create(db);

    await expect(
      repository.updateExisting('convive-42', () => {
        throw new Error('Le nom du convive est obligatoire');
      }),
    ).rejects.toThrow('Le nom du convive est obligatoire');
    expect(tx.set).not.toHaveBeenCalled();
  });

  it('updateExisting traduit une transaction impossible faute de réseau en indisponibilité de dépôt', async () => {
    mockedDoc.mockReturnValue({} as never);
    mockedRunTransaction.mockRejectedValue(firestoreError('unavailable'));
    const repository = FirestoreConviveRepository.create(db);

    await expect(repository.updateExisting('convive-42', (existing) => existing)).rejects.toSatisfy(
      isRepositoryUnavailable,
    );
  });

  it("updateExisting ne traduit pas un refus de permission en indisponibilité : l'erreur remonte telle quelle", async () => {
    mockedDoc.mockReturnValue({} as never);
    const refus = firestoreError('permission-denied');
    mockedRunTransaction.mockRejectedValue(refus);
    const repository = FirestoreConviveRepository.create(db);

    await expect(repository.updateExisting('convive-42', (existing) => existing)).rejects.toBe(
      refus,
    );
  });

  it(
    "signale une transaction que le serveur n'a pas acquittée dans la borne d'attente",
    { timeout: 1000 },
    async () => {
      mockedDoc.mockReturnValue({} as never);
      mockedRunTransaction.mockReturnValue(new Promise(() => {}));
      const repository = FirestoreConviveRepository.create(db, { ackTimeoutMs: 10 });

      await expect(
        repository.updateExisting('convive-42', (existing) => existing),
      ).rejects.toSatisfy(isRepositoryUnavailable);
    },
  );

  it('ne laisse aucune borne en suspens une fois la transaction acquittée', async () => {
    vi.useFakeTimers();
    try {
      mockedDoc.mockReturnValue({} as never);
      transactionLisant({ exists: () => false });
      const repository = FirestoreConviveRepository.create(db);

      await repository.updateExisting('convive-42', (existing) => existing);
      await Promise.resolve();

      expect(mockedRunTransaction).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it(
    "findAll signale une lecture que le serveur n'a pas rendue dans la borne d'attente",
    { timeout: 1000 },
    async () => {
      mockedCollection.mockReturnValue({} as never);
      mockedGetDocs.mockReturnValue(new Promise(() => {}) as never);
      const repository = FirestoreConviveRepository.create(db, { readTimeoutMs: 10 });

      await expect(repository.findAll()).rejects.toSatisfy(isRepositoryUnavailable);
    },
  );
});

type ObservedSnapshot = { docs: { id: string; data: () => unknown }[] };

function abonnementCourant(): {
  reference: unknown;
  emettre: (snapshot: ObservedSnapshot) => void;
  echouer: (error: unknown) => void;
} {
  const [reference, emettre, echouer] = mockedOnSnapshot.mock.calls[0] as unknown as [
    unknown,
    (snapshot: ObservedSnapshot) => void,
    (error: unknown) => void,
  ];
  return { reference, emettre, echouer };
}

describe("FirestoreConviveRepository — observation de la collection 'convives'", () => {
  const db = { marker: 'db-sentinel' } as unknown as Firestore;
  const aurelie = ConviveBuilder.aConvive().withId('convive-a').withName('Aurélie').build();
  const benoit = ConviveBuilder.aConvive().withId('convive-b').withName('Benoît').build();
  const documentDe = (convive: typeof aurelie) => ({
    id: convive.id,
    data: () => conviveToDocument(convive),
  });

  beforeEach(() => {
    mockedCollection.mockReset();
    mockedOnSnapshot.mockReset();
    mockedOnSnapshot.mockReturnValue(vi.fn() as never);
  });

  it("observeAll s'abonne à la collection 'convives' et livre chaque instantané mappé, à chaque émission", () => {
    const collectionRef = { marker: 'collection-ref-sentinel' };
    mockedCollection.mockReturnValue(collectionRef as never);
    const listener = vi.fn();

    FirestoreConviveRepository.create(db).observeAll(listener, vi.fn());
    const { reference, emettre } = abonnementCourant();
    emettre({ docs: [documentDe(aurelie)] });
    emettre({ docs: [documentDe(aurelie), documentDe(benoit)] });

    expect(mockedCollection).toHaveBeenCalledWith(db, 'convives');
    expect(reference).toBe(collectionRef);
    expect(listener).toHaveBeenNthCalledWith(1, [aurelie]);
    expect(listener).toHaveBeenNthCalledWith(2, [aurelie, benoit]);
  });

  it('observeAll traduit une écoute impossible faute de réseau en indisponibilité de dépôt', () => {
    mockedCollection.mockReturnValue({} as never);
    const echecs: unknown[] = [];

    FirestoreConviveRepository.create(db).observeAll(vi.fn(), (error) => echecs.push(error));
    abonnementCourant().echouer(firestoreError('unavailable'));

    expect(echecs).toHaveLength(1);
    expect(echecs[0]).toSatisfy(isRepositoryUnavailable);
  });

  it("observeAll ne traduit pas un refus de permission en indisponibilité : l'erreur remonte telle quelle", () => {
    mockedCollection.mockReturnValue({} as never);
    const refus = firestoreError('permission-denied');
    const echecs: unknown[] = [];

    FirestoreConviveRepository.create(db).observeAll(vi.fn(), (error) => echecs.push(error));
    abonnementCourant().echouer(refus);

    expect(echecs).toEqual([refus]);
  });

  it('observeAll rend le désabonnement Firestore, et ne le déclenche pas de lui-même', () => {
    mockedCollection.mockReturnValue({} as never);
    const desabonnement = vi.fn();
    mockedOnSnapshot.mockReturnValue(desabonnement as never);

    const stop = FirestoreConviveRepository.create(db).observeAll(vi.fn(), vi.fn());

    expect(desabonnement).not.toHaveBeenCalled();
    stop();
    expect(desabonnement).toHaveBeenCalledTimes(1);
  });

  it("observeAll ne pose aucune borne d'attente : un abonnement muet ne devient jamais une indisponibilité", () => {
    vi.useFakeTimers();
    try {
      mockedCollection.mockReturnValue({} as never);
      const onError = vi.fn();

      FirestoreConviveRepository.create(db, { readTimeoutMs: 10 }).observeAll(vi.fn(), onError);
      vi.advanceTimersByTime(60_000);

      expect(vi.getTimerCount()).toBe(0);
      expect(onError).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
