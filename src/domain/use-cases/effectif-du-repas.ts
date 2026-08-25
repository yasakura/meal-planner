import { type Convive } from '../entities/convive';
import { type Repas } from '../entities/repas';

export function effectifDuRepas(repas: Repas, foyer: readonly Convive[]): number {
  return (repas.presents ?? foyer).length + repas.invites;
}
