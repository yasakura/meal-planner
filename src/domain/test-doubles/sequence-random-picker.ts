import { type RandomPicker } from '../ports/random-picker';

export class SequenceRandomPicker implements RandomPicker {
  private cursor = 0;

  private constructor(private readonly indices: readonly number[]) {}

  static returning(...indices: number[]): SequenceRandomPicker {
    return new SequenceRandomPicker(indices);
  }

  nextIndex(size: number): number {
    const index = this.indices[this.cursor];
    if (index === undefined) {
      throw new Error('SequenceRandomPicker: séquence épuisée');
    }
    if (index >= size) {
      throw new Error('SequenceRandomPicker: index hors bornes');
    }
    this.cursor += 1;
    return index;
  }
}
