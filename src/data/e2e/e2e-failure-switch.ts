import { RepositoryUnavailableError } from '../../domain/errors/repository-unavailable-error';

export type E2eControls = {
  failReads(): void;
  failWrites(): void;
  restore(): void;
};

export class E2eFailureSwitch implements E2eControls {
  private readsFail = false;
  private writesFail = false;

  private constructor() {}

  static create(): E2eFailureSwitch {
    return new E2eFailureSwitch();
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

  guardRead(): void {
    if (this.readsFail) throw RepositoryUnavailableError.create();
  }

  guardWrite(): void {
    if (this.writesFail) throw RepositoryUnavailableError.create();
  }
}
