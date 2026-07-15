import { Outlet } from 'react-router-dom';

import { env } from '../config/env';
import { LogoutButton } from './features/auth/LogoutButton';

// Chrome applicatif partagé par toutes les routes (sous l'auth) : en-tête env + logout,
// puis <Outlet/> pour le contenu de la route active.
export function Layout() {
  return (
    <main>
      🥕 Meal Planner — env : {env.name} — Firebase : {env.firebase.projectId}
      <LogoutButton />
      <Outlet />
    </main>
  );
}
