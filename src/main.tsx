import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { App } from './ui/App';
import { AuthGate } from './ui/features/auth/AuthGate';
import { createAppStore } from './ui/store/create-app-store';
import { GlobalStyle } from './ui/theme/global-style';

const store = createAppStore();

const root = document.getElementById('root');
if (!root) throw new Error('#root introuvable');

createRoot(root).render(
  <StrictMode>
    <GlobalStyle />
    <Provider store={store}>
      <AuthGate>
        <App />
      </AuthGate>
    </Provider>
  </StrictMode>,
);
