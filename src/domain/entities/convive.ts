export type Convive = {
  readonly id: string;
  readonly name: string;
};

export type ConviveProps = {
  id: string;
  name: string;
};

/**
 * Ordre canonique du foyer : alphabétique par prénom, collation française — un prénom
 * accentué se range à sa lettre de base et une saisie en minuscules n'exile personne.
 * Source de vérité UNIQUE : consommée par `listConvivesUseCase` au chargement et par le
 * slice convives à l'ajout, pour que les deux chemins ne puissent pas diverger.
 */
export function compareConvivesByName(a: Convive, b: Convive): number {
  return a.name.localeCompare(b.name, 'fr');
}

export function createConvive(props: ConviveProps): Convive {
  const id = props.id.trim();
  if (id === '') {
    throw new Error("L'identifiant du convive est obligatoire");
  }
  const name = props.name.trim();
  if (name === '') {
    throw new Error('Le nom du convive est obligatoire');
  }
  return Object.freeze({ id, name });
}
