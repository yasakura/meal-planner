import { type Creneau } from './creneau';
import { type Slot } from './slot';

export type Repas = {
  readonly jour: number;
  readonly creneau: Creneau;
  readonly slots: readonly Slot[];
};

export type RepasProps = {
  jour: number;
  creneau: Creneau;
  slots: Slot[];
};

export function createRepas(props: RepasProps): Repas {
  if (!Number.isInteger(props.jour)) {
    throw new Error('Le jour du repas doit être un entier');
  }
  if (props.jour < 0) {
    throw new Error('Le jour du repas doit être positif ou nul');
  }
  if (props.slots.length === 0) {
    throw new Error('Un repas doit contenir au moins un créneau');
  }
  return Object.freeze({
    jour: props.jour,
    creneau: props.creneau,
    slots: Object.freeze([...props.slots]),
  });
}
