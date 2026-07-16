import { styled } from 'styled-components';
import { NavLink } from 'react-router-dom';

import { tokens } from './theme/tokens';

const { colors, space, fonts } = tokens;

const Bar = styled.nav`
  background: ${colors.white};
  border-top: 1px solid ${colors.hairline};
  padding-bottom: env(safe-area-inset-bottom);
  display: flex;
`;

const Tab = styled(NavLink)`
  flex: 1;
  min-height: 44px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${space.xs}px;
  padding: ${space.sm}px 0;
  text-decoration: none;
  font-family: ${fonts.body};
  font-size: 11px;
  color: ${colors.inkSecondary};

  &.active {
    color: ${colors.terracotta};
  }
`;

const CatalogueIcon = (
  <svg
    width={22}
    height={22}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 6.5C10.5 5 8 4.5 5 5v13c3-.5 5.5 0 7 1.5" />
    <path d="M12 6.5C13.5 5 16 4.5 19 5v13c-3-.5-5.5 0-7 1.5" />
    <path d="M12 6.5v13" />
  </svg>
);

const MenuIcon = (
  <svg
    width={22}
    height={22}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x={4} y={5} width={16} height={16} rx={2} />
    <path d="M4 9h16" />
    <path d="M8 3v4" />
    <path d="M16 3v4" />
  </svg>
);

export function BottomTabBar() {
  return (
    <Bar>
      <Tab to="/catalogue">
        {CatalogueIcon}
        <span>Recettes</span>
      </Tab>
      <Tab to="/menu">
        {MenuIcon}
        <span>Menu</span>
      </Tab>
    </Bar>
  );
}
