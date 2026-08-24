import { createConvive, type Convive } from '../entities/convive';
import { type ConviveRepository } from '../ports/convive-repository';

export type RenameConviveInput = {
  id: string;
  name: string;
};

export function renameConviveUseCase(deps: {
  conviveRepository: ConviveRepository;
}): (input: RenameConviveInput) => Promise<Convive> {
  return async (input) => {
    const renomme = createConvive({ id: input.id, name: input.name });
    await deps.conviveRepository.updateOnlyIfExists(renomme);
    return renomme;
  };
}

export type RenameConvive = ReturnType<typeof renameConviveUseCase>;
