/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  X, 
  FileText, 
  Lock, 
  Users, 
  AlertTriangle, 
  RotateCcw, 
  ExternalLink,
  Sparkles,
  Check,
  Eye,
  BookOpen
} from 'lucide-react';
import IncognitoLogo from './IncognitoLogo';

const CURRENT_POLICY_VERSION = "1.0";
const POLICY_LAST_UPDATED = "31 July 2026";

interface WelcomeLegalGatewayProps {
  userId?: string;
  username?: string;
  onAccept: (version: string) => void;
}

type ModalDocType = 'terms' | 'privacy' | 'guidelines' | null;

export default function WelcomeLegalGateway({ userId, username, onAccept }: WelcomeLegalGatewayProps) {
  // Step state: 'welcome' | 'legal_popup' | 'declined'
  const [step, setStep] = useState<'welcome' | 'legal_popup' | 'declined'>('welcome');

  // Checkbox states
  const [ageConfirmed, setAgeConfirmed] = useState<boolean>(false);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const [privacyAccepted, setPrivacyAccepted] = useState<boolean>(false);
  const [guidelinesAccepted, setGuidelinesAccepted] = useState<boolean>(false);

  // Document read states
  const [termsRead, setTermsRead] = useState<boolean>(false);
  const [privacyRead, setPrivacyRead] = useState<boolean>(false);
  const [guidelinesRead, setGuidelinesRead] = useState<boolean>(false);

  // Active document modal viewer
  const [activeDocModal, setActiveDocModal] = useState<ModalDocType>(null);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // All checked verification
  const allChecked = ageConfirmed && termsAccepted && privacyAccepted && guidelinesAccepted;

  // Handle Mark as Read in Document Modal
  const handleMarkDocAsRead = (docType: ModalDocType) => {
    if (docType === 'terms') {
      setTermsRead(true);
      setTermsAccepted(true);
    } else if (docType === 'privacy') {
      setPrivacyRead(true);
      setPrivacyAccepted(true);
    } else if (docType === 'guidelines') {
      setGuidelinesRead(true);
      setGuidelinesAccepted(true);
    }
    setActiveDocModal(null);
  };

  // Handle Accept & Continue
  const handleAcceptAndContinue = async () => {
    if (!allChecked) return;

    try {
      setIsSubmitting(true);

      // Record acceptance on backend server with IP & UserAgent
      await fetch('/api/terms/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          username,
          policyVersion: CURRENT_POLICY_VERSION
        })
      });

      // Persist in client local storage
      localStorage.setItem('incognito_policy_accepted', 'true');
      localStorage.setItem('incognito_policy_version', CURRENT_POLICY_VERSION);
      localStorage.setItem('incognito_policy_timestamp', new Date().toISOString());

      // Trigger callback
      onAccept(CURRENT_POLICY_VERSION);
    } catch (err) {
      console.error('Failed to submit policy acceptance to server:', err);
      // Fallback local accept
      localStorage.setItem('incognito_policy_accepted', 'true');
      localStorage.setItem('incognito_policy_version', CURRENT_POLICY_VERSION);
      onAccept(CURRENT_POLICY_VERSION);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Leave Website
  const handleLeaveWebsite = () => {
    window.location.href = 'about:blank';
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070414] text-white flex items-center justify-center overflow-hidden font-sans select-none">
      
      {/* ANIMATED PURPLE/VIOLET BACKGROUND CANVAS */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#12052c] via-[#09021a] to-[#1c083b] animate-gradient-slow" />
      
      {/* GLOWING ORBS & FLOATING PARTICLES */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[150px]" />

      {/* BACKGROUND PARTICLE GRID */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none" 
        style={{
          backgroundImage: `radial-gradient(rgba(168, 85, 247, 0.4) 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }}
      />

      {/* MAIN CONTAINER */}
      <div className="relative z-10 w-full max-w-2xl px-4 py-8 flex flex-col items-center justify-center">

        {/* =========================================================================
            STEP 1 – WELCOME SCREEN
           ========================================================================= */}
        {step === 'welcome' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.4 }}
            className="w-full text-center space-y-8 p-8 sm:p-12 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] relative overflow-hidden"
          >
            {/* Ambient inner glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Glowing Logo */}
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity animate-pulse" />
                <div className="relative p-5 rounded-2xl bg-black/60 border border-violet-500/40 shadow-2xl flex items-center justify-center">
                  <IncognitoLogo className="w-16 h-16 text-violet-400" />
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-semibold tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Next-Gen Privacy Network
              </div>
            </div>

            {/* Title & Quote */}
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-100 to-violet-300">
                Welcome to Incógnito
              </h1>
              <p className="text-sm sm:text-base text-violet-200/80 max-w-md mx-auto italic font-medium leading-relaxed">
                "The anonymous community where your identity stays private and your voice matters."
              </p>
            </div>

            {/* Feature Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-violet-200/70 pt-2">
              <div className="p-3 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4 text-violet-400 shrink-0" />
                <span>Zero Trace Privacy</span>
              </div>
              <div className="p-3 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center gap-2">
                <Users className="w-4 h-4 text-violet-400 shrink-0" />
                <span>Safe Community</span>
              </div>
              <div className="p-3 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center gap-2">
                <Lock className="w-4 h-4 text-violet-400 shrink-0" />
                <span>End-to-End Control</span>
              </div>
            </div>

            {/* Continue Button */}
            <div className="pt-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setStep('legal_popup')}
                className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-base flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(139,92,246,0.5)] transition-all cursor-pointer mx-auto"
              >
                <span>Continue</span>
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* =========================================================================
            STEP 2 – LEGAL AGREEMENT POPUP
           ========================================================================= */}
        {step === 'legal_popup' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -15 }}
            transition={{ duration: 0.3 }}
            className="w-full p-6 sm:p-8 rounded-3xl bg-[#0e0826]/90 border border-violet-500/30 backdrop-blur-2xl shadow-[0_25px_70px_rgba(0,0,0,0.8)] relative overflow-hidden space-y-6"
          >
            {/* Header */}
            <div className="space-y-2 border-b border-white/10 pb-4">
              <div className="flex items-center gap-2 text-violet-400 text-xs font-extrabold uppercase tracking-widest">
                <ShieldCheck className="w-4 h-4" />
                Required Verification
              </div>
              <h2 className="text-2xl font-bold font-display text-white">
                Before You Continue
              </h2>
              <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                To keep Incógnito safe and respectful for everyone, please review and accept our policies before creating or accessing your account.
              </p>
            </div>

            {/* Checkboxes Group */}
            <div className="space-y-3.5">
              
              {/* Age Confirmation */}
              <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-black/40 border border-white/5 hover:border-violet-500/30 transition-all cursor-pointer group">
                <input
                  type="checkbox"
                  checked={ageConfirmed}
                  onChange={(e) => setAgeConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-white/20 bg-black/50 text-violet-600 focus:ring-violet-500 cursor-pointer"
                />
                <span className="text-xs sm:text-sm text-white/90 group-hover:text-white transition-colors">
                  I confirm I meet the minimum age requirement (13+ or local legal age).
                </span>
              </label>

              {/* Terms & Conditions */}
              <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-black/40 border border-white/5 hover:border-violet-500/30 transition-all">
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-black/50 text-violet-600 focus:ring-violet-500 cursor-pointer"
                  />
                  <span className="text-xs sm:text-sm text-white/90">
                    I have read and agree to the{' '}
                    <button
                      type="button"
                      onClick={() => setActiveDocModal('terms')}
                      className="text-violet-400 hover:text-violet-300 underline font-semibold cursor-pointer"
                    >
                      Terms & Conditions
                    </button>
                    .
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => setActiveDocModal('terms')}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all ${
                    termsRead 
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' 
                      : 'bg-violet-500/20 border border-violet-500/30 text-violet-300 hover:bg-violet-500/30'
                  }`}
                >
                  {termsRead ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Marked Read
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-3 h-3" />
                      Read Document
                    </>
                  )}
                </button>
              </div>

              {/* Privacy Policy */}
              <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-black/40 border border-white/5 hover:border-violet-500/30 transition-all">
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={privacyAccepted}
                    onChange={(e) => setPrivacyAccepted(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-black/50 text-violet-600 focus:ring-violet-500 cursor-pointer"
                  />
                  <span className="text-xs sm:text-sm text-white/90">
                    I have read the{' '}
                    <button
                      type="button"
                      onClick={() => setActiveDocModal('privacy')}
                      className="text-violet-400 hover:text-violet-300 underline font-semibold cursor-pointer"
                    >
                      Privacy Policy
                    </button>
                    .
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => setActiveDocModal('privacy')}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all ${
                    privacyRead 
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' 
                      : 'bg-violet-500/20 border border-violet-500/30 text-violet-300 hover:bg-violet-500/30'
                  }`}
                >
                  {privacyRead ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Marked Read
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-3 h-3" />
                      Read Document
                    </>
                  )}
                </button>
              </div>

              {/* Community Guidelines */}
              <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-black/40 border border-white/5 hover:border-violet-500/30 transition-all">
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={guidelinesAccepted}
                    onChange={(e) => setGuidelinesAccepted(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-black/50 text-violet-600 focus:ring-violet-500 cursor-pointer"
                  />
                  <span className="text-xs sm:text-sm text-white/90">
                    I agree to follow the{' '}
                    <button
                      type="button"
                      onClick={() => setActiveDocModal('guidelines')}
                      className="text-violet-400 hover:text-violet-300 underline font-semibold cursor-pointer"
                    >
                      Community Guidelines
                    </button>
                    .
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => setActiveDocModal('guidelines')}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all ${
                    guidelinesRead 
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' 
                      : 'bg-violet-500/20 border border-violet-500/30 text-violet-300 hover:bg-violet-500/30'
                  }`}
                >
                  {guidelinesRead ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Marked Read
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-3 h-3" />
                      Read Document
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Footer Metadata */}
            <div className="flex items-center justify-between text-[11px] text-white/50 pt-2 border-t border-white/10">
              <div>
                Last Updated: <span className="text-white/80 font-semibold">{POLICY_LAST_UPDATED}</span>
              </div>
              <div className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-violet-300 font-mono font-bold">
                Version {CURRENT_POLICY_VERSION}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('declined')}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white font-bold text-xs transition-all cursor-pointer"
              >
                Decline
              </button>

              <button
                type="button"
                disabled={!allChecked || isSubmitting}
                onClick={handleAcceptAndContinue}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-gray-700 disabled:to-gray-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.4)] disabled:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'Recording Agreement...' : 'Accept & Continue'}</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* =========================================================================
            DECLINED FLOW
           ========================================================================= */}
        {step === 'declined' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full p-8 rounded-3xl bg-[#140822]/95 border border-rose-500/30 backdrop-blur-2xl text-center space-y-6 shadow-2xl"
          >
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto shadow-lg">
              <AlertTriangle className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h2 className="text-2xl font-bold font-display text-white">
                Access Declined
              </h2>
              <p className="text-sm text-white/70 leading-relaxed">
                You must accept the Terms & Conditions, Privacy Policy and Community Guidelines to use Incógnito.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <button
                onClick={() => setStep('legal_popup')}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Review Again</span>
              </button>

              <button
                onClick={handleLeaveWebsite}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-bold transition-all cursor-pointer"
              >
                Leave Website
              </button>
            </div>
          </motion.div>
        )}

      </div>

      {/* =========================================================================
          DOCUMENT MODAL VIEWER (TERMS, PRIVACY, GUIDELINES)
         ========================================================================= */}
      <AnimatePresence>
        {activeDocModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#0f0926] border border-violet-500/40 rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl relative"
            >
              {/* Close Button */}
              <button
                onClick={() => setActiveDocModal(null)}
                className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Modal Header */}
              <div className="space-y-1 mb-4 pr-8 border-b border-white/10 pb-4">
                <div className="flex items-center gap-2 text-violet-400 text-xs font-bold uppercase tracking-wider">
                  <FileText className="w-4 h-4" />
                  Official Policy Document
                </div>
                <h3 className="text-xl font-bold font-display text-white">
                  {activeDocModal === 'terms' && 'Terms & Conditions'}
                  {activeDocModal === 'privacy' && 'Privacy Policy'}
                  {activeDocModal === 'guidelines' && 'Community Guidelines'}
                </h3>
                <span className="text-[10px] text-white/50">
                  Version {CURRENT_POLICY_VERSION} • Last Updated {POLICY_LAST_UPDATED}
                </span>
              </div>

              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 text-xs text-white/80 leading-relaxed font-sans">
                {activeDocModal === 'terms' && (
                  <>
                    <h4 className="font-bold text-white text-sm">1. Introduction & Agreement Scope</h4>
                    <p>
                      Welcome to Incógnito ("the Platform"). By accessing or using our services, you agree to be bound by these Terms & Conditions. Incógnito is designed as an end-to-end pseudonymous community platform where users interact using cryptographically generated or self-selected pseudonyms.
                    </p>

                    <h4 className="font-bold text-white text-sm">2. Minimum Age & Eligibility</h4>
                    <p>
                      You must be at least 13 years of age (or the statutory age required in your jurisdiction) to use Incógnito. By continuing, you affirm that you possess the legal capacity to enter into this agreement.
                    </p>

                    <h4 className="font-bold text-white text-sm">3. Pseudonymity & Account Ownership</h4>
                    <p>
                      Your real-world name and contact credentials remain strictly private and accessible only for security authentication. You are responsible for maintaining the confidentiality of your credentials and multi-factor security setup.
                    </p>

                    <h4 className="font-bold text-white text-sm">4. Prohibited Content & Enforcement</h4>
                    <p>
                      Users are strictly forbidden from engaging in unlawful harassment, publishing non-consensual personal information (doxxing), disseminating CSAM or hate speech, or deploying malicious automated bot networks.
                    </p>

                    <h4 className="font-bold text-white text-sm">5. Karma & Leaderboard Mechanics</h4>
                    <p>
                      Karma is earned through meaningful community contributions and upvotes. Official rankings refresh automatically on a strict 12-hour schedule. Manipulation of karma scores through fake account farms will lead to immediate permanent ban.
                    </p>
                  </>
                )}

                {activeDocModal === 'privacy' && (
                  <>
                    <h4 className="font-bold text-white text-sm">1. Zero-Knowledge Data Minimization</h4>
                    <p>
                      Incógnito operates on a strict data minimization standard. We do not sell user data to third-party ad brokers. Real names, email addresses, and phone numbers are encrypted at rest using salted cryptographic hashes.
                    </p>

                    <h4 className="font-bold text-white text-sm">2. Information Collection & Usage</h4>
                    <p>
                      We collect minimal telemetry required for platform security and fraud prevention, including session IP addresses, user agent signatures, and two-factor verification status.
                    </p>

                    <h4 className="font-bold text-white text-sm">3. Retention & Deletion Rights</h4>
                    <p>
                      You maintain full control over your account. You may export your public logs or request account purging at any time via the Security & Privacy Center.
                    </p>

                    <h4 className="font-bold text-white text-sm">4. Cookie & Local Storage Usage</h4>
                    <p>
                      We use client-side local storage exclusively to persist policy acceptance state, session authentication tokens, and user visual preferences.
                    </p>
                  </>
                )}

                {activeDocModal === 'guidelines' && (
                  <>
                    <h4 className="font-bold text-white text-sm">1. Respectful Anonymity</h4>
                    <p>
                      Anonymity gives you freedom, but with freedom comes responsibility. Treat all members with respect. Disagreements and vigorous debate are welcome; personal targeted attacks are not.
                    </p>

                    <h4 className="font-bold text-white text-sm">2. Anti-Harassment & Anti-Doxxing</h4>
                    <p>
                      Publishing private identifying information (addresses, phone numbers, real names) of any individual without consent will result in instantaneous platform restrictions.
                    </p>

                    <h4 className="font-bold text-white text-sm">3. Content Accuracy & Misinformation</h4>
                    <p>
                      Do not impersonate official staff, public officials, or organizations. Mark speculative posts clearly within designated community topics.
                    </p>

                    <h4 className="font-bold text-white text-sm">4. Moderation & Community Flagging</h4>
                    <p>
                      Community moderators review reported items actively. Flagged posts exceeding community reporting thresholds will be reviewed by platform administrators.
                    </p>
                  </>
                )}
              </div>

              {/* Modal Footer Action */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-[11px] text-white/50 font-medium">
                  Please confirm you have read this document.
                </span>

                <button
                  type="button"
                  onClick={() => handleMarkDocAsRead(activeDocModal)}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  <span>✔ Mark as Read</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
