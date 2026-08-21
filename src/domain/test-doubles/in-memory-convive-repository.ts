import { type Convive } from '../entities/convive';
import { type ConviveRepository } from '../ports/convive-repository';

export class InMemoryConviveRepository implements ConviveRepository {
  public saveCount = 0;
  public removeCount = 0;
  public updateCount = 0;
  private readonly convives = new Map<string, Convive>();

  private constructor() {}

  static create(): InMemoryConviveRepository {
    return new InMemoryConviveRepository();
  }

  save(convive: Convive): Promise<void> {
    this.saveCount += 1;
    this.convives.set(convive.id, convive);
    return Promise.resolve();
  }

  findAll(): Promise<Convive[]> {
    return Promise.resolve(this.all().reverse());
  }

  updateExisting(
    id: string,
    transform: (existing: Convive) => Convive,
  ): Promise<Convive | undefined> {
    this.updateCount += 1;
    const existing = this.convives.get(id);
    if (existing === undefined) return Promise.resolve(undefined);
    transform(existing);
    const updated = transform(existing);
    this.convives.set(id, updated);
    return Promise.resolve(updated);
  }

  byId(id: string): Convive | undefined {
    return this.convives.get(id);
  }

  remove(id: string): Promise<void> {
    this.removeCount += 1;
    this.convives.delete(id);
    return Promise.resolve();
  }

  all(): Convive[] {
    return [...this.convives.values()];
  }
}
