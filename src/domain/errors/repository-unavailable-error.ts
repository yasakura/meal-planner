const REPOSITORY_UNAVAILABLE_NAME = 'RepositoryUnavailableError';

export class RepositoryUnavailableError extends Error {
  private constructor() {
    super("Le dépôt n'a pas répondu.");
    this.name = REPOSITORY_UNAVAILABLE_NAME;
  }

  static create(): RepositoryUnavailableError {
    return new RepositoryUnavailableError();
  }
}

export function isRepositoryUnavailable(candidate: unknown): boolean {
  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    'name' in candidate &&
    (candidate as { name: unknown }).name === REPOSITORY_UNAVAILABLE_NAME
  );
}
