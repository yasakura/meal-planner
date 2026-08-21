import { type Convive } from '../entities/convive';

export interface ConviveRepository {
  save(convive: Convive): Promise<void>;
  findAll(): Promise<Convive[]>;
  updateExisting(
    id: string,
    transform: (existing: Convive) => Convive,
  ): Promise<Convive | undefined>;
  remove(id: string): Promise<void>;
}
