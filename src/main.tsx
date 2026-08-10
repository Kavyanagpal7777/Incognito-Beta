import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import ClerkAuthProvider from './components/ClerkAuthProvider.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkAuthProvider>
      <App />
    </ClerkAuthProvider>
  </StrictMode>,
);

