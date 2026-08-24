import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type Firestore,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDocsFromServer,
  onSnapshot,
  updateDoc,
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
  updateDoc: vi.fn(),
  onSnapshot: vi.fn(),
}));

const mockedDoc = vi.mocked(doc);
const mockedSetDoc = vi.mocked(setDoc);
const mockedDeleteDoc = vi.mocked(deleteDoc);
const mockedCollection = vi.mocked(collection);
const mockedUpdateDoc = vi.mocked(updateDoc);
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
    mockedUpdateDoc.mockReset();
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

  it('remove efface le document convives/{id}', async () => {
    const docRef = { marker: 'doc-ref-sentinel' };
    mockedDoc.mockReturnValue(docRef as never);
    mockedDeleteDoc.mockResolvedValue(undefined);
    const repository = FirestoreConviveRepository.create(db);

    await repository.remove('convive-42');

    expect(mockedDoc).toHaveBeenCalledWith(db, 'convives', 'convive-42');
    expect(mockedDeleteDoc).toHaveBeenCalledWith(docRef);
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

  it("updateOnlyIfExists passe par updateDoc : le refus d'un convive absent revient du serveur, pas d'une lecture préalable", async () => {
    const docRef = { marker: 'doc-ref-sentinel' };
    mockedDoc.mockReturnValue(docRef as never);
    mockedUpdateDoc.mockResolvedValue(undefined);
    const convive = ConviveBuilder.aConvive().withId('convive-42').withName('Aurélie').build();
    const repository = FirestoreConviveRepository.create(db);

    await repository.updateOnlyIfExists(convive);

    expect(mockedDoc).toHaveBeenCalledWith(db, 'convives', 'convive-42');
    expect(mockedUpdateDoc).toHaveBeenCalledWith(docRef, conviveToDocument(convive));
    expect(mockedSetDoc).not.toHaveBeenCalled();
  });

  it(
    "updateOnlyIfExists rend la main dès que Firestore a pris la modification, sans attendre l'acquittement du serveur",
    { timeout: 1000 },
    async () => {
      mockedDoc.mockReturnValue({} as never);
      mockedUpdateDoc.mockReturnValue(new Promise<void>(() => {}));
      const repository = FirestoreConviveRepository.create(db, { onWriteRejected: vi.fn() });

      await expect(
        repository.updateOnlyIfExists(ConviveBuilder.aConvive().build()),
      ).resolves.toBeUndefined();
    },
  );

  it(
    "save rend la main dès que Firestore a pris l'écriture, sans attendre l'acquittement du serveur",
    { timeout: 1000 },
    async () => {
      mockedDoc.mockReturnValue({} as never);
      mockedSetDoc.mockReturnValue(new Promise<void>(() => {}));
      const repository = FirestoreConviveRepository.create(db, { onWriteRejected: vi.fn() });

      await expect(repository.save(ConviveBuilder.aConvive().build())).resolves.toBeUndefined();
    },
  );

  it(
    "remove rend la main dès que Firestore a pris le retrait, sans attendre l'acquittement du serveur",
    { timeout: 1000 },
    async () => {
      mockedDoc.mockReturnValue({} as never);
      mockedDeleteDoc.mockReturnValue(new Promise<void>(() => {}));
      const repository = FirestoreConviveRepository.create(db, { onWriteRejected: vi.fn() });

      await expect(repository.remove('convive-42')).resolves.toBeUndefined();
    },
  );

  it(
    'un retrait refusé par le serveur après coup ne reprend pas la main : il part au constat global',
    { timeout: 1000 },
    async () => {
      mockedDoc.mockReturnValue({} as never);
      let refuser: (raison: unknown) => void = () => {};
      mockedDeleteDoc.mockReturnValue(
        new Promise<void>((_resolve, reject) => {
          refuser = reject;
        }),
      );
      const onWriteRejected = vi.fn();
      const repository = FirestoreConviveRepository.create(db, { onWriteRejected });

      await expect(repository.remove('convive-42')).resolves.toBeUndefined();
      refuser(firestoreError('permission-denied'));

      await vi.waitFor(() => {
        expect(onWriteRejected).toHaveBeenCalledTimes(1);
      });
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
