import type { ReactNode } from 'react';
import { styled } from 'styled-components';

import { tokens } from './theme/tokens';

const { colors, radii, space, fonts } = tokens;

export type AccountSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  env: { name: string; firebaseProjectId: string };
  children: ReactNode;
};

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(31, 27, 22, 0.5);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
`;

const Panel = styled.div`
  background: ${colors.white};
  border-radius: ${radii.lg} ${radii.lg} 0 0;
  padding: ${space.xl}px ${space.lg}px calc(${space.xl}px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: ${space.lg}px;
  animation: rise 0.2s ease-out;

  @keyframes rise {
    from {
      transform: translateY(100%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Title = styled.h2`
  font-family: ${fonts.serif};
  font-size: 22px;
  color: ${colors.ink};
  margin: 0;
`;

const CloseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  margin-right: -${space.md}px;
  background: none;
  border: none;
  color: ${colors.inkSecondary};
  cursor: pointer;
`;

const DevInfo = styled.p`
  font-family: ${fonts.body};
  font-size: 12px;
  color: ${colors.inkSecondary};
  margin: 0;
`;

export function AccountSheet({ isOpen, onClose, env, children }: AccountSheetProps) {
  if (!isOpen) return null;

  return (
    <Overlay data-testid="account-sheet-overlay" onClick={onClose}>
      <Panel onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>Compte</Title>
          <CloseButton type="button" aria-label="Fermer" onClick={onClose}>
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
              <path d="M6 6l12 12" />
              <path d="M18 6L6 18" />
            </svg>
          </CloseButton>
        </Header>
        {env.name === 'dev' && (
          <DevInfo>
            Environnement : {env.name} · Firebase : {env.firebaseProjectId}
          </DevInfo>
        )}
        {children}
      </Panel>
    </Overlay>
  );
}
