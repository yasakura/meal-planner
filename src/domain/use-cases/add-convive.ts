import { createConvive, type Convive } from '../entities/convive';
import { type ConviveRepository } from '../ports/convive-repository';

/**
 * L'identifiant est REÇU, jamais inventé ici : il est posé à l'ouverture du formulaire
 * (`newConviveIdUseCase`) et vaut pour tous les envois de cette saisie-là. Un identifiant tiré à
 * chaque écriture ferait, d'un second envoi hors ligne, un second document — deux convives pour
 * une seule personne.
 */
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
