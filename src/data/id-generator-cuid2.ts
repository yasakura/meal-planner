import { createId } from '@paralleldrive/cuid2';

import { type IdGenerator } from '../domain/ports/id-generator';

export class IdGeneratorCuid2 implements IdGenerator {
  private constructor() {}

  static create(): IdGeneratorCuid2 {
    return new IdGeneratorCuid2();
  }

  generate(): string {
    return createId();
  }
}
