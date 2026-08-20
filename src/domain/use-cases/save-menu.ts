import { isBefore, subtractMonths } from '../entities/calendar-date';
import { type Menu } from '../entities/menu';
import { type Clock } from '../ports/clock';
import { type MenuRepository } from '../ports/menu-repository';

export type SaveMenuInput = {
  menu: Menu;
};

/** Fenêtre glissante de rétention, comptée depuis AUJOURD'HUI et non depuis le menu écrit. */
const MOIS_DE_RETENTION = 2;

/**
 * Enregistre le menu, PUIS fait le ménage. L'ordre porte la règle : le menu est le travail de
 * l'utilisateur, la rétention n'est que de l'entretien. Une panne de l'entretien — lecture des
 * périodes ou effacement — ne lui coûte pas son menu ; le ménage sera refait au prochain
 * enregistrement. Une panne de l'écriture, elle, remonte : il n'y a rien à masquer.
 *
 * Le menu qu'on vient d'écrire est soumis à la même règle que les autres : il traverse le même
 * inventaire, sans traitement de faveur. C'est une ABSENCE de branche, pas une branche.
 */
export function saveMenuUseCase(deps: {
  menuRepository: MenuRepository;
  clock: Clock;
}): (input: SaveMenuInput) => Promise<void> {
  return async ({ menu }) => {
    await deps.menuRepository.save(menu);
    // L'horloge est relue à chaque appel, une fois : la borne glisse avec les jours et ne se
    // mémorise pas d'un enregistrement à l'autre.
    const limite = subtractMonths(deps.clock.today(), MOIS_DE_RETENTION);
    try {
      const periodes = await deps.menuRepository.findAllStartDates();
      await Promise.all(
        periodes
          .filter((periode) => isBefore(periode, limite))
          .map((periode) => deps.menuRepository.remove(periode)),
      );
    } catch {
      // Entretien en panne : le menu est déjà écrit, l'enregistrement reste un succès.
    }
  };
}

export type SaveMenu = ReturnType<typeof saveMenuUseCase>;
