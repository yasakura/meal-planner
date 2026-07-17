import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type Firestore, collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { FirestoreConviveRepository } from './firestore-convive-repository';
import { conviveToDocument } from './convive-mapper';
import { ConviveBuilder } from '../domain/test-builders/convive.builder';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
}));

const mockedDoc = vi.mocked(doc);
const mockedSetDoc = vi.mocked(setDoc);
const mockedCollection = vi.mocked(collection);
const mockedGetDocs = vi.mocked(getDocs);

describe('FirestoreConviveRepository', () => {
  const db = { marker: 'db-sentinel' } as unknown as Firestore;

  beforeEach(() => {
    mockedDoc.mockReset();
    mockedSetDoc.mockReset();
    mockedCollection.mockReset();
    mockedGetDocs.mockReset();
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
});
