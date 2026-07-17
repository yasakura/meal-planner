import { createConvive, type Convive } from '../entities/convive';

export class ConviveBuilder {
  private constructor(
    private readonly id: string,
    private readonly name: string,
  ) {}

  static aConvive(): ConviveBuilder {
    return new ConviveBuilder('convive-1', 'Aurélie');
  }

  withId(id: string): ConviveBuilder {
    return new ConviveBuilder(id, this.name);
  }

  withName(name: string): ConviveBuilder {
    return new ConviveBuilder(this.id, name);
  }

  withoutId(): ConviveBuilder {
    return this.withId('');
  }

  withoutName(): ConviveBuilder {
    return this.withName('');
  }

  build(): Convive {
    return createConvive({ id: this.id, name: this.name });
  }
}
