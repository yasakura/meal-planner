import { RepositoryUnavailableError } from '../../domain/errors/repository-unavailable-error';
import { type WriteRejectionReporter } from '../../domain/ports/write-rejection-reporter';

export const E2E_SERVER_VERDICT_MS = 400;

export type E2eControls = {
  failReads(): void;
  failWrites(): void;
  restore(): void;
};

export class E2eFailureSwitch implements E2eControls {
  private readsFail = false;
  private writesFail = false;

  private constructor(private readonly onWriteRejected: WriteRejectionReporter) {}

  static reporting(onWriteRejected: WriteRejectionReporter): E2eFailureSwitch {
    return new E2eFailureSwitch(onWriteRejected);
  }

  failReads(): void {
    this.readsFail = true;
  }

  failWrites(): void {
    this.writesFail = true;
  }

  restore(): void {
    this.readsFail = false;
    this.writesFail = false;
  }

  readsAreDown(): boolean {
    return this.readsFail;
  }

  guardRead(): void {
    if (this.readsAreDown()) throw RepositoryUnavailableError.create();
  }

  refuseAfterwards(rollback: () => void): void {
    if (!this.writesFail) return;
    setTimeout(() => {
      rollback();
      this.onWriteRejected();
    }, E2E_SERVER_VERDICT_MS);
  }
}
