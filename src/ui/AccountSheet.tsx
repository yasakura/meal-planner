import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { styled } from 'styled-components';

import { tokens } from './theme/tokens';

const { colors, radii, space, fonts } = tokens;

export type AccountSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  env: { name: string; firebaseProjectId: string };
  children: ReactNode;
};

const Overlay = styled.div<{ $closing: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(31, 27, 22, 0.5);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  transition: opacity 0.2s ease;
  opacity: ${(props) => (props.$closing ? 0 : 1)};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Panel = styled.div<{ $closing: boolean }>`
  background: ${colors.white};
  border-radius: ${radii.lg} ${radii.lg} 0 0;
  padding: ${space.xl}px ${space.lg}px calc(${space.xl}px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: ${space.lg}px;
  transition: transform 0.2s ease-out;
  transform: translateY(${(props) => (props.$closing ? '100%' : '0')});
  animation: ${(props) => (props.$closing ? 'none' : 'rise 0.2s ease-out')};

  @keyframes rise {
    from {
      transform: translateY(100%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: none;
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

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  );
}

export function AccountSheet({ isOpen, onClose, env, children }: AccountSheetProps) {
  const [prevOpen, setPrevOpen] = useState(isOpen);
  const [isClosing, setClosing] = useState(false);

  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    setClosing(!isOpen && !prefersReducedMotion());
  }

  const isRendered = isOpen || isClosing;
  if (!isRendered) return null;

  const finishClose = () => {
    if (isClosing) setClosing(false);
  };

  return createPortal(
    <Overlay $closing={isClosing} data-testid="account-sheet-overlay" onClick={onClose}>
      <Panel
        $closing={isClosing}
        data-testid="account-sheet-panel"
        onClick={(e) => e.stopPropagation()}
        onTransitionEnd={finishClose}
      >
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
    </Overlay>,
    document.body,
  );
}
