import { RepositoryUnavailableError } from '../domain/errors/repository-unavailable-error';

function isNetworkUnavailable(error: unknown): boolean {
  return (error as { code?: unknown } | null | undefined)?.code === 'unavailable';
}

export function asDomainFailure(error: unknown): unknown {
  return isNetworkUnavailable(error) ? RepositoryUnavailableError.create() : error;
}
