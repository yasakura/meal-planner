import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter } from 'react-router-dom';
import { afterEach, describe, it, expect, vi } from 'vitest';

import { ScrollToTop } from './ScrollToTop';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ScrollToTop', () => {
  it('remet le scroll de la fenêtre en haut au changement de route', async () => {
    const user = userEvent.setup();
    const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={['/catalogue']}>
        <ScrollToTop />
        <Link to="/catalogue/nouvelle">aller à la création</Link>
      </MemoryRouter>,
    );
    // Ignore l'appel éventuel au montage : on cible le comportement au changement de route.
    scrollSpy.mockClear();

    await user.click(screen.getByText('aller à la création'));

    expect(scrollSpy).toHaveBeenCalledWith(0, 0);
  });
});
