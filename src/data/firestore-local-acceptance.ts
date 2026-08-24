import { type WriteRejectionReporter } from '../domain/ports/write-rejection-reporter';

export function acceptedLocally(
  write: Promise<unknown>,
  onWriteRejected: WriteRejectionReporter = () => {},
): Promise<void> {
  write.catch(onWriteRejected);
  return Promise.resolve();
}
