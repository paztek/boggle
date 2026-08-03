import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { registerServiceWorker } from './lib/register-sw.ts';
import './styles/global.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error("Élément #root introuvable : impossible de monter l'application.");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

registerServiceWorker();
