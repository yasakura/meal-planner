import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { styled } from 'styled-components';

import { env } from '../config/env';
import { AccountSheet } from './AccountSheet';
import { BottomTabBar } from './BottomTabBar';
import { ScrollToTop } from './ScrollToTop';
import { TopBar } from './TopBar';
import { LogoutButton } from './features/auth/LogoutButton';
import { LinkBanner } from './LinkBanner';
import { ConvivesContainer } from './features/convives/ConvivesContainer';
import { tokens } from './theme/tokens';

const { colors, space } = tokens;

const Shell = styled.div`
  --tabbar-h: calc(56px + env(safe-area-inset-bottom));
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: ${colors.creme};
`;

const Content = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-bottom: ${space.xl}px;
`;

const StickyTabBar = styled.div`
  position: sticky;
  bottom: 0;
  z-index: 10;
`;

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
        <LinkBanner />
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
