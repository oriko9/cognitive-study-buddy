import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import './index.css';

const container = document.getElementById('root');

if (container === null) {
  throw new Error('Root element #root is missing from index.html; the app cannot mount.');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
