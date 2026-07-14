import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { GlobalStyle } from './ui/theme/global-style';

const root = document.getElementById('root');
if (!root) throw new Error('#root introuvable');

createRoot(root).render(
  <StrictMode>
    <GlobalStyle />
    <App />
  </StrictMode>,
);
