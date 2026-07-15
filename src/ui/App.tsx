import { env } from '../config/env';
import { LogoutButton } from './features/auth/LogoutButton';
import { CatalogueContainer } from './features/catalogue/CatalogueContainer';
import { RecipeCreateContainer } from './features/recipe/RecipeCreateContainer';

export function App() {
  return (
    <main>
      🥕 Meal Planner — env : {env.name} — Firebase : {env.firebase.projectId}
      <LogoutButton />
      <CatalogueContainer />
      <RecipeCreateContainer />
    </main>
  );
}
