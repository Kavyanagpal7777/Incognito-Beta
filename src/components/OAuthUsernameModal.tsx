/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  ShieldCheck, 
  Sparkles, 
  Loader2, 
  Check, 
  X, 
  ArrowRight,
  HelpCircle,
  Lock
} from 'lucide-react';
import { generateUsernameSuggestions } from '../data/mockData';
import { UserAccount } from '../types';
import AIUsernameGenerator from './AIUsernameGenerator';

interface OAuthUsernameModalProps {
  platform: 'Google' | 'Facebook';
  email: string;
  realName: string;
  existingUsernames: string[];
  onComplete: (username: string, agree: boolean) => void;
  onCancel: () => void;
}

export default function OAuthUsernameModal({ 
  platform, 
  email, 
  realName, 
  existingUsernames, 
  onComplete, 
  onCancel 
}: OAuthUsernameModalProps) {
  const [username, setUsername] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<'empty' | 'validating' | 'available' | 'taken' | 'invalid'>('empty');
  const [errorMsg, setErrorMsg] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Validate username rules in real-time
  useEffect(() => {
    if (!username.trim()) {
      setStatus('empty');
      setErrorMsg('');
      setSuggestions([]);
      return;
    }

    setStatus('validating');
    setChecking(true);

    const timer = setTimeout(() => {
      setChecking(false);
      
      // Rule 1: Length check (3-20 chars)
      if (username.length < 3 || username.length > 20) {
        setStatus('invalid');
        setErrorMsg('Username must be between 3 and 20 characters.');
        setSuggestions(generateUsernameSuggestions(username));
        return;
      }

      // Rule 2: Character regex checks (A-Z, a-z, 0-9, _, .)
      if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
        setStatus('invalid');
        setErrorMsg('Only letters, numbers, underscores (_), and periods (.) allowed.');
        setSuggestions(generateUsernameSuggestions(username));
        return;
      }

      // Rule 3: Unique check against existing accounts
      const isTaken = existingUsernames.some(u => u.toLowerCase() === username.toLowerCase());
      if (isTaken) {
        setStatus('taken');
        setErrorMsg('This username is already taken.');
        setSuggestions(generateUsernameSuggestions(username));
      } else {
        setStatus('available');
        setErrorMsg('');
        setSuggestions([]);
      }
    }, 600); // Simulated delay for typing search

    return () => clearTimeout(timer);
  }, [username, existingUsernames]);

  const handleSuggestionClick = (suggested: string) => {
    setUsername(suggested);
  };

  const handleComplete = (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== 'available' || !agreeToTerms) return;
    onComplete(username.trim(), agreeToTerms);
  };

  return (
    <div 
      className="fixed inset-0 bg-[#07070F]/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
      id="oauth-username-modal-backdrop"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[480px] glass-panel rounded-3xl p-6 md:p-8 relative overflow-hidden"
        id="oauth-username-modal"
      >
        {/* Decorative glass highlight sheet */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-transparent pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors cursor-pointer outline-none p-1.5 rounded-lg hover:bg-white/5"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="text-left mb-6">
          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 inline-flex items-center gap-1 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-violet-300" /> Secure OAuth Gateway ({platform})
          </span>
          <h3 className="text-lg font-bold font-display text-white">Create Your Public Persona</h3>
          <p className="text-xs text-white/50 mt-1">
            We verified your account securely. Now, claim your unique, anonymous Username.
          </p>
        </div>

        {/* Info Box explaining privacy-first flow */}
        <div className="p-3.5 rounded-2xl bg-violet-950/20 border border-violet-500/15 text-left mb-5">
          <p className="text-[10.5px] text-violet-300 leading-normal">
            🛡️ <strong>Absolute Privacy Shield:</strong> Your Google details (Name: <strong>{realName}</strong>, Email: <strong>{email}</strong>) will be isolated in our security vault. They are <strong>never</strong> displayed to anyone else.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleComplete} className="space-y-4">
          
          {/* Username Rules input */}
          <div className="space-y-1">
            <label className="block text-[9px] uppercase tracking-widest text-white/40 font-bold mb-1">
              Select Unique Username
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. ShadowFox"
                className={`w-full px-4 py-2.5 rounded-xl glass-input text-white placeholder-white/20 text-xs outline-none ${
                  status === 'available' ? 'border-emerald-500/40 focus:border-emerald-500/60' :
                  status === 'taken' || status === 'invalid' ? 'border-rose-500/40 focus:border-rose-500/60' : ''
                }`}
                maxLength={25}
                id="oauth-username-input"
              />

              {/* Real-time status indicator */}
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                {checking && <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />}
                {!checking && status === 'available' && <Check className="w-4 h-4 text-emerald-400" />}
                {!checking && (status === 'taken' || status === 'invalid') && <X className="w-4 h-4 text-rose-400" />}
              </div>
            </div>

            {/* Validation Feedback Messages */}
            <AnimatePresence mode="wait">
              {status === 'available' && (
                <motion.p 
                  initial={{ opacity: 0, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[10px] text-emerald-400 mt-1 font-medium flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> @{username} is available!
                </motion.p>
              )}

              {(status === 'taken' || status === 'invalid') && (
                <motion.p 
                  initial={{ opacity: 0, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[10px] text-rose-400 mt-1 font-medium flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> {errorMsg}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Intelligent Clickable Alternatives Suggestions List */}
          {suggestions.length > 0 && (
            <div className="space-y-1.5 p-3 rounded-xl bg-black/15 border border-white/5 text-left" id="suggestions-box">
              <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold block">
                Available Suggestions:
              </span>
              <div className="flex flex-wrap gap-2 pt-1">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={`${suggestion}-${idx}`}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-2.5 py-1 bg-violet-500/10 hover:bg-violet-500/20 text-[#C084FC] hover:text-white border border-violet-500/15 rounded-lg text-[10px] font-semibold tracking-wide transition-colors cursor-pointer outline-none"
                  >
                    @{suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AI Username Generation Module */}
          <div className="pt-2">
            <AIUsernameGenerator
              currentUsername={username}
              onSelectUsername={setUsername}
              existingUsernames={existingUsernames}
            />
          </div>

          {/* Terms & Conditions Acceptance */}
          <div className="pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer group text-left">
              <input
                type="checkbox"
                checked={agreeToTerms}
                onChange={() => setAgreeToTerms(!agreeToTerms)}
                className="w-3.5 h-3.5 rounded mt-0.5 border-white/10 bg-white/5 accent-violet-500 cursor-pointer"
                id="oauth-terms-checkbox"
              />
              <span className="text-[11px] text-white/50 leading-tight group-hover:text-white/70 transition-colors select-none">
                I agree to the <span className="text-violet-400 font-bold hover:underline">Terms</span> and verify that this Username represents my unique, secure, public identity on INCOGNITO.
              </span>
            </label>
          </div>

          {/* Action Trigger button */}
          <button
            type="submit"
            disabled={status !== 'available' || !agreeToTerms}
            className="w-full mt-2 py-3 rounded-xl btn-gradient font-bold text-xs tracking-wide text-white flex items-center justify-center gap-2 outline-none cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            id="oauth-complete-btn"
          >
            <span>Complete Registration</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

        </form>
      </motion.div>
    </div>
  );
}
