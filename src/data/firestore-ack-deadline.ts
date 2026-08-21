import { RepositoryUnavailableError } from '../domain/errors/repository-unavailable-error';
import { asDomainFailure } from './firestore-failure';

export const DEFAULT_ACK_TIMEOUT_MS = 5000;

export function withAckDeadline<T>(write: Promise<T>, ackTimeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const deadline = setTimeout(() => reject(RepositoryUnavailableError.create()), ackTimeoutMs);
    write
      .then(resolve, (error: unknown) => reject(asDomainFailure(error)))
      .finally(() => clearTimeout(deadline));
  });
}
