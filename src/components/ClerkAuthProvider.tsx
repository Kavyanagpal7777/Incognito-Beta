import React from 'react';
import { ClerkProvider } from '@clerk/clerk-react';

const PUBLISHABLE_KEY = 
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) ||
  (typeof process !== 'undefined' && process.env && process.env.CLERK_PUBLISHABLE_KEY) ||
  '';

interface ClerkAuthProviderProps {
  children: React.ReactNode;
}

export const ClerkAuthProvider: React.FC<ClerkAuthProviderProps> = ({ children }) => {
  if (!PUBLISHABLE_KEY) {
    // Graceful fallback when publishable key is waiting to be injected by environment
    return <>{children}</>;
  }

  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      {children}
    </ClerkProvider>
  );
};

export default ClerkAuthProvider;
