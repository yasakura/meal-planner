export const CRENEAUX = ['midi', 'soir'] as const;

export type Creneau = (typeof CRENEAUX)[number];
