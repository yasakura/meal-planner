import { styled } from 'styled-components';
import { NavLink } from 'react-router-dom';

import { tokens } from './theme/tokens';

const { colors, space, fonts } = tokens;

// La hauteur est DÉCLARÉE, et déclarée par la variable que le reste de l'application consomme
// pour se poser au-dessus de la tab bar. Émergente (bordure + paddings + icône + interligne d'un
// libellé à 11px), elle dépendait de la police effectivement résolue : `-apple-system` n'existe
// ni sur Linux ni en CI, et le même empilement pouvait valoir 57px ailleurs — un pixel de
// recouvrement invisible pour tout filet tournant sur Chromium.
const Bar = styled.nav`
  height: var(--tabbar-h);
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

  /* L'onglet est une colonne flex : sans ce refus de compression, c'est l'ICÔNE qui cède la
     première quand le libellé grandit — pas le libellé, et rien ne déborde. Mesuré à 22px de
     déclaré : 7px peints avec un libellé à 24px, 0 à 34px. L'interligne de system-ui varie de
     12,8 (DejaVu) à 15,0 (Noto Sans) selon la machine, pour 13px de budget : la compression
     n'attend pas qu'on change le libellé pour arriver, elle attend qu'on change de poste. */
  & > svg {
    flex-shrink: 0;
  }

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
