/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X } from 'lucide-react';
import { UserAccount, Post } from '../types';
import QuickPostCard from './QuickPostCard';

interface FloatingPostButtonProps {
  currentUser: UserAccount;
  onPostCreated: (post: Post) => void;
  onTriggerToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  isAnonymousMode?: boolean;
}

export default function FloatingPostButton({
  currentUser,
  onPostCreated,
  onTriggerToast,
  isAnonymousMode = false
}: FloatingPostButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* FLOATING ACTION BUTTON (MOBILE-OPTIMIZED AT BOTTOM-RIGHT, 75-85px FROM BOTTOM, 16-20px FROM RIGHT) */}
      <div 
        className="fixed bottom-[calc(80px+env(safe-area-inset-bottom,0px))] right-4 sm:right-5 md:right-6 lg:bottom-8 lg:right-8 z-50 flex items-center justify-center pointer-events-auto"
        id="floating-create-post-container"
      >
        {/* Subtle pulsing ambient outer aura */}
        <motion.div
          animate={{
            scale: isOpen ? [1, 1.05, 1] : [1, 1.12, 1],
            opacity: isOpen ? [0.15, 0.35, 0.15] : [0.25, 0.45, 0.25],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 rounded-full bg-gradient-to-r from-[#1677FF] to-[#00D9FF] blur-sm pointer-events-none"
        />

        {/* Primary Interactive FAB - ONLY white '+' or '×' icon, NO badges */}
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          className="relative w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-gradient-to-tr from-[#1677FF] via-[#00B4D8] to-[#00D9FF] text-white shadow-[0_4px_20px_rgba(0,217,255,0.35)] border border-[#00D9FF]/40 flex items-center justify-center cursor-pointer group transition-all hover:shadow-[0_0_25px_rgba(0,217,255,0.55)] focus:outline-none"
          id="floating-create-post-fab"
          aria-label={isOpen ? "Close Post Composer" : "Create Post"}
          title={isOpen ? "Close composer" : "Create post"}
        >
          <motion.div
            key={isOpen ? "close-icon" : "plus-icon"}
            initial={{ rotate: isOpen ? -90 : 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: isOpen ? 90 : -90, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center"
          >
            {isOpen ? (
              <X className="w-6 h-6 lg:w-7 lg:h-7 text-white stroke-[2.5]" />
            ) : (
              <Plus className="w-7 h-7 lg:w-8 lg:h-8 text-white stroke-[2.5]" />
            )}
          </motion.div>
        </motion.button>
      </div>

      {/* CREATE POST & DRAFT MODAL OVERLAY */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-y-auto custom-scrollbar">
            {/* Dark Backdrop with Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-[#070B14]/85 backdrop-blur-xl"
            />

            {/* Modal Dialog Card Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="relative w-full max-w-xl bg-[#101827] border border-[#1C2A3D] rounded-3xl p-4 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(0,217,255,0.12)] z-10 my-auto max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              {/* QuickPostCard Component */}
              <QuickPostCard
                currentUser={currentUser}
                onPostCreated={(newPost) => {
                  onPostCreated(newPost);
                  setIsOpen(false);
                }}
                onTriggerToast={onTriggerToast}
                isGlobalAnonymousMode={isAnonymousMode}
                onCloseModal={() => setIsOpen(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

