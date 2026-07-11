import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('rend le titre Meal Planner', () => {
    render(<App />);
    expect(screen.getByText('Meal Planner')).toBeInTheDocument();
  });
});
