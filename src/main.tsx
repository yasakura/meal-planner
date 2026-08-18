import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { App } from './ui/App';
import { AuthGate } from './ui/features/auth/AuthGate';
import { GlobalStyle } from './ui/theme/global-style';

// SEUL point de bascule du mode e2e, et il est STATIQUE : Vite remplace `import.meta.env.VITE_E2E`
// par un littéral au build, Rollup replie le ternaire et supprime la branche morte — donc les
// adapters e2e ne sont pas dans le bundle de production (vérifié en cherchant dans `dist/`).
//
// Surtout PAS un `?e2e=1` évalué à l'exécution : une URL capable de basculer la couche de données
// en production est une porte qu'on n'ouvre pas.
//
// Imports DYNAMIQUES des deux côtés, et pas seulement du côté e2e : `config/firebase` appelle
// `initializeApp` au chargement du module et lève si la configuration manque. Un import statique
// de `create-app-store` ferait donc échouer le démarrage en mode e2e, où il n'y a pas de Firebase
// — et une branche non prise ne charge jamais son module.
const store =
  import.meta.env.VITE_E2E === 'true'
    ? (await import('./ui/store/create-e2e-store')).createE2eStore(window)
    : (await import('./ui/store/create-app-store')).createAppStore();

const root = document.getElementById('root');
if (!root) throw new Error('#root introuvable');

createRoot(root).render(
  <StrictMode>
    <GlobalStyle />
    <Provider store={store}>
      <BrowserRouter>
        <AuthGate>
          <App />
        </AuthGate>
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
