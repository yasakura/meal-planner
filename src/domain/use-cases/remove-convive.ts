import { type ConviveRepository } from '../ports/convive-repository';

export type RemoveConviveInput = {
  id: string;
};

export function removeConviveUseCase(deps: {
  conviveRepository: ConviveRepository;
}): (input: RemoveConviveInput) => Promise<void> {
  // Aucune lecture préalable : l'appel énonce un état cible (« ce convive n'est plus là »),
  // et le port garantit l'idempotence. Vérifier l'existence coûterait un round-trip pour un
  // garde de toute façon perdable dans une course entre les deux comptes du board.
  return (input) => deps.conviveRepository.remove(input.id);
}

export type RemoveConvive = ReturnType<typeof removeConviveUseCase>;
