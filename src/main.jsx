import React from 'react';
import { createRoot } from 'react-dom/client';
import HarnessApp from './harness/HarnessApp.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HarnessApp />
  </React.StrictMode>
);
