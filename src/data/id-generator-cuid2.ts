import { createId } from '@paralleldrive/cuid2';

import { type IdGenerator } from '../domain/ports/id-generator';

export class IdGeneratorCuid2 implements IdGenerator {
  generate(): string {
    return createId();
  }
}
