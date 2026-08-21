import { type IdGenerator } from '../../domain/ports/id-generator';

export class SequentialIdGenerator implements IdGenerator {
  private count = 0;

  private constructor(private readonly prefix: string) {}

  static withPrefix(prefix: string): SequentialIdGenerator {
    return new SequentialIdGenerator(prefix);
  }

  generate(): string {
    this.count += 1;
    return `${this.prefix}-${this.count}`;
  }
}
