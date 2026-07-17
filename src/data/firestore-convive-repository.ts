import { type Firestore, collection, doc, getDocs, setDoc } from 'firebase/firestore';

import { type ConviveRepository } from '../domain/ports/convive-repository';
import { type Convive } from '../domain/entities/convive';
import { conviveToDocument, documentToConvive } from './convive-mapper';

export class FirestoreConviveRepository implements ConviveRepository {
  private constructor(private readonly db: Firestore) {}

  static create(db: Firestore): FirestoreConviveRepository {
    return new FirestoreConviveRepository(db);
  }

  async save(convive: Convive): Promise<void> {
    await setDoc(doc(this.db, 'convives', convive.id), conviveToDocument(convive));
  }

  async findAll(): Promise<Convive[]> {
    const snapshot = await getDocs(collection(this.db, 'convives'));
    return snapshot.docs.map((snapshotDoc) =>
      documentToConvive(snapshotDoc.id, snapshotDoc.data()),
    );
  }
}
