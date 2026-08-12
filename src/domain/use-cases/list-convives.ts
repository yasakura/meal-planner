import { compareConvivesByName, type Convive } from '../entities/convive';
import { type ConviveRepository } from '../ports/convive-repository';

export function listConvivesUseCase(deps: {
  conviveRepository: ConviveRepository;
}): () => Promise<Convive[]> {
  return async () => {
    const convives = await deps.conviveRepository.findAll();
    // Tri EN PLACE, licite ici : le port garantit un tableau frais (propriété exclusive
    // de l'appelant). Une copie défensive serait du code non couvert par un test.
    return convives.sort(compareConvivesByName);
  };
}

export type ListConvives = ReturnType<typeof listConvivesUseCase>;
