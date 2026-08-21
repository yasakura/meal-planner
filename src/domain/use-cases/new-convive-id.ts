import { type IdGenerator } from '../ports/id-generator';

export function newConviveIdUseCase(deps: { idGenerator: IdGenerator }): () => string {
  return () => deps.idGenerator.generate();
}

export type NewConviveId = ReturnType<typeof newConviveIdUseCase>;
