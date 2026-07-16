import { Link, Outlet } from 'react-router-dom';
import { styled } from 'styled-components';

import { env } from '../config/env';
import { LogoutButton } from './features/auth/LogoutButton';
import { tokens } from './theme/tokens';

const { colors, space, fonts } = tokens;

// Navigation minimale entre les écrans principaux (précurseur de la future tab-bar).
const Nav = styled.nav`
  display: flex;
  gap: ${space.lg}px;
  padding: ${space.md}px ${space.lg}px;
  border-bottom: 1px solid ${colors.hairline};
`;

const NavLink = styled(Link)`
  font-family: ${fonts.body};
  font-size: 14px;
  color: ${colors.ink};
  text-decoration: none;
`;

// Chrome applicatif partagé par toutes les routes (sous l'auth) : en-tête env + logout,
// nav principale, puis <Outlet/> pour le contenu de la route active.
export function Layout() {
  return (
    <main>
      🥕 Meal Planner — env : {env.name} — Firebase : {env.firebase.projectId}
      <LogoutButton />
      <Nav>
        <NavLink to="/catalogue">Catalogue</NavLink>
        <NavLink to="/menu">Menu</NavLink>
      </Nav>
      <Outlet />
    </main>
  );
}
