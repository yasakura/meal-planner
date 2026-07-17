import { createConvive, type Convive } from '../domain/entities/convive';

export type ConviveDocument = {
  name: string;
};

export function conviveToDocument(convive: Convive): ConviveDocument {
  return {
    name: convive.name,
  };
}

export function documentToConvive(id: string, data: unknown): Convive {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Document convive invalide : la donnée doit être un objet');
  }
  const { name } = data as Record<string, unknown>;
  if (typeof name !== 'string') {
    throw new Error('Document convive invalide : le nom doit être une chaîne de caractères');
  }
  return createConvive({ id, name });
}
