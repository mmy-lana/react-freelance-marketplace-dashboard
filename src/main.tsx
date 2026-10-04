import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Failed to find root container element');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
