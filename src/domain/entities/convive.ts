export type Convive = {
  readonly id: string;
  readonly name: string;
};

export type ConviveProps = {
  id: string;
  name: string;
};

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
