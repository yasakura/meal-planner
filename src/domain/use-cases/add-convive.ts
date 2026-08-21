import { createConvive, type Convive } from '../entities/convive';
import { type ConviveRepository } from '../ports/convive-repository';

export type AddConviveInput = {
  id: string;
  name: string;
};

export function addConviveUseCase(deps: {
  conviveRepository: ConviveRepository;
}): (input: AddConviveInput) => Promise<Convive> {
  return async (input) => {
    const convive = createConvive({ id: input.id, name: input.name });
    await deps.conviveRepository.save(convive);
    return convive;
  };
}

export type AddConvive = ReturnType<typeof addConviveUseCase>;
