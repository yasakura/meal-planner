import {
  type Firestore,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { type ConviveRepository } from '../domain/ports/convive-repository';
import { type WriteRejectionReporter } from '../domain/ports/write-rejection-reporter';
import { type Convive } from '../domain/entities/convive';
import { type Unsubscribe } from '../domain/ports/unsubscribe';
import { conviveToDocument, documentToConvive } from './convive-mapper';
import { asDomainFailure } from './firestore-failure';
import { acceptedLocally } from './firestore-local-acceptance';
import { DEFAULT_READ_TIMEOUT_MS, withServerDeadline } from './firestore-server-deadline';

export type FirestoreConviveRepositoryOptions = {
  readTimeoutMs?: number;
  onWriteRejected?: WriteRejectionReporter;
};

export class FirestoreConviveRepository implements ConviveRepository {
  private constructor(
    private readonly db: Firestore,
    private readonly readTimeoutMs: number,
    private readonly onWriteRejected: WriteRejectionReporter | undefined,
  ) {}

  static create(
    db: Firestore,
    options?: FirestoreConviveRepositoryOptions,
  ): FirestoreConviveRepository {
    return new FirestoreConviveRepository(
      db,
      options?.readTimeoutMs ?? DEFAULT_READ_TIMEOUT_MS,
      options?.onWriteRejected,
    );
  }

  save(convive: Convive): Promise<void> {
    return acceptedLocally(
      setDoc(doc(this.db, 'convives', convive.id), conviveToDocument(convive)),
      this.onWriteRejected,
    );
  }

  async findAll(): Promise<Convive[]> {
    const snapshot = await withServerDeadline(
      getDocs(collection(this.db, 'convives')),
      this.readTimeoutMs,
    );
    return snapshot.docs.map((snapshotDoc) =>
      documentToConvive(snapshotDoc.id, snapshotDoc.data()),
    );
  }

  updateOnlyIfExists(convive: Convive): Promise<void> {
    return acceptedLocally(
      updateDoc(doc(this.db, 'convives', convive.id), conviveToDocument(convive)),
      this.onWriteRejected,
    );
  }

  remove(id: string): Promise<void> {
    return acceptedLocally(deleteDoc(doc(this.db, 'convives', id)), this.onWriteRejected);
  }

  observeAll(
    listener: (convives: Convive[]) => void,
    onError: (error: unknown) => void,
  ): Unsubscribe {
    return onSnapshot(
      collection(this.db, 'convives'),
      (snapshot) => {
        listener(
          snapshot.docs.map((snapshotDoc) => documentToConvive(snapshotDoc.id, snapshotDoc.data())),
        );
      },
      (error) => {
        onError(asDomainFailure(error));
      },
    );
  }
}
