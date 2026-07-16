import { useState } from 'react';

import { type Menu } from '../../../domain/entities/menu';
import { type Recipe } from '../../../domain/entities/recipe';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { generateMenu, NO_RECIPES, selectMenu } from './menu-slice';
import { MenuScreen, type MenuDay, type MenuScreenProps } from './MenuScreen';

// Fenêtre par défaut : 2 semaines (14 jours).
const DEFAULT_DAYS = 14;

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
  const [days, setDays] = useState(DEFAULT_DAYS);

  let props: MenuScreenProps;
  if (status === 'loading') {
    props = { status: 'loading' };
  } else if (status === 'error') {
    props = {
      status: 'error',
      message: errorMessage(error),
      onRetry: () => dispatch(generateMenu(days)),
    };
  } else if (status === 'success' && menu !== null && recipes !== null) {
    props = {
      status: 'success',
      days: toDays(menu, recipes),
      selectedDays: days,
      onSelect: setDays,
      onRegenerate: () => dispatch(generateMenu(days)),
    };
  } else {
    props = {
      status: 'idle',
      selectedDays: days,
      onSelect: setDays,
      onGenerate: () => dispatch(generateMenu(days)),
    };
  }

  return <MenuScreen {...props} />;
}
