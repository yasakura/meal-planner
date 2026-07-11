import { env } from '../config/env';

export function App() {
  return (
    <main>
      🥕 Meal Planner — env : {env.name} — Firebase : {env.firebase.projectId}
    </main>
  );
}
