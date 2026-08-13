/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, ShieldAlert, Send, Loader2 } from 'lucide-react';
import { UserAccount } from '../../types';

interface CommunityReportModalProps {
  communityId: string;
  communityHandle: string;
  targetType: 'post' | 'comment';
  targetId: string;
  targetTitle?: string;
  targetContent?: string;
  currentUser: UserAccount;
  isOpen: boolean;
  onClose: () => void;
  onTriggerToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const REPORT_REASONS = [
  'Spam or deceptive link',
  'Harassment or personal attack',
  'Hate speech or abuse',
  'Illegal content or malware',
  'Explicit / Sexual content',
  'Violence or physical threats',
  'Scam or financial fraud',
  'Violation of community rules',
  'Other'
];

export default function CommunityReportModal({
  communityId,
  communityHandle,
  targetType,
  targetId,
  targetTitle,
  targetContent,
  currentUser,
  isOpen,
  onClose,
  onTriggerToast
}: CommunityReportModalProps) {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/communities/${communityId}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-username': currentUser.username
        },
        body: JSON.stringify({
          targetType,
          targetId,
          targetTitle,
          targetContent,
          reason,
          details: details.trim(),
          reporterUsername: currentUser.username
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onTriggerToast('Report submitted to community moderators for review.', 'success');
        onClose();
      } else {
        onTriggerToast(data.error || 'Failed to submit report.', 'error');
      }
    } catch (err) {
      console.error(err);
      onTriggerToast('Failed to submit report.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto custom-scrollbar">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-xl"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-[#0d0822] border border-rose-500/30 rounded-3xl p-5 sm:p-6 shadow-[0_25px_60px_rgba(244,63,94,0.2)] z-10 my-auto text-left"
        id="community-report-modal"
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Report Content to c/{communityHandle} Mods
              </h3>
              <p className="text-[11px] text-white/50">
                Help moderators keep this community safe and on-topic.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {(targetTitle || targetContent) && (
          <div className="p-3 rounded-2xl bg-black/40 border border-white/10 mb-4 text-xs text-white/80">
            {targetTitle && <h5 className="font-bold text-white mb-1 truncate">{targetTitle}</h5>}
            {targetContent && <p className="line-clamp-2 text-white/60 text-[11px]">{targetContent}</p>}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-rose-300 uppercase tracking-wider mb-1.5">
              Reason for Report *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs font-bold outline-none focus:border-rose-500 cursor-pointer"
            >
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r} className="bg-[#0d0822] text-white">
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-rose-300 uppercase tracking-wider mb-1.5">
              Additional Details (Optional)
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide extra context for community moderators..."
              className="w-full p-3 rounded-xl bg-black/50 border border-white/15 text-white placeholder-white/30 text-xs outline-none focus:border-rose-500 transition-all resize-none"
            />
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Report</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
