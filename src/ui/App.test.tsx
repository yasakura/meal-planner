import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('rend le titre Meal Planner', () => {
    render(<App />);
    expect(screen.getByText(/Meal Planner/)).toBeInTheDocument();
  });

  it("affiche 'env : dev' par défaut dans le badge d'environnement", () => {
    render(<App />);
    expect(screen.getByText(/env : dev/)).toBeInTheDocument();
  });

  it("affiche 'Firebase : non configuré' par défaut dans le badge d'environnement", () => {
    render(<App />);
    expect(screen.getByText(/Firebase : non configuré/)).toBeInTheDocument();
  });
});
