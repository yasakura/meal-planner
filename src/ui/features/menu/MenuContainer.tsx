import { type Menu } from '../../../domain/entities/menu';
import { type Recipe } from '../../../domain/entities/recipe';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { generateMenu, NO_RECIPES, selectMenu } from './menu-slice';
import { MenuScreen, type MenuDay, type MenuScreenProps } from './MenuScreen';

const DAYS = 7;

const CRENEAU_LABELS: Record<string, string> = {
  midi: 'Midi',
  soir: 'Soir',
};

function toDays(menu: Menu, recipes: Recipe[]): MenuDay[] {
  const titleById = new Map(recipes.map((recipe) => [recipe.id, recipe.title]));
  const byJour = new Map<number, MenuDay>();

  for (const repas of menu.repas) {
    let day = byJour.get(repas.jour);
    if (day === undefined) {
      day = { key: String(repas.jour), label: `Jour ${repas.jour + 1}`, slots: [] };
      byJour.set(repas.jour, day);
    }
    for (const slot of repas.slots) {
      day.slots.push({
        key: `${repas.jour}-${repas.creneau}`,
        creneauLabel: CRENEAU_LABELS[repas.creneau] ?? repas.creneau,
        title: titleById.get(slot.recipeId) ?? 'Recette inconnue',
      });
    }
  }

  return [...byJour.values()];
}

function errorMessage(error: string | null): string {
  return error === NO_RECIPES
    ? "Ajoute d'abord des recettes pour générer un menu."
    : 'Impossible de générer le menu.';
}

export function MenuContainer() {
  const { status, menu, recipes, error } = useAppSelector(selectMenu);
  const dispatch = useAppDispatch();

  let props: MenuScreenProps;
  if (status === 'loading') {
    props = { status: 'loading' };
  } else if (status === 'error') {
    props = {
      status: 'error',
      message: errorMessage(error),
      onRetry: () => dispatch(generateMenu(DAYS)),
    };
  } else if (status === 'success' && menu !== null && recipes !== null) {
    props = {
      status: 'success',
      days: toDays(menu, recipes),
      onRegenerate: () => dispatch(generateMenu(DAYS)),
    };
  } else {
    props = { status: 'idle', onGenerate: () => dispatch(generateMenu(DAYS)) };
  }

  return <MenuScreen {...props} />;
}
