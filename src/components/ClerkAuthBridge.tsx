import React, { useEffect, useState } from 'react';
import { useUser, useClerk, useAuth, UserButton } from '@clerk/clerk-react';
import { ShieldCheck, Sparkles, LogIn, ExternalLink, UserPlus } from 'lucide-react';
import { UserAccount } from '../types';

interface ClerkAuthBridgeProps {
  onSyncSuccess: (user: UserAccount, redirectTo?: string) => void;
  triggerToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  activeMode?: 'login' | 'signup';
}

export const ClerkAuthBridge: React.FC<ClerkAuthBridgeProps> = ({
  onSyncSuccess,
  triggerToast,
  activeMode = 'login',
}) => {
  const { isLoaded, isSignedIn, user } = useUser();
  const { openSignIn, openSignUp, signOut } = useClerk();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedId, setLastSyncedId] = useState<string | null>(null);

  // Auto-sync active Clerk user into applet backend session
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    if (lastSyncedId === user.id) return;

    const syncClerkProfile = async () => {
      setIsSyncing(true);
      try {
        const primaryEmail = user.primaryEmailAddress?.emailAddress;
        const res = await fetch('/api/auth/clerk-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clerkId: user.id,
            email: primaryEmail,
            username: user.username || user.firstName || (primaryEmail ? primaryEmail.split('@')[0] : `node_${user.id.slice(-6)}`),
            fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            imageUrl: user.imageUrl,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            setLastSyncedId(user.id);
            onSyncSuccess(data.user, data.redirectTo);
            triggerToast(`Authenticated via Clerk as @${data.user.username}`, 'success');
          }
        }
      } catch (err) {
        console.error('[CLERK_BRIDGE_SYNC_ERROR]', err);
        triggerToast('Clerk authentication sync encountered a network issue.', 'error');
      } finally {
        setIsSyncing(false);
      }
    };

    syncClerkProfile();
  }, [isLoaded, isSignedIn, user, lastSyncedId, onSyncSuccess, triggerToast]);

  const handleOpenClerkModal = () => {
    if (activeMode === 'signup') {
      openSignUp({
        appearance: {
          variables: {
            colorPrimary: '#00d9ff',
            colorBackground: '#080d1a',
            colorText: '#ffffff',
            colorInputBackground: '#0d162a',
            colorInputText: '#ffffff',
          },
        },
      });
    } else {
      openSignIn({
        appearance: {
          variables: {
            colorPrimary: '#00d9ff',
            colorBackground: '#080d1a',
            colorText: '#ffffff',
            colorInputBackground: '#0d162a',
            colorInputText: '#ffffff',
          },
        },
      });
    }
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleOpenClerkModal}
        disabled={isSyncing}
        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600/30 via-indigo-600/30 to-cyan-600/30 hover:from-purple-600/50 hover:via-indigo-600/50 hover:to-cyan-600/50 border border-purple-500/40 hover:border-cyan-400/60 text-white font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:shadow-[0_0_25px_rgba(0,217,255,0.35)] cursor-pointer group"
      >
        <div className="p-1 rounded-lg bg-purple-500/30 border border-purple-400/40 text-purple-300 group-hover:scale-105 transition-transform">
          {activeMode === 'signup' ? <UserPlus className="w-3.5 h-3.5" /> : <LogIn className="w-3.5 h-3.5" />}
        </div>
        <span>{isSyncing ? 'Syncing Clerk Session...' : activeMode === 'signup' ? 'Sign Up with Clerk SSO' : 'Continue with Clerk (SSO / Passkey)'}</span>
        <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
      </button>
    </div>
  );
};

export const ClerkUserBadge: React.FC = () => {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded || !isSignedIn || !user) return null;

  return (
    <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-200 text-xs">
      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      <span className="text-[11px] font-mono font-medium hidden sm:inline">Clerk Active</span>
      <UserButton 
        appearance={{
          elements: {
            userButtonAvatarBox: 'w-6 h-6 border border-cyan-400/50 rounded-full'
          }
        }}
      />
    </div>
  );
};
