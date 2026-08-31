import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';

import { BottomTabBar } from './BottomTabBar';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BottomTabBar />
    </MemoryRouter>,
  );
}

describe('BottomTabBar', () => {
  it('rend un onglet Recettes vers /catalogue', () => {
    renderAt('/catalogue');

    expect(screen.getByRole('link', { name: /recettes/i })).toHaveAttribute('href', '/catalogue');
  });

  it('rend un onglet Menu vers /menu', () => {
    renderAt('/catalogue');

    expect(screen.getByRole('link', { name: /menu/i })).toHaveAttribute('href', '/menu');
  });

  it('place l’onglet Menu avant l’onglet Recettes', () => {
    renderAt('/menu');

    const onglets = screen.getAllByRole('link');

    expect(onglets.map((onglet) => onglet.getAttribute('href'))).toEqual(['/menu', '/catalogue']);
  });

  it('marque l’onglet actif via aria-current', () => {
    renderAt('/menu');

    expect(screen.getByRole('link', { name: /menu/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /recettes/i })).not.toHaveAttribute('aria-current');
  });
});
