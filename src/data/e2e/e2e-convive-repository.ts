import { type Convive } from '../../domain/entities/convive';
import { type ConviveRepository } from '../../domain/ports/convive-repository';
import { type E2eFailureSwitch } from './e2e-failure-switch';

export class E2eConviveRepository implements ConviveRepository {
  private readonly convives: Map<string, Convive>;

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
    this.convives.set(convive.id, convive);
  }

  async findAll(): Promise<Convive[]> {
    this.failures.guardRead();
    return [...this.convives.values()].reverse();
  }

  async updateExisting(
    id: string,
    transform: (existing: Convive) => Convive,
  ): Promise<Convive | undefined> {
    this.failures.guardWrite();
    const existing = this.convives.get(id);
    if (existing === undefined) return undefined;
    transform(existing);
    const updated = transform(existing);
    this.convives.set(id, updated);
    return updated;
  }

  async remove(id: string): Promise<void> {
    this.failures.guardWrite();
    this.convives.delete(id);
  }
}
