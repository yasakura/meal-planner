import { compareConvivesByName, type Convive } from '../entities/convive';
import { type ConviveRepository } from '../ports/convive-repository';
import { type Unsubscribe } from '../ports/unsubscribe';

export function observeConvivesUseCase(deps: { conviveRepository: ConviveRepository }) {
  return (
    listener: (convives: Convive[]) => void,
    onError: (error: unknown) => void,
  ): Unsubscribe =>
    deps.conviveRepository.observeAll(
      (convives) => listener([...convives].sort(compareConvivesByName)),
      onError,
    );
}

export type ObserveConvives = ReturnType<typeof observeConvivesUseCase>;
