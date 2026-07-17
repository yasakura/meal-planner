import { type Convive } from '../entities/convive';
import { type ConviveRepository } from '../ports/convive-repository';

export class InMemoryConviveRepository implements ConviveRepository {
  public saveCount = 0;
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
    return Promise.resolve(this.all());
  }

  all(): Convive[] {
    return [...this.convives.values()];
  }
}
