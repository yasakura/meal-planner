import { useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Outlet, useLocation } from 'react-router-dom';
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

const { colors, space, fonts } = tokens;

const Shell = styled.div`
  --topbar-h: 52px;
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

const EcranEnPanneText = styled.p`
  font-family: ${fonts.body};
  font-size: 14px;
  color: ${colors.terracotta};
  margin: 0;
  padding: ${space.xl}px;
  text-align: center;
`;

function EcranEnPanne() {
  return <EcranEnPanneText role="alert">Cet écran n’a pas pu s’afficher.</EcranEnPanneText>;
}

const StickyTabBar = styled.div`
  position: sticky;
  bottom: 0;
  z-index: 10;
`;

export function Layout() {
  const [isAccountOpen, setAccountOpen] = useState(false);
  const { key } = useLocation();

  return (
    <Shell>
      <ScrollToTop />
      <TopBar onAccountClick={() => setAccountOpen(true)} />
      <LinkBanner />
      <Content>
        <ErrorBoundary FallbackComponent={EcranEnPanne} resetKeys={[key]}>
          <Outlet />
        </ErrorBoundary>
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
