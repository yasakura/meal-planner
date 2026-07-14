import { env } from '../config/env';
import { LogoutButton } from './features/auth/LogoutButton';

export function App() {
  return (
    <main>
      🥕 Meal Planner — env : {env.name} — Firebase : {env.firebase.projectId}
      <LogoutButton />
    </main>
  );
}
