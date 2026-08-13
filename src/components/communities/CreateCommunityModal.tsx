/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Sparkles, Plus, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { UserAccount, Community } from '../../types';

interface CreateCommunityModalProps {
  currentUser: UserAccount;
  categories: string[];
  isOpen: boolean;
  onClose: () => void;
  onCommunityCreated: (community: Community) => void;
  onTriggerToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function CreateCommunityModal({
  currentUser,
  categories,
  isOpen,
  onClose,
  onCommunityCreated,
  onTriggerToast
}: CreateCommunityModalProps) {
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(categories[0] || 'General');
  const [iconUrl, setIconUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  
  const [rules, setRules] = useState<Array<{ title: string; description: string }>>([
    { title: 'Be Respectful', description: 'Treat all members with courtesy and constructive dialogue.' },
    { title: 'No Spam or Scams', description: 'Self-promotion and misleading links are prohibited.' }
  ]);
  const [newRuleTitle, setNewRuleTitle] = useState('');
  const [newRuleDesc, setNewRuleDesc] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const userKarma = currentUser.karma || 0;
  const isEligible = userKarma >= 150;

  const handleNameChange = (val: string) => {
    setName(val);
    if (!handle || handle === val.slice(0, -1).replace(/[^a-zA-Z0-9_]/g, '')) {
      setHandle(val.replace(/[^a-zA-Z0-9_]/g, ''));
    }
  };

  const handleAddRule = () => {
    if (!newRuleTitle.trim()) return;
    setRules([...rules, { title: newRuleTitle.trim(), description: newRuleDesc.trim() }]);
    setNewRuleTitle('');
    setNewRuleDesc('');
  };

  const handleRemoveRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEligible) {
      onTriggerToast(`You need at least 150 Karma to create a community. Current: ${userKarma}`, 'error');
      return;
    }

    if (!name.trim() || !handle.trim() || !description.trim()) {
      setErrorMsg('Name, handle, and description are required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/communities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-username': currentUser.username
        },
        body: JSON.stringify({
          name: name.trim(),
          handle: handle.trim(),
          description: description.trim(),
          category,
          iconUrl: iconUrl.trim() || undefined,
          bannerUrl: bannerUrl.trim() || undefined,
          rules,
          userId: currentUser.id,
          username: currentUser.username
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.community) {
        onTriggerToast(`Community c/${data.community.handle} created successfully!`, 'success');
        onCommunityCreated(data.community);
        onClose();
      } else {
        setErrorMsg(data.error || 'Failed to create community.');
        onTriggerToast(data.error || 'Failed to create community.', 'error');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error. Failed to connect to backend server.');
      onTriggerToast('Network error while creating community.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

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
        className="relative w-full max-w-2xl bg-[#080d1a] border border-cyan-500/30 rounded-3xl p-5 sm:p-7 shadow-[0_25px_60px_rgba(0,217,255,0.25)] z-10 my-auto max-h-[90vh] overflow-y-auto custom-scrollbar text-left"
        id="create-community-modal"
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 border border-cyan-400/40 text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide">
                Create a New Community
              </h3>
              <p className="text-xs text-white/50">
                Establish a persistent, encrypted hub for your niche interest.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isEligible ? (
          <div className="mb-5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200">
              <h5 className="font-bold text-amber-300 text-sm mb-1">150 Karma Required</h5>
              <p>
                Creating a community requires at least <strong>150 Karma</strong> to prevent network spam. Your current balance is <strong>{userKarma} Karma</strong>. You need <strong>{150 - userKarma} more karma</strong> to create a community.
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-5 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2.5 text-xs text-emerald-300 font-medium">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Eligible! You have {userKarma} Karma (Minimum required: 150).</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 font-bold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-cyan-200 uppercase tracking-wider mb-1">
              Community Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Privacy Research Lab"
              className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 text-xs font-bold outline-none focus:border-cyan-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-cyan-200 uppercase tracking-wider mb-1">
                Community Handle (c/...) *
              </label>
              <div className="flex items-center px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 focus-within:border-cyan-500 transition-all">
                <span className="text-xs font-mono font-bold text-cyan-400 mr-1">c/</span>
                <input
                  type="text"
                  required
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  placeholder="PrivacyLab"
                  className="w-full bg-transparent text-white placeholder-white/30 text-xs font-bold outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-cyan-200 uppercase tracking-wider mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-bold outline-none focus:border-cyan-500 cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat} className="bg-[#080d1a] text-white">
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-cyan-200 uppercase tracking-wider mb-1">
              Description *
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what your community is about..."
              className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 text-xs outline-none focus:border-cyan-500 transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-cyan-200 uppercase tracking-wider mb-1">
                Icon Image URL (Optional)
              </label>
              <input
                type="text"
                value={iconUrl}
                onChange={(e) => setIconUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 text-xs outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-cyan-200 uppercase tracking-wider mb-1">
                Banner Image URL (Optional)
              </label>
              <input
                type="text"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 text-xs outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-white/10">
            <label className="block text-xs font-bold text-cyan-200 uppercase tracking-wider mb-2">
              Community Rules ({rules.length})
            </label>

            <div className="space-y-2 mb-3">
              {rules.map((rule, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-start justify-between gap-2">
                  <div className="text-xs">
                    <span className="font-bold text-white mr-2">{idx + 1}. {rule.title}</span>
                    <p className="text-[11px] text-white/50">{rule.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveRule(idx)}
                    className="text-rose-400 hover:text-rose-300 text-xs font-bold p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-2">
              <input
                type="text"
                value={newRuleTitle}
                onChange={(e) => setNewRuleTitle(e.target.value)}
                placeholder="Rule Title (e.g. Respect Privacy)"
                className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs outline-none"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newRuleDesc}
                  onChange={(e) => setNewRuleDesc(e.target.value)}
                  placeholder="Rule Details..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddRule}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-bold text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isEligible || isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-bold text-xs tracking-wide shadow-[0_0_20px_rgba(0,217,255,0.4)] flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Community...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Create Community</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
