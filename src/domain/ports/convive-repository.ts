import { type Convive } from '../entities/convive';
import { type Unsubscribe } from './unsubscribe';

export interface ConviveRepository {
  save(convive: Convive): Promise<void>;
  findAll(): Promise<Convive[]>;
  updateExisting(
    id: string,
    transform: (existing: Convive) => Convive,
  ): Promise<Convive | undefined>;
  remove(id: string): Promise<void>;
  observeAll(
    listener: (convives: Convive[]) => void,
    onError: (error: unknown) => void,
  ): Unsubscribe;
}
