import { type ConviveRepository } from '../ports/convive-repository';

export type RemoveConviveInput = {
  id: string;
};

export function removeConviveUseCase(deps: {
  conviveRepository: ConviveRepository;
}): (input: RemoveConviveInput) => Promise<void> {
  return (input) => deps.conviveRepository.remove(input.id);
}

export type RemoveConvive = ReturnType<typeof removeConviveUseCase>;
