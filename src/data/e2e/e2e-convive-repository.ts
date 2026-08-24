import { type Convive } from '../../domain/entities/convive';
import { RepositoryUnavailableError } from '../../domain/errors/repository-unavailable-error';
import { type ConviveRepository } from '../../domain/ports/convive-repository';
import { type Unsubscribe } from '../../domain/ports/unsubscribe';
import { type E2eFailureSwitch } from './e2e-failure-switch';

export class E2eConviveRepository implements ConviveRepository {
  private readonly convives: Map<string, Convive>;

  private readonly listeners = new Set<(convives: Convive[]) => void>();

  private constructor(
    convives: readonly Convive[],
    private readonly failures: E2eFailureSwitch,
  ) {
    this.convives = new Map(convives.map((convive) => [convive.id, convive]));
  }

  static seededWith(
    convives: readonly Convive[],
    failures: E2eFailureSwitch,
  ): E2eConviveRepository {
    return new E2eConviveRepository(convives, failures);
  }

  async save(convive: Convive): Promise<void> {
    this.failures.guardWrite();
    await this.failures.serverAck();
    this.convives.set(convive.id, convive);
    this.emit();
  }

  async findAll(): Promise<Convive[]> {
    this.failures.guardRead();
    return this.snapshot();
  }

  async updateExisting(
    id: string,
    transform: (existing: Convive) => Convive,
  ): Promise<Convive | undefined> {
    this.failures.guardWrite();
    await this.failures.serverAck();
    const existing = this.convives.get(id);
    if (existing === undefined) return undefined;
    transform(existing);
    const updated = transform(existing);
    this.convives.set(id, updated);
    this.emit();
    return updated;
  }

  async remove(id: string): Promise<void> {
    this.failures.guardWrite();
    await this.failures.serverAck();
    this.convives.delete(id);
    this.emit();
  }

  observeAll(
    listener: (convives: Convive[]) => void,
    onError: (error: unknown) => void,
  ): Unsubscribe {
    this.listeners.add(listener);
    if (this.failures.readsAreDown()) onError(RepositoryUnavailableError.create());
    else listener(this.snapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private snapshot(): Convive[] {
    return [...this.convives.values()].reverse();
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.snapshot());
  }
}
