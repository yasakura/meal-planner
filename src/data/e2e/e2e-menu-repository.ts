import { toIsoDate, type CalendarDate } from '../../domain/entities/calendar-date';
import { type Menu } from '../../domain/entities/menu';
import { type MenuRepository } from '../../domain/ports/menu-repository';
import { type E2eFailureSwitch } from './e2e-failure-switch';

/**
 * Dépôt de menus en mémoire, embarqué dans l'application en mode e2e uniquement. Même statut
 * que `E2eRecipeRepository` : un adapter, pas un test-double, mais tenu à la même hostilité —
 * il n'offre aucune garantie que le port ne promet pas.
 *
 * Il démarre VIDE, et n'a pas de fixture : un menu enregistré est le résultat d'un parcours,
 * jamais un état de départ. Un scénario qui trouverait des menus déjà là ne saurait pas
 * distinguer ce qu'il vient d'écrire de ce qu'on lui a servi.
 */
export class E2eMenuRepository implements MenuRepository {
  /**
   * Clé = date de début au format ISO. La date civile est un objet : une `Map` clée sur
   * l'objet lui-même distinguerait deux 5 janvier construits séparément, et le dépôt
   * accepterait alors deux menus sur la MÊME période — exactement ce que le port interdit.
   */
  private readonly menus = new Map<string, Menu>();

  private constructor(private readonly failures: E2eFailureSwitch) {}

  static startingEmpty(failures: E2eFailureSwitch): E2eMenuRepository {
    return new E2eMenuRepository(failures);
  }

  /** UPSERT sur la période, comme le port l'exige : même date de début, menu remplacé. */
  async save(menu: Menu): Promise<void> {
    this.failures.guardWrite();
    this.menus.set(toIsoDate(menu.dateDebut), menu);
  }

  /**
   * Ordre d'insertion INVERSÉ, délibérément : le port ne garantit aucun ordre (l'adapter
   * Firestore lit sans `orderBy`), et un adapter plus aimable que son contrat ferait passer en
   * vert un tri que personne n'a écrit. Inversion plutôt que mélange seedé — déterministe, et
   * garanti différent de l'insertion dès deux éléments.
   */
  async findAllStartDates(): Promise<CalendarDate[]> {
    this.failures.guardRead();
    return [...this.menus.values()].map((menu) => menu.dateDebut).reverse();
  }

  /** IDEMPOTENT : effacer une période vide est un succès silencieux, jamais un rejet. */
  async remove(dateDebut: CalendarDate): Promise<void> {
    this.failures.guardWrite();
    this.menus.delete(toIsoDate(dateDebut));
  }
}
