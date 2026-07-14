import { type IdGenerator } from '../ports/id-generator';

export class StubIdGenerator implements IdGenerator {
  public callCount = 0;

  private constructor(private readonly id: string) {}

  static returning(id: string): StubIdGenerator {
    return new StubIdGenerator(id);
  }

  static create(): StubIdGenerator {
    return new StubIdGenerator('generated-id-1');
  }

  generate(): string {
    this.callCount += 1;
    return this.id;
  }
}
