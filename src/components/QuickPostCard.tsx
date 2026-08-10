/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Image as ImageIcon, 
  Video, 
  BarChart2, 
  Sparkles, 
  Globe, 
  Send, 
  Lock, 
  EyeOff, 
  Plus, 
  X, 
  Loader2, 
  Hash, 
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { UserAccount, Post, PostPoll } from '../types';
import { COMMUNITIES } from '../data/mockData';

interface QuickPostCardProps {
  currentUser: UserAccount;
  onPostCreated: (post: Post) => void;
  onTriggerToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  isGlobalAnonymousMode?: boolean;
}

export default function QuickPostCard({
  currentUser,
  onPostCreated,
  onTriggerToast,
  isGlobalAnonymousMode = false
}: QuickPostCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState('😂 Funny');
  const [postImageUrl, setPostImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [postTag, setPostTag] = useState('');
  const [tags, setTags] = useState<string[]>(['PrivacyFirst']);
  
  // Poll state
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(['Option 1', 'Option 2']);

  // Anonymous toggle inside post card
  const [postAnonymously, setPostAnonymously] = useState(isGlobalAnonymousMode);

  // AI Assist loading state
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Handle Tag addition
  const handleAddTag = () => {
    if (!postTag.trim()) return;
    const cleanTag = postTag.replace(/[^a-zA-Z0-9]/g, '');
    if (cleanTag && !tags.includes(cleanTag)) {
      setTags([...tags, cleanTag]);
    }
    setPostTag('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  // Poll option helpers
  const handleAddPollOption = () => {
    if (pollOptions.length < 5) {
      setPollOptions([...pollOptions, `Option ${pollOptions.length + 1}`]);
    }
  };

  const handlePollOptionChange = (index: number, value: string) => {
    const updated = [...pollOptions];
    updated[index] = value;
    setPollOptions(updated);
  };

  const handleRemovePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  // AI Assist Trigger via Gemini backend
  const handleAiAssist = async () => {
    setIsAiGenerating(true);
    try {
      const res = await fetch('/api/ai-assist-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: postContent.trim() || postTitle.trim(),
          community: selectedCommunity,
          mode: postContent.trim() ? 'polish' : 'generate'
        })
      });
      const data = await res.json();
      if (data.idea) {
        setPostContent(data.idea);
        setIsExpanded(true);
        onTriggerToast(data.isMock ? 'AI post generated (fallback mode)' : '✨ AI generated post draft with Gemini 3.6!', 'success');
      }
    } catch (err) {
      onTriggerToast('AI assist temporary delay. Try typing directly.', 'info');
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Submit Post
  const handleSubmitPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) {
      onTriggerToast('Please write something before posting.', 'error');
      return;
    }

    const activeUsername = postAnonymously || isGlobalAnonymousMode 
      ? 'Anonymous_Ghost' 
      : currentUser.username;

    let pollData: PostPoll | undefined = undefined;
    if (showPollCreator && pollOptions.filter(o => o.trim()).length >= 2) {
      const validOpts = pollOptions.filter(o => o.trim());
      pollData = {
        totalVotes: 1,
        userVotedId: 'opt_0',
        options: validOpts.map((opt, idx) => ({
          id: `opt_${idx}`,
          text: opt,
          votes: idx === 0 ? 1 : 0
        }))
      };
    }

    const newPost: Post = {
      id: `post_${Date.now()}`,
      username: activeUsername,
      userAvatar: (postAnonymously || isGlobalAnonymousMode) ? undefined : currentUser.avatarUrl,
      community: selectedCommunity,
      title: postTitle.trim() || undefined,
      content: postContent.trim(),
      imageUrl: postImageUrl.trim() || undefined,
      timestamp: 'Just now',
      upvotes: 1,
      isUpvoted: true,
      isSaved: false,
      isAnonymous: postAnonymously || isGlobalAnonymousMode,
      tags: tags.length > 0 ? tags : ['Incognito'],
      poll: pollData,
      comments: []
    };

    onPostCreated(newPost);

    // Reset Form
    setPostTitle('');
    setPostContent('');
    setPostImageUrl('');
    setShowImageInput(false);
    setShowPollCreator(false);
    setIsExpanded(false);
    onTriggerToast('Broadcast published safely to the network!', 'success');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0d091f]/90 border border-violet-500/25 rounded-3xl p-4 sm:p-5 shadow-[0_15px_40px_rgba(124,58,237,0.15)] backdrop-blur-2xl relative overflow-hidden transition-all my-4"
      id="quick-post-card"
    >
      {/* Top Glass Refraction Highlight */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent pointer-events-none" />

      {/* HEADER: AVATAR + IDENTITY BADGE + COMMUNITY SELECTOR */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="relative">
            {currentUser.avatarUrl && !postAnonymously && !isGlobalAnonymousMode ? (
              <img 
                src={currentUser.avatarUrl} 
                alt={currentUser.username}
                className="w-9 h-9 rounded-full object-cover border border-violet-400/50 shadow-md"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-600 via-purple-600 to-indigo-500 flex items-center justify-center text-xs font-bold font-display text-white border border-violet-400/50 shadow-md">
                {(postAnonymously || isGlobalAnonymousMode) ? 'AG' : currentUser.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-black border border-violet-400 flex items-center justify-center">
              <Lock className="w-2 h-2 text-violet-300" />
            </div>
          </div>

          {/* User Name & Shield */}
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white tracking-wide">
                {(postAnonymously || isGlobalAnonymousMode) ? '@Anonymous_Ghost' : `@${currentUser.username}`}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 text-[8.5px] font-bold uppercase tracking-wider flex items-center gap-0.5 border border-violet-500/30">
                <ShieldCheck className="w-2.5 h-2.5 text-violet-300" />
                Isolated
              </span>
            </div>
            <span className="text-[9.5px] text-white/40 block">Posting to anonymous feed</span>
          </div>
        </div>

        {/* COMMUNITY DROPDOWN */}
        <div className="relative" id="community-dropdown">
          <select
            value={selectedCommunity}
            onChange={(e) => setSelectedCommunity(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-black/40 border border-violet-500/30 text-violet-200 font-bold text-[11px] outline-none cursor-pointer hover:border-violet-400 transition-all appearance-none pr-7"
          >
            {COMMUNITIES.filter(c => c.id !== 'all').map(comm => (
              <option key={comm.id} value={comm.name} className="bg-[#0c081d] text-white">
                {comm.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-violet-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* FORM INPUTS */}
      <form onSubmit={handleSubmitPost} className="space-y-3">
        
        {/* OPTIONAL POST TITLE FIELD */}
        {(isExpanded || postTitle) && (
          <motion.input
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            type="text"
            value={postTitle}
            onChange={(e) => setPostTitle(e.target.value)}
            placeholder="Post Title (optional)..."
            className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 text-xs font-bold outline-none focus:border-violet-500/60 transition-all"
            id="quick-post-title-input"
          />
        )}

        {/* MAIN TEXTAREA "What's on your mind?" */}
        <div className="relative">
          <textarea
            value={postContent}
            onFocus={() => setIsExpanded(true)}
            onChange={(e) => setPostContent(e.target.value)}
            placeholder="What's on your mind? Share your unfiltered thoughts anonymously..."
            className={`w-full p-3.5 rounded-2xl bg-black/40 border text-white placeholder-white/30 text-xs sm:text-sm outline-none resize-none transition-all ${
              isExpanded 
                ? 'h-28 border-violet-500/40 focus:border-violet-400 focus:shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
                : 'h-14 border-white/10 hover:border-white/20'
            }`}
            id="quick-post-content-textarea"
          />
          {postContent.length > 0 && (
            <span className="absolute right-3 bottom-2 text-[9px] text-white/30 font-mono">
              {500 - postContent.length} chars
            </span>
          )}
        </div>

        {/* IMAGE INPUT FIELD IF TOGGLED */}
        <AnimatePresence>
          {showImageInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 rounded-2xl bg-black/30 border border-white/10 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-violet-300 uppercase tracking-wider flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5" />
                  Attach Image URL
                </span>
                <button
                  type="button"
                  onClick={() => setShowImageInput(false)}
                  className="text-white/40 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <input
                type="text"
                value={postImageUrl}
                onChange={(e) => setPostImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-white/20 outline-none"
              />
              {postImageUrl && (
                <div className="w-full h-32 rounded-xl overflow-hidden border border-white/10 relative">
                  <img src={postImageUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* POLL CREATOR IF TOGGLED */}
        <AnimatePresence>
          {showPollCreator && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3.5 rounded-2xl bg-black/30 border border-violet-500/20 space-y-2 text-left"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-violet-300 uppercase tracking-wider flex items-center gap-1">
                  <BarChart2 className="w-3.5 h-3.5 text-violet-400" />
                  Create Anonymous Poll
                </span>
                <button
                  type="button"
                  onClick={() => setShowPollCreator(false)}
                  className="text-white/40 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {pollOptions.map((opt, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white outline-none focus:border-violet-500"
                  />
                  {pollOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePollOption(idx)}
                      className="text-rose-400 hover:text-rose-300 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}

              {pollOptions.length < 5 && (
                <button
                  type="button"
                  onClick={handleAddPollOption}
                  className="text-[10.5px] font-bold text-violet-400 hover:underline flex items-center gap-1 pt-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Option
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* TAGS INPUT & DISPLAY */}
        {isExpanded && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-left">
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider flex items-center gap-1">
              <Hash className="w-3 h-3 text-violet-400" /> Tags:
            </span>
            {tags.map((t, idx) => (
              <span key={idx} className="px-2 py-0.5 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-200 text-[10px] font-bold flex items-center gap-1">
                #{t}
                <button type="button" onClick={() => handleRemoveTag(t)} className="hover:text-rose-400">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}

            <div className="flex items-center gap-1">
              <input
                type="text"
                value={postTag}
                onChange={(e) => setPostTag(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                placeholder="Add tag..."
                className="w-20 px-2 py-0.5 rounded-lg bg-black/30 border border-white/10 text-[10px] text-white outline-none"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="p-1 rounded-lg bg-white/5 text-white/60 hover:text-white"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* ACTION BAR: QUICK ACTION BUTTONS + ANONYMOUS TOGGLE + POST BUTTON */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
          
          {/* QUICK ACTION BUTTONS */}
          <div className="flex items-center gap-1 sm:gap-2">
            
            {/* 📷 IMAGE */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setShowImageInput(!showImageInput);
                setIsExpanded(true);
              }}
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                showImageInput 
                  ? 'bg-violet-600/30 border-violet-400/50 text-violet-200 shadow-sm' 
                  : 'bg-white/[0.02] hover:bg-white/[0.08] border-white/10 text-white/70 hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 text-violet-400" />
              <span className="hidden sm:inline">Image</span>
            </motion.button>

            {/* 🎥 VIDEO */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setShowImageInput(true);
                setIsExpanded(true);
                onTriggerToast('Video/GIF attachment simulator ready. Enter video poster link.', 'info');
              }}
              className="px-2.5 py-1.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.08] border border-white/10 text-[11px] font-bold text-white/70 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Video className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Video</span>
            </motion.button>

            {/* 📊 POLL */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setShowPollCreator(!showPollCreator);
                setIsExpanded(true);
              }}
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                showPollCreator 
                  ? 'bg-indigo-600/30 border-indigo-400/50 text-indigo-200 shadow-sm' 
                  : 'bg-white/[0.02] hover:bg-white/[0.08] border-white/10 text-white/70 hover:text-white'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Poll</span>
            </motion.button>

            {/* ✨ AI ASSIST */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAiAssist}
              disabled={isAiGenerating}
              className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 hover:from-violet-600/40 hover:to-fuchsia-600/40 border border-violet-400/30 text-[11px] font-bold text-violet-200 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {isAiGenerating ? (
                <Loader2 className="w-3.5 h-3.5 text-fuchsia-400 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
              )}
              <span>AI Assist</span>
            </motion.button>

          </div>

          {/* ANONYMOUS TOGGLE & SUBMIT POST BUTTON */}
          <div className="flex items-center gap-3">
            
            {/* Anonymous Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={postAnonymously}
                onChange={(e) => setPostAnonymously(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-black/40 border-white/20 accent-violet-500 cursor-pointer"
              />
              <span className="text-[10.5px] font-bold text-white/60 hover:text-white flex items-center gap-1 transition-colors">
                <EyeOff className="w-3 h-3 text-violet-300" />
                <span className="hidden md:inline">Ghost Mode</span>
              </span>
            </label>

            {/* Post Button */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={!postContent.trim()}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 font-bold text-xs tracking-wide text-white shadow-[0_4px_20px_rgba(124,58,237,0.4)] flex items-center gap-2 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed border border-violet-400/30"
              id="quick-post-submit-btn"
            >
              <span>Broadcast</span>
              <Send className="w-3.5 h-3.5 text-white" />
            </motion.button>

          </div>

        </div>

      </form>
    </motion.div>
  );
}
