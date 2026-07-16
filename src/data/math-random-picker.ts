import { type RandomPicker } from '../domain/ports/random-picker';

export class MathRandomPicker implements RandomPicker {
  private constructor(private readonly random: () => number) {}

  static create(random: () => number = Math.random): MathRandomPicker {
    return new MathRandomPicker(random);
  }

  nextIndex(size: number): number {
    return Math.floor(this.random() * size);
  }
}
