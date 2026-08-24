import { RepositoryUnavailableError } from '../domain/errors/repository-unavailable-error';
import { asDomainFailure } from './firestore-failure';

export const DEFAULT_READ_TIMEOUT_MS = 10000;

export function withServerDeadline<T>(roundTrip: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const deadline = setTimeout(() => reject(RepositoryUnavailableError.create()), timeoutMs);
    roundTrip
      .then(resolve, (error: unknown) => reject(asDomainFailure(error)))
      .finally(() => clearTimeout(deadline));
  });
}
