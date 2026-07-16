import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { TopBar } from './TopBar';

describe('TopBar', () => {
  it('affiche la marque « Meal Planner »', () => {
    render(<TopBar onAccountClick={() => {}} />);

    expect(screen.getByText('Meal Planner')).toBeInTheDocument();
  });

  it('déclenche onAccountClick au clic sur le bouton compte', async () => {
    const user = userEvent.setup();
    const onAccountClick = vi.fn();
    render(<TopBar onAccountClick={onAccountClick} />);

    await user.click(screen.getByRole('button', { name: /compte/i }));

    expect(onAccountClick).toHaveBeenCalledTimes(1);
  });
});
