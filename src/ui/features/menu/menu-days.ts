import { type Menu } from '../../../domain/entities/menu';
import { type Recipe } from '../../../domain/entities/recipe';
import { FROM_MENU } from '../recipe-detail/recipe-detail-origin';
import { menuDayLabel } from './menu-day-label';
import { type MenuDay } from './MenuScreen';

const CRENEAU_LABELS: Record<string, string> = {
  midi: 'Midi',
  soir: 'Soir',
};

const RECETTE_INCONNUE = 'Recette inconnue';

export function menuDays(menu: Menu, recipes: Recipe[]): MenuDay[] {
  const titleById = new Map(recipes.map((recipe) => [recipe.id, recipe.title]));
  const byJour = new Map<number, MenuDay>();

  for (const repas of menu.repas) {
    let day = byJour.get(repas.jour);
    if (day === undefined) {
      day = {
        key: String(repas.jour),
        label: menuDayLabel(menu.dateDebut, repas.jour),
        slots: [],
      };
      byJour.set(repas.jour, day);
    }
    for (const slot of repas.slots) {
      const key = `${repas.jour}-${repas.creneau}`;
      const creneauLabel = CRENEAU_LABELS[repas.creneau] ?? repas.creneau;
      const title = titleById.get(slot.recipeId);
      day.slots.push(
        title === undefined
          ? { key, creneauLabel, title: RECETTE_INCONNUE, recipe: 'unknown' }
          : {
              key,
              creneauLabel,
              title,
              recipe: 'known',
              href: FROM_MENU.recipeHref(slot.recipeId),
            },
      );
    }
  }

  return [...byJour.values()];
}
