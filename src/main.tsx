import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Global styles are added first so component CSS can override theme variables if
// it needs to. i18n init lives at module scope , importing it here makes
// sure react-i18next is ready before App tries to render fully.
import './styles/globals.css';
import './i18n';

import App from './App';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
