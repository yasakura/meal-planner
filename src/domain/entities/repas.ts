import { CRENEAUX, type Creneau } from './creneau';
import { type Slot } from './slot';

export type Repas = {
  readonly jour: number;
  readonly creneau: Creneau;
  readonly slots: readonly Slot[];
  readonly presents: readonly string[] | null;
  readonly invites: number;
};

export type RepasProps = {
  jour: number;
  creneau: Creneau;
  slots: Slot[];
  presents?: readonly string[] | null;
  invites?: number;
};

export function personneNeMangeAuRepas(repas: Repas): boolean {
  return repas.presents?.length === 0 && repas.invites === 0;
}

export function createRepas(props: RepasProps): Repas {
  if (!Number.isInteger(props.jour)) {
    throw new Error('Le jour du repas doit être un entier');
  }
  if (props.jour < 0) {
    throw new Error('Le jour du repas doit être positif ou nul');
  }
  if (!CRENEAUX.includes(props.creneau)) {
    throw new Error('Créneau invalide');
  }
  if (props.slots.length === 0) {
    throw new Error('Un repas doit contenir au moins un créneau');
  }
  const presents = props.presents ?? null;
  const invites = props.invites ?? 0;
  if (!Number.isInteger(invites) || invites < 0) {
    throw new Error("Le nombre d'invités doit être un entier positif ou nul");
  }
  return Object.freeze({
    jour: props.jour,
    creneau: props.creneau,
    slots: Object.freeze([...props.slots]),
    presents: presents === null ? null : Object.freeze([...presents]),
    invites,
  });
}
