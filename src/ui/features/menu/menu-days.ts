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

/**
 * Le menu du domaine traduit en jours affichables. Extrait du container : décider quelles lignes
 * MÈNENT à une fiche et lesquelles ne mènent nulle part est une décision, et une décision ne vit
 * pas dans un `.tsx` que la mutation ignore.
 *
 * La règle : un créneau dont la recette n'est plus au catalogue retombe sur « Recette inconnue »
 * et ne porte AUCUNE destination — il n'y a rien vers quoi naviguer, et un lien vers une recette
 * disparue mènerait à « Recette introuvable », un cul-de-sac fabriqué par l'écran lui-même. Le
 * type l'impose plutôt qu'il ne l'espère : la variante `unknown` de `MenuSlotLine` n'a pas de
 * champ `href`, donc aucune ligne de repli ne peut être rendue cliquable, même par erreur.
 */
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
