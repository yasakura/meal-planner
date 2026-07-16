import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Au changement de route, on repart du haut de la page (le conteneur de scroll de l'app est
// la fenêtre). Composant sans rendu, monté dans le Layout.
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
