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
    // Garde d'existence ATOMIQUE. Lire puis écrire séparément serait un check-then-act :
    // entre les deux, l'autre compte du board peut supprimer le convive, et `save` — upsert —
    // le ferait réapparaître. `updateExisting` ne laisse pas cet intervalle exister.
    //
    // La transformation reste ici, dans le domaine : c'est elle qui construit l'entité, donc
    // les invariants de `createConvive` (non-vide, trim) ne sont pas contournables par le
    // chemin renommage. Elle est PURE — le port prévient qu'elle peut être rejouée.
    const renomme = await deps.conviveRepository.updateExisting(input.id, (existant) =>
      createConvive({ id: existant.id, name: input.name }),
    );
    // L'absence est un fait rapporté par le dépôt ; en faire une erreur est une décision du
    // domaine, pas de l'adapter.
    if (renomme === undefined) {
      throw new Error("Le convive à renommer n'existe pas");
    }
    return renomme;
  };
}

export type RenameConvive = ReturnType<typeof renameConviveUseCase>;
