import { type IdGenerator } from '../../domain/ports/id-generator';

/**
 * Générateur d'ids REPRODUCTIBLE, contrepartie de `IdGeneratorCuid2` pour le mode e2e : un
 * scénario qui crée un convive doit pouvoir viser l'élément créé, ce qu'un cuid2 interdit.
 *
 * Un préfixe par consommateur : ainsi créer une recette ne décale pas la numérotation des
 * convives, et deux étapes de scénario indépendantes le restent.
 */
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
