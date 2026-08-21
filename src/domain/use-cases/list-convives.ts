import { compareConvivesByName, type Convive } from '../entities/convive';
import { type ConviveRepository } from '../ports/convive-repository';

export function listConvivesUseCase(deps: {
  conviveRepository: ConviveRepository;
}): () => Promise<Convive[]> {
  return async () => {
    const convives = await deps.conviveRepository.findAll();
    return convives.sort(compareConvivesByName);
  };
}

export type ListConvives = ReturnType<typeof listConvivesUseCase>;
