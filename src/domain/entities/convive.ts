export type Convive = {
  readonly id: string;
  readonly name: string;
};

export type ConviveProps = {
  id: string;
  name: string;
};

export function compareConvivesByName(a: Convive, b: Convive): number {
  return a.name.localeCompare(b.name, 'fr');
}

export function conviveInitials(convive: Convive): string {
  const parties = convive.name.split(/[\s-]/).filter((partie) => partie !== '');
  const lettres =
    parties.length > 1
      ? parties.slice(0, 2).map((partie) => partie.slice(0, 1))
      : [parties[0]?.slice(0, 2) ?? ''];
  return lettres.join('').toUpperCase();
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
