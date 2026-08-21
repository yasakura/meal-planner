import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, it, expect, vi } from 'vitest';

import { AccountSheet } from './AccountSheet';

const envDev = { name: 'dev', firebaseProjectId: 'meal-planner-dev-c9e0d' };

function sheet(isOpen: boolean) {
  return (
    <AccountSheet isOpen={isOpen} onClose={() => {}} env={envDev}>
      <button type="button">Se déconnecter</button>
    </AccountSheet>
  );
}

describe('AccountSheet', () => {
  it('ne rend rien quand fermée', () => {
    render(
      <AccountSheet isOpen={false} onClose={() => {}} env={envDev}>
        <button type="button">Se déconnecter</button>
      </AccountSheet>,
    );

    expect(screen.queryByText('Compte')).not.toBeInTheDocument();
  });

  it('rend le titre « Compte » quand ouverte', () => {
    render(
      <AccountSheet isOpen onClose={() => {}} env={envDev}>
        <button type="button">Se déconnecter</button>
      </AccountSheet>,
    );

    expect(screen.getByText('Compte')).toBeInTheDocument();
  });

  it('affiche l’info dev (environnement + projet Firebase) quand env dev', () => {
    render(
      <AccountSheet isOpen onClose={() => {}} env={envDev}>
        <button type="button">Se déconnecter</button>
      </AccountSheet>,
    );

    expect(screen.getByText(/Environnement : dev/)).toBeInTheDocument();
    expect(screen.getByText(/meal-planner-dev-c9e0d/)).toBeInTheDocument();
  });

  it('masque l’info dev hors environnement dev', () => {
    render(
      <AccountSheet
        isOpen
        onClose={() => {}}
        env={{ name: 'prod', firebaseProjectId: 'meal-planner-prod' }}
      >
        <button type="button">Se déconnecter</button>
      </AccountSheet>,
    );

    expect(screen.queryByText(/Environnement :/)).not.toBeInTheDocument();
  });

  it('rend l’action de déconnexion passée en children', () => {
    render(
      <AccountSheet isOpen onClose={() => {}} env={envDev}>
        <button type="button">Se déconnecter</button>
      </AccountSheet>,
    );

    expect(screen.getByRole('button', { name: /se déconnecter/i })).toBeInTheDocument();
  });

  it('appelle onClose au clic sur l’overlay', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <AccountSheet isOpen onClose={onClose} env={envDev}>
        <button type="button">Se déconnecter</button>
      </AccountSheet>,
    );

    await user.click(screen.getByTestId('account-sheet-overlay'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('appelle onClose au clic sur le bouton de fermeture', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <AccountSheet isOpen onClose={onClose} env={envDev}>
        <button type="button">Se déconnecter</button>
      </AccountSheet>,
    );

    await user.click(screen.getByRole('button', { name: /fermer/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('reste montée pendant la fermeture, puis se démonte au transitionEnd du panneau', () => {
    const { rerender } = render(sheet(true));
    expect(screen.getByText('Compte')).toBeInTheDocument();

    rerender(sheet(false));
    expect(screen.getByText('Compte')).toBeInTheDocument();

    fireEvent.transitionEnd(screen.getByTestId('account-sheet-panel'));

    expect(screen.queryByText('Compte')).not.toBeInTheDocument();
  });

  it('rend le contenu dans un portail sur document.body (hors du conteneur du Layout)', () => {
    const { container } = render(sheet(true));

    const panel = screen.getByTestId('account-sheet-panel');
    expect(document.body).toContainElement(panel);
    expect(container).not.toContainElement(panel);
  });

  it('se démonte immédiatement à la fermeture quand prefers-reduced-motion', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true } as MediaQueryList));

    const { rerender } = render(sheet(true));
    expect(screen.getByText('Compte')).toBeInTheDocument();

    rerender(sheet(false));

    expect(screen.queryByText('Compte')).not.toBeInTheDocument();
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});
