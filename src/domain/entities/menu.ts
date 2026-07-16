import { type Repas } from './repas';

export type Menu = {
  readonly repas: readonly Repas[];
};

export type MenuProps = {
  repas: Repas[];
};

export function createMenu(props: MenuProps): Menu {
  return Object.freeze({
    repas: Object.freeze([...props.repas]),
  });
}
