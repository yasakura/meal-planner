import { type CalendarDate } from '../entities/calendar-date';
import { type Menu } from '../entities/menu';

/**
 * Dépôt des menus enregistrés. La PÉRIODE est la clé : un menu est identifié par sa date de
 * début, et deux menus ne peuvent pas se disputer la même période.
 */
export interface MenuRepository {
  /**
   * UPSERT sur la date de début : enregistre le menu, ou remplace intégralement celui qui
   * occupait déjà cette période. Le dépôt ne demande aucune confirmation — arbitrer un
   * écrasement est une décision d'écran, pas de stockage.
   */
  save(menu: Menu): Promise<void>;
  /**
   * Rend les dates de début de TOUS les menus enregistrés, dans un ordre **non garanti** :
   * l'adapter Firestore lit la collection sans `orderBy`. Les dates sont **distinctes** —
   * c'est la conséquence de l'upsert par période, pas une faveur du dépôt.
   *
   * Les dates SEULES, jamais les menus entiers : le domaine décide de la rétention à partir
   * des seules périodes, et charger le contenu des menus pour les supprimer serait payer la
   * lecture de tout l'historique à chaque enregistrement.
   */
  findAllStartDates(): Promise<CalendarDate[]>;
  /**
   * Efface DÉFINITIVEMENT le menu de la période donnée. IDEMPOTENT : effacer une période
   * vide est un succès silencieux — l'appel énonce un état cible déjà atteint.
   */
  remove(dateDebut: CalendarDate): Promise<void>;
}
