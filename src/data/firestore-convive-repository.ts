import {
  type Firestore,
  collection,
  deleteDoc,
  doc,
  getDocsFromServer,
  runTransaction,
  setDoc,
} from 'firebase/firestore';

import { type ConviveRepository } from '../domain/ports/convive-repository';
import { type Convive } from '../domain/entities/convive';
import { conviveToDocument, documentToConvive } from './convive-mapper';
import {
  DEFAULT_ACK_TIMEOUT_MS,
  DEFAULT_READ_TIMEOUT_MS,
  withServerDeadline,
} from './firestore-server-deadline';

export type FirestoreConviveRepositoryOptions = {
  ackTimeoutMs?: number;
  readTimeoutMs?: number;
};

export class FirestoreConviveRepository implements ConviveRepository {
  private constructor(
    private readonly db: Firestore,
    private readonly ackTimeoutMs: number,
    private readonly readTimeoutMs: number,
  ) {}

  static create(
    db: Firestore,
    options?: FirestoreConviveRepositoryOptions,
  ): FirestoreConviveRepository {
    return new FirestoreConviveRepository(
      db,
      options?.ackTimeoutMs ?? DEFAULT_ACK_TIMEOUT_MS,
      options?.readTimeoutMs ?? DEFAULT_READ_TIMEOUT_MS,
    );
  }

  async save(convive: Convive): Promise<void> {
    await withServerDeadline(
      setDoc(doc(this.db, 'convives', convive.id), conviveToDocument(convive)),
      this.ackTimeoutMs,
    );
  }

  async findAll(): Promise<Convive[]> {
    const snapshot = await withServerDeadline(
      getDocsFromServer(collection(this.db, 'convives')),
      this.readTimeoutMs,
    );
    return snapshot.docs.map((snapshotDoc) =>
      documentToConvive(snapshotDoc.id, snapshotDoc.data()),
    );
  }

  async updateExisting(
    id: string,
    transform: (existing: Convive) => Convive,
  ): Promise<Convive | undefined> {
    const ref = doc(this.db, 'convives', id);
    return await withServerDeadline(
      runTransaction(this.db, async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists()) return undefined;
        const updated = transform(documentToConvive(snapshot.id, snapshot.data()));
        transaction.set(ref, conviveToDocument(updated));
        return updated;
      }),
      this.ackTimeoutMs,
    );
  }

  async remove(id: string): Promise<void> {
    await withServerDeadline(deleteDoc(doc(this.db, 'convives', id)), this.ackTimeoutMs);
  }
}
