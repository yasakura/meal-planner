import { type Convive } from '../entities/convive';

export interface ConviveRepository {
  save(convive: Convive): Promise<void>;
  /**
   * Retourne TOUS les convives du foyer, dans l'ordre d'insertion.
   * Contrat : le tableau renvoyé est **frais** (propriété exclusive de l'appelant) —
   * `listConvivesUseCase` le transmet sans copie défensive, donc un adapter ne doit
   * jamais exposer une référence vers son état interne mutable.
   */
  findAll(): Promise<Convive[]>;
}
