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

// `--tabbar-h` publie la hauteur occupée par la tab bar à tout le sous-arbre de l'application.
// Le scrollport, lui, se termine au bas du viewport — donc SOUS la tab bar : un écran qui veut
// poser une commande collante en bas doit la décaler de cette hauteur, sans quoi `bottom: 0` la
// glisserait derrière la tab bar. La valeur vit ici, en un seul endroit ; la tab bar la reprend
// comme HAUTEUR déclarée, et le scénario « la barre d'action se pose exactement sur le haut de la
// tab bar » confronte les deux à la géométrie réelle à chaque exécution : elle ne peut pas dériver
// en silence.
const Shell = styled.div`
  --tabbar-h: calc(56px + env(safe-area-inset-bottom));
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: ${colors.creme};
`;

const Content = styled.main`
  flex: 1;
  /* Colonne flex, et non un bloc : le flex:1 ci-dessus prend toute la hauteur restante du Shell,
     mais un <main> en display:block ne la transmet pas — l'écran de la route l'épouserait, et ses
     états centrés se colleraient sous l'en-tête. La colonne rend cette hauteur distribuable. */
  display: flex;
  flex-direction: column;
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
