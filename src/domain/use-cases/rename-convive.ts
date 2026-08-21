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
    const renomme = await deps.conviveRepository.updateExisting(input.id, (existant) =>
      createConvive({ id: existant.id, name: input.name }),
    );
    if (renomme === undefined) {
      throw new Error("Le convive à renommer n'existe pas");
    }
    return renomme;
  };
}

export type RenameConvive = ReturnType<typeof renameConviveUseCase>;
