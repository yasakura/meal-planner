import { createConvive, type Convive } from '../entities/convive';
import { type IdGenerator } from '../ports/id-generator';
import { type ConviveRepository } from '../ports/convive-repository';

export type AddConviveInput = {
  name: string;
};

export function addConviveUseCase(deps: {
  idGenerator: IdGenerator;
  conviveRepository: ConviveRepository;
}): (input: AddConviveInput) => Promise<Convive> {
  return async (input) => {
    const id = deps.idGenerator.generate();
    const convive = createConvive({ id, name: input.name });
    await deps.conviveRepository.save(convive);
    return convive;
  };
}

export type AddConvive = ReturnType<typeof addConviveUseCase>;
