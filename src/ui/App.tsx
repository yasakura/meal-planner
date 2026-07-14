import { env } from '../config/env';
import { LogoutButton } from './features/auth/LogoutButton';
import { RecipeCreateContainer } from './features/recipe/RecipeCreateContainer';

export function App() {
  return (
    <main>
      🥕 Meal Planner — env : {env.name} — Firebase : {env.firebase.projectId}
      <LogoutButton />
      <RecipeCreateContainer />
    </main>
  );
}
