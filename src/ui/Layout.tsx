import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { styled } from 'styled-components';

import { env } from '../config/env';
import { AccountSheet } from './AccountSheet';
import { BottomTabBar } from './BottomTabBar';
import { TopBar } from './TopBar';
import { LogoutButton } from './features/auth/LogoutButton';
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
// le contenu), et la garde visible quand la route défile.
const StickyTabBar = styled.div`
  position: sticky;
  bottom: 0;
`;

// Chrome applicatif partagé par toutes les routes (sous l'auth) : barre haute (marque + compte),
// contenu de la route via <Outlet/>, tab bar basse, et sheet Compte (déconnexion + info dev).
export function Layout() {
  const [isAccountOpen, setAccountOpen] = useState(false);

  return (
    <Shell>
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
        <LogoutButton />
      </AccountSheet>
    </Shell>
  );
}
