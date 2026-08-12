import { type Firestore, collection, doc, getDocsFromServer, setDoc } from 'firebase/firestore';

import { type ConviveRepository } from '../domain/ports/convive-repository';
import { type Convive } from '../domain/entities/convive';
import { RepositoryUnavailableError } from '../domain/errors/repository-unavailable-error';
import { conviveToDocument, documentToConvive } from './convive-mapper';

// Le SDK signale une panne réseau par ce code ; tout autre code (permission-denied,
// not-found…) décrit un serveur qui a bel et bien répondu.
// Lecture totale par `?.` : le canal de rejet n'est pas typé, et une valeur sans `code`
// — voire non-objet — doit répondre « non », jamais faire crasher la traduction.
function isNetworkUnavailable(error: unknown): boolean {
  return (error as { code?: unknown } | null | undefined)?.code === 'unavailable';
}

/**
 * Frontière `data → domain` : point de passage UNIQUE des pannes, lecture comme écriture.
 * Une asymétrie ici se paierait cher — une écriture refusée pour panne réseau qui remonterait
 * brute passerait pour un échec, et le formulaire se réarmerait alors que l'écriture peut
 * encore aboutir.
 */
function asDomainFailure(error: unknown): unknown {
  return isNetworkUnavailable(error) ? RepositoryUnavailableError.create() : error;
}

/**
 * Borne au-delà de laquelle une écriture non acquittée est déclarée non confirmée.
 * Volontairement tolérante : un réseau qui rampe (signal faible mais présent) ne doit pas
 * produire un faux constat hors-ligne.
 */
const DEFAULT_ACK_TIMEOUT_MS = 5000;

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
    // Hors ligne, `setDoc` ne rejette pas : il met l'écriture en file locale et n'acquitte
    // qu'au serveur — la promesse ne se règle jamais. Sans borne, l'écran resterait figé
    // sur « ajout en cours » sans jamais rien dire.
    await this.withAckDeadline(
      setDoc(doc(this.db, 'convives', convive.id), conviveToDocument(convive)),
    );
  }

  private withAckDeadline(write: Promise<void>): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const deadline = setTimeout(
        () => reject(RepositoryUnavailableError.create()),
        this.ackTimeoutMs,
      );
      write
        .then(resolve, (error: unknown) => reject(asDomainFailure(error)))
        .finally(() => clearTimeout(deadline));
    });
  }

  async findAll(): Promise<Convive[]> {
    // `getDocsFromServer` et non `getDocs` : hors ligne, `getDocs` ne rejette pas, il sert
    // le cache et renvoie un snapshot VIDE. L'app affichait alors un foyer vide inventé, et
    // l'utilisateur re-saisissait ses convives — doublons au retour du réseau. On veut la
    // vérité du serveur, ou l'aveu qu'on ne l'a pas.
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
}
