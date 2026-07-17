import { type Convive } from '../entities/convive';
import { type ConviveRepository } from '../ports/convive-repository';

export function listConvivesUseCase(deps: {
  conviveRepository: ConviveRepository;
}): () => Promise<Convive[]> {
  return async () => {
    return deps.conviveRepository.findAll();
  };
}

export type ListConvives = ReturnType<typeof listConvivesUseCase>;
