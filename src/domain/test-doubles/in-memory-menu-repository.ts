import { toIsoDate, type CalendarDate } from '../entities/calendar-date';
import { type Menu } from '../entities/menu';
import { type MenuRepository } from '../ports/menu-repository';

export class InMemoryMenuRepository implements MenuRepository {
  public saveCount = 0;
  /** Compte les APPELS, pas les effacements : une période vide n'écrit rien mais a été demandée. */
  public removeCount = 0;
  /**
   * Clé = date de début au format ISO. La date civile est un objet : une `Map` clée sur
   * l'objet lui-même distinguerait deux 19 juin construits séparément, et le dépôt
   * accepterait alors deux menus sur la MÊME période — exactement ce que le port interdit.
   */
  private readonly menus = new Map<string, Menu>();

  private constructor() {}

  static create(): InMemoryMenuRepository {
    return new InMemoryMenuRepository();
  }

  save(menu: Menu): Promise<void> {
    this.saveCount += 1;
    this.menus.set(toIsoDate(menu.dateDebut), menu);
    return Promise.resolve();
  }

  /**
   * Rend l'ordre d'insertion INVERSÉ, délibérément.
   *
   * Le port déclare un ordre **non garanti** : ce double doit donc exercer activement cette
   * absence de garantie, jamais rendre l'ordre d'insertion « par gentillesse ». Inversion et
   * non mélange seedé : déterministe ET garanti différent de l'insertion dès deux éléments,
   * là où un shuffle peut retomber sur l'identité et affaiblir le garde en silence.
   *
   * L'unicité des dates, elle, EST promise par le port (l'upsert est clé par période) : la
   * `Map` la tient, et le double n'a pas à la mettre en défaut.
   */
  findAllStartDates(): Promise<CalendarDate[]> {
    return Promise.resolve(
      this.all()
        .map((menu) => menu.dateDebut)
        .reverse(),
    );
  }

  /** Idempotent, comme le port : effacer une période vide ne lève pas (`Map.delete`). */
  remove(dateDebut: CalendarDate): Promise<void> {
    this.removeCount += 1;
    this.menus.delete(toIsoDate(dateDebut));
    return Promise.resolve();
  }

  /** Inspection de test, hors contrat du port : le port n'offre aucune lecture unitaire. */
  byStartDate(dateDebut: CalendarDate): Menu | undefined {
    return this.menus.get(toIsoDate(dateDebut));
  }

  /** Inspection de test : rend l'ordre d'insertion, honnêtement. Hors contrat du port. */
  all(): Menu[] {
    return [...this.menus.values()];
  }
}
