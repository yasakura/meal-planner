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
import { DEFAULT_ACK_TIMEOUT_MS, withAckDeadline } from './firestore-ack-deadline';
import { asDomainFailure } from './firestore-failure';

export type FirestoreConviveRepositoryOptions = {
  ackTimeoutMs?: number;
};

export class FirestoreConviveRepository implements ConviveRepository {
  private constructor(
    private readonly db: Firestore,
    private readonly ackTimeoutMs: number,
  ) {}

  static create(
    db: Firestore,
    options?: FirestoreConviveRepositoryOptions,
  ): FirestoreConviveRepository {
    return new FirestoreConviveRepository(db, options?.ackTimeoutMs ?? DEFAULT_ACK_TIMEOUT_MS);
  }

  async save(convive: Convive): Promise<void> {
    await withAckDeadline(
      setDoc(doc(this.db, 'convives', convive.id), conviveToDocument(convive)),
      this.ackTimeoutMs,
    );
  }

  async findAll(): Promise<Convive[]> {
    let snapshot;
    try {
      snapshot = await getDocsFromServer(collection(this.db, 'convives'));
    } catch (error) {
      throw asDomainFailure(error);
    }
    return snapshot.docs.map((snapshotDoc) =>
      documentToConvive(snapshotDoc.id, snapshotDoc.data()),
    );
  }

  async updateExisting(
    id: string,
    transform: (existing: Convive) => Convive,
  ): Promise<Convive | undefined> {
    const ref = doc(this.db, 'convives', id);
    return await withAckDeadline(
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
    await withAckDeadline(deleteDoc(doc(this.db, 'convives', id)), this.ackTimeoutMs);
  }
}
