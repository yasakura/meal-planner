import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type Firestore,
  collection,
  doc,
  getDocs,
  getDocsFromServer,
  setDoc,
} from 'firebase/firestore';
import { FirestoreConviveRepository } from './firestore-convive-repository';
import { conviveToDocument } from './convive-mapper';
import { ConviveBuilder } from '../domain/test-builders/convive.builder';
import { isRepositoryUnavailable } from '../domain/errors/repository-unavailable-error';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
  getDocsFromServer: vi.fn(),
}));

const mockedDoc = vi.mocked(doc);
const mockedSetDoc = vi.mocked(setDoc);
const mockedCollection = vi.mocked(collection);
const mockedGetDocs = vi.mocked(getDocs);
const mockedGetDocsFromServer = vi.mocked(getDocsFromServer);

// Une erreur du SDK Firestore telle qu'elle arrive à l'adapter : c'est le `code` qui
// porte la nature du problème, pas le message.
function firestoreError(code: string): Error {
  return Object.assign(new Error(`firestore: ${code}`), { code, name: 'FirebaseError' });
}

describe('FirestoreConviveRepository', () => {
  const db = { marker: 'db-sentinel' } as unknown as Firestore;

  beforeEach(() => {
    mockedDoc.mockReset();
    mockedSetDoc.mockReset();
    mockedCollection.mockReset();
    mockedGetDocs.mockReset();
    mockedGetDocsFromServer.mockReset();
  });

  it('save écrit le convive à convives/{id} avec le document mappé', async () => {
    const docRef = { marker: 'doc-ref-sentinel' };
    mockedDoc.mockReturnValue(docRef as never);
    mockedSetDoc.mockResolvedValue(undefined as never);
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
    // Re-pointé de `getDocs` vers `getDocsFromServer` : la lecture ne passe plus par le
    // cache. Assertions inchangées par ailleurs.
    mockedGetDocsFromServer.mockResolvedValue(snapshot as never);
    const repository = FirestoreConviveRepository.create(db);

    const convives = await repository.findAll();

    expect(mockedCollection).toHaveBeenCalledWith(db, 'convives');
    expect(mockedGetDocsFromServer).toHaveBeenCalledWith(collectionRef);
    expect(convives).toHaveLength(2);
    expect(convives.map((c) => c.id)).toEqual(['convive-a', 'convive-b']);
    expect(convives.map((c) => c.name)).toEqual(['Aurélie', 'Benoît']);
  });

  it("findAll propage l'erreur Firestore sans l'avaler", async () => {
    mockedCollection.mockReturnValue({} as never);
    // Re-pointé de `getDocs` vers `getDocsFromServer`. Assertion inchangée.
    mockedGetDocsFromServer.mockRejectedValue(new Error('permission-denied'));
    const repository = FirestoreConviveRepository.create(db);

    await expect(repository.findAll()).rejects.toThrow('permission-denied');
  });

  // Réseau coupé, `getDocs` NE REJETTE PAS : il sert le cache et renvoie un snapshot vide.
  // L'app affichait donc « Personne dans le foyer pour le moment. » — un foyer inventé.
  // Lire depuis le serveur est la seule façon de distinguer « rien » de « je ne sais pas ».
  it('findAll interroge le serveur et ne se rabat jamais sur le cache Firestore', async () => {
    const collectionRef = { marker: 'collection-ref-sentinel' };
    mockedCollection.mockReturnValue(collectionRef as never);
    mockedGetDocsFromServer.mockResolvedValue({ docs: [] } as never);
    const repository = FirestoreConviveRepository.create(db);

    await repository.findAll();

    expect(mockedGetDocsFromServer).toHaveBeenCalledWith(collectionRef);
    expect(mockedGetDocs).not.toHaveBeenCalled();
  });

  it('traduit une lecture impossible faute de réseau en indisponibilité de dépôt', async () => {
    mockedCollection.mockReturnValue({} as never);
    mockedGetDocsFromServer.mockRejectedValue(firestoreError('unavailable'));
    const repository = FirestoreConviveRepository.create(db);

    await expect(repository.findAll()).rejects.toSatisfy(isRepositoryUnavailable);
  });

  // Jeu DISCRIMINANT : sans cette contrainte, l'adapter pourrait traduire TOUT rejet en
  // indisponibilité, et l'app dirait « aucune connexion » à quelqu'un qui a du réseau mais
  // pas le droit de lire.
  it("ne traduit pas un refus de permission en indisponibilité : l'erreur remonte telle quelle", async () => {
    mockedCollection.mockReturnValue({} as never);
    const refus = firestoreError('permission-denied');
    mockedGetDocsFromServer.mockRejectedValue(refus);
    const repository = FirestoreConviveRepository.create(db);

    await expect(repository.findAll()).rejects.toBe(refus);
  });

  // Le canal de rejet n'est pas typé : le SDK, un intercepteur ou un mock peuvent rejeter
  // autre chose qu'un objet. La traduction doit répondre « ce n'est pas une indisponibilité »
  // et laisser passer, jamais transformer un rejet propre en TypeError obscur.
  it("laisse passer une valeur rejetée qui n'est pas un objet, sans crasher la traduction", async () => {
    mockedCollection.mockReturnValue({} as never);
    const repository = FirestoreConviveRepository.create(db);

    mockedGetDocsFromServer.mockRejectedValue('boom');
    await expect(repository.findAll()).rejects.toBe('boom');

    mockedGetDocsFromServer.mockRejectedValue(null);
    await expect(repository.findAll()).rejects.toBeNull();
  });

  // Symétrique de la lecture. Si `setDoc` rejette pour panne réseau AVANT l'expiration de la
  // borne, laisser remonter la FirebaseError brute ferait passer l'ajout en `error` au lieu
  // de `unconfirmed` — et le bouton se réarmerait, rouvrant la porte au doublon que tout le
  // verrouillage cherche à fermer.
  it("traduit un refus d'écriture faute de réseau en indisponibilité de dépôt", async () => {
    mockedDoc.mockReturnValue({} as never);
    mockedSetDoc.mockRejectedValue(firestoreError('unavailable'));
    const repository = FirestoreConviveRepository.create(db);

    await expect(repository.save(ConviveBuilder.aConvive().build())).rejects.toSatisfy(
      isRepositoryUnavailable,
    );
  });

  // La borne d'attente ne doit pas survivre à l'écriture qu'elle surveille : sans nettoyage,
  // chaque ajout réussi laisserait un timer de 5 s derrière lui.
  it("ne laisse aucune borne en suspens une fois l'écriture acquittée", async () => {
    vi.useFakeTimers();
    try {
      mockedDoc.mockReturnValue({} as never);
      mockedSetDoc.mockResolvedValue(undefined as never);
      const repository = FirestoreConviveRepository.create(db);

      await repository.save(ConviveBuilder.aConvive().build());
      await Promise.resolve();

      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  // Réseau coupé, `setDoc` ne rejette pas non plus : il met l'écriture en file locale et
  // n'acquitte qu'au serveur. Mesuré en conditions réelles : la promesse reste pending
  // indéfiniment, le bouton « Ajouter » reste désactivé, aucun message. L'adapter doit
  // borner cette attente pour que l'app puisse dire quelque chose.
  it(
    "signale une écriture que le serveur n'a pas acquittée dans la borne d'attente",
    { timeout: 1000 },
    async () => {
      mockedDoc.mockReturnValue({} as never);
      mockedSetDoc.mockReturnValue(new Promise<void>(() => {}) as never);
      const repository = FirestoreConviveRepository.create(db, { ackTimeoutMs: 10 });

      await expect(repository.save(ConviveBuilder.aConvive().build())).rejects.toSatisfy(
        isRepositoryUnavailable,
      );
    },
  );
});
