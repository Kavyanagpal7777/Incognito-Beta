import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App.tsx';
import './index.css';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const isClerkKeyValid = typeof PUBLISHABLE_KEY === 'string' && PUBLISHABLE_KEY.startsWith('pk_') && !PUBLISHABLE_KEY.includes('YOUR_CLERK');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isClerkKeyValid ? (
      <ClerkProvider 
        publishableKey={PUBLISHABLE_KEY}
        appearance={{
          variables: {
            colorPrimary: '#00d9ff',
            colorBackground: '#080d1a',
            colorText: '#ffffff',
            colorInputBackground: '#0d162a',
            colorInputText: '#ffffff',
          },
          elements: {
            card: 'bg-[#080d1a]/95 border border-cyan-500/30 backdrop-blur-xl shadow-[0_0_50px_rgba(0,217,255,0.25)] rounded-2xl',
            navbar: 'border-b border-white/10',
            headerTitle: 'text-white font-bold',
            headerSubtitle: 'text-white/60',
            socialButtonsBlockButton: 'bg-black/50 border border-white/10 text-white hover:bg-white/10',
            formButtonPrimary: 'bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white hover:opacity-90',
            footerActionLink: 'text-cyan-400 hover:text-cyan-300'
          }
        }}
      >
        <App isClerkConfigured={true} />
      </ClerkProvider>
    ) : (
      <App isClerkConfigured={false} />
    )}
  </StrictMode>,
);

