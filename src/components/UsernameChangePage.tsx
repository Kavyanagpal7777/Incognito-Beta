/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Check, 
  X, 
  ShieldCheck, 
  ShieldAlert, 
  Loader2, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  RefreshCw, 
  AlertTriangle,
  Lock,
  Award,
  Calendar,
  Zap,
  CheckCircle2,
  HelpCircle,
  Clock
} from 'lucide-react';
import { UserAccount, Post } from '../types';
import AIUsernameGenerator from './AIUsernameGenerator';

interface UsernameChangePageProps {
  currentUser: UserAccount;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserAccount | null>>;
  accounts: UserAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  onTriggerToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onNavigateTab?: (tab: 'feed' | 'security' | 'username') => void;
}

export default function UsernameChangePage({
  currentUser,
  setCurrentUser,
  accounts,
  setAccounts,
  posts,
  setPosts,
  onTriggerToast,
  onNavigateTab,
}: UsernameChangePageProps) {
  // Input states
  const [newUsername, setNewUsername] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [status, setStatus] = useState<'empty' | 'available' | 'taken' | 'invalid' | 'same'>('empty');
  const [errorMessage, setErrorMessage] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Confirmation Flow states
  const [step, setStep] = useState<'input' | 'confirm'>('input');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [understandTerms, setUnderstandTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAiDrawer, setShowAiDrawer] = useState(false);

  // History of recent changes in current session (for audit logs display)
  const [lastChangedAt, setLastChangedAt] = useState<string | null>(null);

  // Real-time username check logic
  useEffect(() => {
    const trimmed = newUsername.trim();

    if (!trimmed) {
      setStatus('empty');
      setErrorMessage('');
      setSuggestions([]);
      return;
    }

    if (trimmed.toLowerCase() === currentUser.username.toLowerCase()) {
      setStatus('same');
      setErrorMessage('This is already your current handle.');
      setSuggestions([]);
      return;
    }

    // Format validation: 3-20 characters, alphanumeric or underscores
    const validRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!validRegex.test(trimmed)) {
      setStatus('invalid');
      if (trimmed.length < 3) {
        setErrorMessage('Username must be at least 3 characters.');
      } else if (trimmed.length > 20) {
        setErrorMessage('Username cannot exceed 20 characters.');
      } else {
        setErrorMessage('Only letters, numbers, and underscores are permitted.');
      }
      setSuggestions([]);
      return;
    }

    // Simulated network verification delay for realism
    setIsChecking(true);
    const timer = setTimeout(() => {
      // Check if username is taken by any account (case-insensitive)
      const taken = accounts.some(
        (acc) => acc.username.toLowerCase() === trimmed.toLowerCase()
      );

      if (taken) {
        setStatus('taken');
        setErrorMessage(`@${trimmed} is already registered by another node.`);
        // Provide 3 quick smart variations as suggestions
        setSuggestions([
          `${trimmed}_x`,
          `Cyber_${trimmed}`,
          `${trimmed}_${Math.floor(100 + Math.random() * 900)}`,
        ]);
      } else {
        setStatus('available');
        setErrorMessage('');
        setSuggestions([]);
      }
      setIsChecking(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [newUsername, currentUser.username, accounts]);

  // Handle Proceed to Confirmation
  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== 'available') {
      onTriggerToast('Please choose a valid available username.', 'error');
      return;
    }
    setStep('confirm');
  };

  // Execute Username Change Migration
  const handleExecuteChange = async () => {
    if (!understandTerms) {
      onTriggerToast('Please accept the identity migration confirmation checkbox.', 'error');
      return;
    }

    // If user registered with a password, optionally verify or allow submission
    if (currentUser.password && confirmPassword && currentUser.password !== confirmPassword) {
      onTriggerToast('Incorrect confirmation password entered.', 'error');
      return;
    }

    setIsSubmitting(true);

    // Simulate backend network delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    const oldUsername = currentUser.username;
    const finalNewUsername = newUsername.trim();

    // 1. Update Current User object
    const updatedUser: UserAccount = {
      ...currentUser,
      username: finalNewUsername,
    };
    setCurrentUser(updatedUser);
    localStorage.setItem('incognito_current_user', JSON.stringify(updatedUser));

    // 2. Update Accounts list
    const updatedAccounts = accounts.map((acc) =>
      acc.id === currentUser.id || acc.username === oldUsername
        ? { ...acc, username: finalNewUsername }
        : acc
    );
    setAccounts(updatedAccounts);
    localStorage.setItem('incognito_accounts', JSON.stringify(updatedAccounts));

    // 3. Update all Posts and Comments created by this user
    const updatedPosts = posts.map((post) => {
      let postModified = false;
      let newPostUsername = post.username;

      if (post.username === oldUsername) {
        newPostUsername = finalNewUsername;
        postModified = true;
      }

      const updatedComments = post.comments.map((comment) => {
        if (comment.username === oldUsername) {
          return { ...comment, username: finalNewUsername };
        }
        return comment;
      });

      return {
        ...post,
        username: newPostUsername,
        comments: updatedComments,
      };
    });

    setPosts(updatedPosts);
    localStorage.setItem('incognito_posts', JSON.stringify(updatedPosts));

    setIsSubmitting(false);
    setLastChangedAt(new Date().toLocaleTimeString());
    setStep('input');
    setNewUsername('');
    setConfirmPassword('');
    setUnderstandTerms(false);

    onTriggerToast(`Username successfully changed to @${finalNewUsername}! Forum posts updated.`, 'success');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6" id="username-change-page">
      
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-[#0c1322]/80 via-[#09101d]/90 to-[#0c1322]/80 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" /> Identity Manager
            </span>
            <span className="text-[10px] text-white/30 font-mono">• Active Node Protocol</span>
          </div>
          <h2 className="text-2xl font-black font-display text-white tracking-tight">
            Username Change Request
          </h2>
          <p className="text-xs text-white/60 mt-1 max-w-xl leading-relaxed">
            Modify your public persona handle across the network. Changing your handle automatically re-indexes your posts, comments, and karma reputation instantly.
          </p>
        </div>

        {onNavigateTab && (
          <button
            onClick={() => onNavigateTab('security')}
            className="self-start sm:self-center px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Vault Settings</span>
          </button>
        )}
      </div>

      {/* MAIN TWO-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: CURRENT HANDLE PROFILE CARD (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Current Handle Card */}
          <div className="glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/40 block mb-4">
              Current Active Handle
            </span>

            <div className="flex items-center gap-4 mb-5">
              <img
                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80'}
                alt={currentUser.username}
                className="w-16 h-16 rounded-2xl border-2 border-cyan-500/40 object-cover shadow-lg"
                referrerPolicy="no-referrer"
              />
              <div className="overflow-hidden">
                <h3 className="text-xl font-bold font-display text-white truncate">
                  @{currentUser.username}
                </h3>
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Verified Identity
                </span>
              </div>
            </div>

            {/* User Stats Grid */}
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/5">
              <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                <span className="text-[9px] uppercase font-bold text-white/40 block">Network Karma</span>
                <span className="text-sm font-bold font-display text-cyan-300 mt-0.5 block">
                  {currentUser.karma} XP
                </span>
              </div>
              <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                <span className="text-[9px] uppercase font-bold text-white/40 block">Member Since</span>
                <span className="text-xs font-semibold text-white/80 mt-1 block">
                  {currentUser.joinDate || 'Jul 2026'}
                </span>
              </div>
            </div>

            {/* Decoupled Vault Notice */}
            <div className="mt-4 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/15 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-cyan-200/80 leading-relaxed">
                <strong>Vault Decoupled:</strong> Changing your handle does not affect your login credentials, recovery email, or private telemetry.
              </p>
            </div>

            {/* Audit log indicator if changed in session */}
            {lastChangedAt && (
              <div className="mt-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Last updated at <strong>{lastChangedAt}</strong></span>
              </div>
            )}
          </div>

          {/* Quick Guidance Box */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/70 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400" /> Username Guidelines
            </h4>
            <ul className="text-[11px] text-white/50 space-y-1.5 list-disc list-inside leading-normal">
              <li>Length between 3 and 20 characters</li>
              <li>Allowed: letters, numbers, underscores (<code className="text-cyan-300">_</code>)</li>
              <li>Must be unique and unassigned across all nodes</li>
              <li>Updates your signature across public feeds immediately</li>
            </ul>
          </div>

        </div>

        {/* RIGHT COLUMN: REQUEST FORM & CONFIRMATION FLOW (7 cols) */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: INPUT & AVAILABILITY CHECK */}
            {step === 'input' && (
              <motion.div
                key="step-input"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/10 space-y-6"
              >
                <div>
                  <h3 className="text-lg font-bold font-display text-white flex items-center gap-2">
                    Step 1: Check Username Availability
                  </h3>
                  <p className="text-xs text-white/50 mt-1">
                    Enter your desired new public handle below to verify real-time network availability.
                  </p>
                </div>

                <form onSubmit={handleProceedToConfirm} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase font-bold tracking-widest text-white/50 flex justify-between">
                      <span>Proposed New Username</span>
                      <span className="text-cyan-400">@handle</span>
                    </label>

                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 font-bold text-sm">
                        @
                      </span>
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value.replace(/\s+/g, ''))}
                        placeholder="e.g. NeonVanguard"
                        maxLength={20}
                        className={`w-full pl-8 pr-11 py-3 rounded-xl glass-input text-sm font-semibold outline-none transition-all ${
                          status === 'available'
                            ? 'border-emerald-500/50 focus:border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                            : status === 'taken' || status === 'invalid'
                            ? 'border-rose-500/50 focus:border-rose-500/80'
                            : ''
                        }`}
                      />

                      {/* Input Icon Feedback */}
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                        {isChecking && <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />}
                        {!isChecking && status === 'available' && (
                          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                        {!isChecking && (status === 'taken' || status === 'invalid') && (
                          <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                            <X className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status Feedback Banner */}
                    <AnimatePresence mode="wait">
                      {status === 'available' && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-medium flex items-center justify-between"
                        >
                          <span className="flex items-center gap-1.5 font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            @{newUsername} is available for reservation!
                          </span>
                          <span className="text-[10px] text-emerald-400/70 font-mono">Status 200 OK</span>
                        </motion.div>
                      )}

                      {(status === 'taken' || status === 'invalid' || status === 'same') && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-2"
                        >
                          <span className="flex items-center gap-1.5 font-bold">
                            <ShieldAlert className="w-4 h-4 text-rose-400" />
                            {errorMessage}
                          </span>

                          {/* Quick Suggestions list */}
                          {suggestions.length > 0 && (
                            <div className="pt-1 border-t border-rose-500/15">
                              <span className="text-[9px] uppercase font-bold text-white/50 block mb-1.5">
                                Available Alternatives:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {suggestions.map((sug, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setNewUsername(sug)}
                                    className="px-2.5 py-1 bg-white/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-white border border-white/10 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                  >
                                    @{sug}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* AI Generator Helper Button & Accordion */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAiDrawer(!showAiDrawer)}
                      className="w-full p-3 rounded-xl bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-indigo-500/10 hover:from-cyan-500/20 hover:to-indigo-500/20 border border-cyan-500/20 text-xs font-bold text-cyan-300 flex items-center justify-between transition-all cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        Need inspiration? Launch AI Handle Generator
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-cyan-400/80 font-semibold">
                        {showAiDrawer ? 'Hide Generator' : 'Generate Handles'}
                      </span>
                    </button>

                    <AnimatePresence>
                      {showAiDrawer && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden pt-3"
                        >
                          <AIUsernameGenerator
                            currentUsername={currentUser.username}
                            onSelectUsername={(name) => {
                              setNewUsername(name);
                              setShowAiDrawer(false);
                            }}
                            existingUsernames={accounts.map((acc) => acc.username)}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Proceed Action Button */}
                  <div className="pt-4 border-t border-white/5">
                    <button
                      type="submit"
                      disabled={status !== 'available' || isChecking}
                      className={`w-full py-3.5 rounded-xl font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        status === 'available' && !isChecking
                          ? 'btn-gradient text-white shadow-lg shadow-cyan-500/20 hover:scale-[1.01]'
                          : 'bg-white/5 text-white/30 border border-white/5 cursor-not-allowed'
                      }`}
                    >
                      <span>Proceed to Confirmation</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* STEP 2: CONFIRMATION & VERIFICATION STEP */}
            {step === 'confirm' && (
              <motion.div
                key="step-confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-panel p-6 sm:p-8 rounded-2xl border border-cyan-500/30 space-y-6 relative overflow-hidden"
              >
                {/* Neon Top Edge Accent */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />

                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[9px] font-bold uppercase tracking-wider inline-flex items-center gap-1 mb-2">
                    <ShieldCheck className="w-3 h-3 text-cyan-400" /> Final Step
                  </span>
                  <h3 className="text-xl font-black font-display text-white">
                    Step 2: Confirm Username Transition
                  </h3>
                  <p className="text-xs text-white/60 mt-1">
                    Review your identity migration details before committing changes to the network.
                  </p>
                </div>

                {/* Transition Card Comparison */}
                <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-bold text-white/40 block">Previous Handle</span>
                      <span className="font-bold text-rose-300/80 line-through font-mono">
                        @{currentUser.username}
                      </span>
                    </div>

                    <div className="p-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                      <ArrowRight className="w-4 h-4" />
                    </div>

                    <div className="space-y-1 text-right">
                      <span className="text-[9px] uppercase font-bold text-cyan-400 block">New Handle</span>
                      <span className="font-bold text-emerald-400 font-mono text-base">
                        @{newUsername}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/5 space-y-2 text-[11px] text-white/70">
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{posts.filter(p => p.username === currentUser.username).length} forum posts will be re-attributed to @{newUsername}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Karma points ({currentUser.karma} XP) & badges transferred intact</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Private account vault metadata remains untouched</span>
                    </div>
                  </div>
                </div>

                {/* Optional Security Password Verification if user has password set */}
                {currentUser.password && (
                  <div className="space-y-1.5">
                    <label className="block text-[9px] uppercase font-bold tracking-widest text-white/50">
                      Verify Password (Security Protocol)
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Enter account password to confirm"
                        className="w-full px-4 py-2.5 rounded-xl glass-input text-xs outline-none"
                      />
                      <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                    </div>
                  </div>
                )}

                {/* Terms Agreement Checkbox */}
                <label className="flex items-start gap-2.5 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    checked={understandTerms}
                    onChange={(e) => setUnderstandTerms(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 accent-cyan-500 cursor-pointer mt-0.5"
                  />
                  <span className="text-xs text-white/70 group-hover:text-white transition-colors leading-snug">
                    I verify that I want to migrate my public handle from <strong className="text-rose-300">@{currentUser.username}</strong> to <strong className="text-emerald-400">@{newUsername}</strong> across the INCOGNITO public network.
                  </span>
                </label>

                {/* Actions Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('input')}
                    disabled={isSubmitting}
                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white font-bold text-xs tracking-wider uppercase transition-colors cursor-pointer"
                  >
                    Back & Edit
                  </button>

                  <button
                    type="button"
                    onClick={handleExecuteChange}
                    disabled={!understandTerms || isSubmitting}
                    className={`flex-1 py-3 rounded-xl font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      understandTerms && !isSubmitting
                        ? 'btn-gradient text-white shadow-lg shadow-cyan-500/25 hover:scale-[1.01]'
                        : 'bg-white/5 text-white/30 border border-white/5 cursor-not-allowed'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Migrating Node...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 text-cyan-300" />
                        <span>Confirm & Apply Handle</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}
