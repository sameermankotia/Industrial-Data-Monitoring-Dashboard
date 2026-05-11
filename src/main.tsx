import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import 'bootstrap/dist/css/bootstrap-grid.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
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
