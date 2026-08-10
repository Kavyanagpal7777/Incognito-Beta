/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Sparkles, Send } from 'lucide-react';
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
      {/* FLOATING ANIMATED '+' ACTION BUTTON */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center justify-center">
        {/* Pulsing ambient outer aura */}
        <motion.div
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.35, 0.75, 0.35],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 blur-md pointer-events-none"
        />

        {/* Secondary rotating dash ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="absolute -inset-1 rounded-full border border-dashed border-violet-400/40 pointer-events-none"
        />

        {/* Primary Interactive FAB */}
        <motion.button
          onClick={() => setIsOpen(true)}
          whileHover={{ scale: 1.12, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-[0_10px_30px_rgba(124,58,237,0.6)] border border-violet-300/40 flex items-center justify-center cursor-pointer group transition-shadow hover:shadow-[0_0_35px_rgba(192,38,211,0.8)]"
          id="floating-create-post-fab"
          aria-label="Create Post or Draft"
          title="Broadcast new thought or save draft"
        >
          <Plus className="w-7 h-7 sm:w-8 sm:h-8 text-white stroke-[2.5] group-hover:scale-110 transition-transform" />
          
          {/* Subtle Sparkle Icon Badge */}
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-fuchsia-500 text-white flex items-center justify-center text-[10px] shadow-md border border-white/40">
            <Sparkles className="w-3 h-3 text-white" />
          </span>
        </motion.button>
      </div>

      {/* CREATE POST & DRAFT MODAL OVERLAY */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto custom-scrollbar">
            {/* Dark Backdrop with Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-xl"
            />

            {/* Modal Dialog Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-2xl bg-[#0c081e] border border-violet-500/30 rounded-3xl p-4 sm:p-6 shadow-[0_25px_60px_rgba(124,58,237,0.35)] z-10 my-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-300">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                      New Anonymous Broadcast / Draft
                    </h3>
                    <p className="text-[10px] text-white/50">
                      Write your post or save it as a draft for later.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

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
