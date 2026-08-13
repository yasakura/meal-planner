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

  /**
   * Rend l'ordre d'insertion INVERSÉ, délibérément.
   *
   * Le port déclare un ordre **non garanti** : ce double doit donc exercer activement
   * cette absence de garantie, jamais rendre l'ordre d'insertion « par gentillesse ».
   * Un double plus aimable que son contrat est un faux vert structurel — aucun test ne
   * peut l'attraper, puisque c'est le référentiel lui-même qui ment.
   *
   * Inversion et non mélange pseudo-aléatoire : c'est déterministe (suite reproductible)
   * ET garanti différent de l'ordre d'insertion dès deux éléments, là où un shuffle seedé
   * peut retomber sur l'identité et affaiblir le garde en silence.
   *
   * Vécu FR-3 : ce double rendait l'ordre d'insertion, Firestore rend l'ordre des
   * identifiants (cuid2, non triable). Suite verte, écran affichant un ordre aléatoire à
   * chaque rechargement — trouvé par la vérif navigateur seulement.
   */
  findAll(): Promise<Convive[]> {
    return Promise.resolve(this.all().reverse());
  }

  /** Inspection de test : rend l'ordre d'insertion, honnêtement. Hors contrat du port. */
  all(): Convive[] {
    return [...this.convives.values()];
  }
}
