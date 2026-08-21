import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { App } from './ui/App';
import { AuthGate } from './ui/features/auth/AuthGate';
import { GlobalStyle } from './ui/theme/global-style';

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
