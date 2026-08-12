import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { styled } from 'styled-components';

import { env } from '../config/env';
import { AccountSheet } from './AccountSheet';
import { BottomTabBar } from './BottomTabBar';
import { ScrollToTop } from './ScrollToTop';
import { TopBar } from './TopBar';
import { LogoutButton } from './features/auth/LogoutButton';
import { ConvivesContainer } from './features/convives/ConvivesContainer';
import { tokens } from './theme/tokens';

const { colors, space } = tokens;

const Shell = styled.div`
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: ${colors.creme};
`;

const Content = styled.main`
  flex: 1;
  /* Respiration en bas de contenu avant la tab bar (confort de lecture, pas anti-recouvrement :
     la tab bar est sticky et réserve sa propre place dans le flux). */
  padding-bottom: ${space.xl}px;
`;

// Tab bar collante en bas du viewport : sticky réserve sa place dans le flux (ne recouvre pas
// le contenu), et la garde visible quand la route défile. z-index aligné sur la TopBar (10),
// sous l'overlay de la sheet (100).
const StickyTabBar = styled.div`
  position: sticky;
  bottom: 0;
  z-index: 10;
`;

// Chrome applicatif partagé par toutes les routes (sous l'auth) : barre haute (marque + compte),
// contenu de la route via <Outlet/>, tab bar basse, et sheet Compte (déconnexion + info dev).
export function Layout() {
  const [isAccountOpen, setAccountOpen] = useState(false);

  return (
    <Shell>
      <ScrollToTop />
      <TopBar onAccountClick={() => setAccountOpen(true)} />
      <Content>
        <Outlet />
      </Content>
      <StickyTabBar>
        <BottomTabBar />
      </StickyTabBar>
      <AccountSheet
        isOpen={isAccountOpen}
        onClose={() => setAccountOpen(false)}
        env={{ name: env.name, firebaseProjectId: env.firebase.projectId }}
      >
        <ConvivesContainer />
        <LogoutButton />
      </AccountSheet>
    </Shell>
  );
}
