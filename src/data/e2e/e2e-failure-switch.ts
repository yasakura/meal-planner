import { RepositoryUnavailableError } from '../../domain/errors/repository-unavailable-error';
import { withServerDeadline } from '../firestore-server-deadline';

export const E2E_ACK_TIMEOUT_MS = 1500;

export type E2eControls = {
  failReads(): void;
  failWrites(): void;
  hangWrites(): void;
  restore(): void;
};

export type E2eFailureSwitchOptions = { ackTimeoutMs?: number };

export class E2eFailureSwitch implements E2eControls {
  private readsFail = false;
  private writesFail = false;
  private writesHang = false;

  private constructor(private readonly ackTimeoutMs: number) {}

  static create(options?: E2eFailureSwitchOptions): E2eFailureSwitch {
    return new E2eFailureSwitch(options?.ackTimeoutMs ?? E2E_ACK_TIMEOUT_MS);
  }

  failReads(): void {
    this.readsFail = true;
  }

  failWrites(): void {
    this.writesFail = true;
  }

  hangWrites(): void {
    this.writesHang = true;
  }

  restore(): void {
    this.readsFail = false;
    this.writesFail = false;
    this.writesHang = false;
  }

  guardRead(): void {
    if (this.readsFail) throw RepositoryUnavailableError.create();
  }

  guardWrite(): void {
    if (this.writesFail) throw RepositoryUnavailableError.create();
  }

  serverAck(): Promise<void> {
    const acquittement = this.writesHang ? new Promise<void>(() => {}) : Promise.resolve();
    return withServerDeadline(acquittement, this.ackTimeoutMs);
  }
}
