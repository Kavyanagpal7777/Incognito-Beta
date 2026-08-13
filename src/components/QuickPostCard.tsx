/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Image as ImageIcon, 
  Video, 
  BarChart2, 
  Sparkles, 
  Send, 
  Lock, 
  EyeOff, 
  Plus, 
  X, 
  Loader2, 
  Hash, 
  ShieldCheck,
  ChevronDown,
  Bookmark,
  Trash2,
  FolderKanban,
  Upload
} from 'lucide-react';
import { UserAccount, Post, PostPoll } from '../types';
import { COMMUNITIES } from '../data/mockData';

export interface PostDraft {
  id: string;
  title: string;
  content: string;
  community: string;
  imageUrl?: string;
  videoUrl?: string;
  tags: string[];
  updatedAt: number;
}

interface QuickPostCardProps {
  currentUser: UserAccount;
  onPostCreated: (post: Post) => void;
  onTriggerToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  isGlobalAnonymousMode?: boolean;
  onCloseModal?: () => void;
}

export default function QuickPostCard({
  currentUser,
  onPostCreated,
  onTriggerToast,
  isGlobalAnonymousMode = false,
  onCloseModal
}: QuickPostCardProps) {
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState('😂 Funny');
  const [postImageUrl, setPostImageUrl] = useState('');
  const [postVideoUrl, setPostVideoUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [postTag, setPostTag] = useState('');
  const [tags, setTags] = useState<string[]>(['PrivacyFirst']);
  const [showTagInput, setShowTagInput] = useState(false);
  
  // Drafts state
  const [drafts, setDrafts] = useState<PostDraft[]>([]);
  const [showDraftsList, setShowDraftsList] = useState(false);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);

  // Poll state
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(['Option 1', 'Option 2']);

  // Anonymous toggle inside post card
  const [postAnonymously, setPostAnonymously] = useState(isGlobalAnonymousMode);

  // AI Assist loading state
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Load saved drafts on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('incognito_drafts');
      if (saved) {
        setDrafts(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Save drafts to localStorage
  const saveDraftsToStorage = (updatedDrafts: PostDraft[]) => {
    setDrafts(updatedDrafts);
    localStorage.setItem('incognito_drafts', JSON.stringify(updatedDrafts));
  };

  // Handle Photo File Upload with Mobile & FileReader Fallback
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so selecting same file again re-triggers
    e.target.value = '';

    // Size validation (10MB)
    if (file.size > 10 * 1024 * 1024) {
      onTriggerToast('Image must be 10 MB or smaller.', 'error');
      return;
    }

    // Basic format validation - flexible for mobile formats
    if (file.type && !file.type.toLowerCase().startsWith('image/')) {
      onTriggerToast('Please select a valid image file.', 'error');
      return;
    }

    setIsUploadingImage(true);
    setShowImageInput(true);

    const readAsDataUrl = (fileObj: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(fileObj);
      });
    };

    try {
      let finalImageUrl = '';

      // Attempt 1: Server endpoint upload
      try {
        const formData = new FormData();
        formData.append('image', file);

        const res = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData,
        });

        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (res.ok && data.success && (data.imageUrl || data.url)) {
            finalImageUrl = data.imageUrl || data.url;
          }
        }
      } catch (netErr) {
        console.warn('Server image upload endpoint unreachable, falling back to local client processing:', netErr);
      }

      // Attempt 2: Fallback to local browser FileReader (Data URL)
      if (!finalImageUrl) {
        finalImageUrl = await readAsDataUrl(file);
      }

      if (finalImageUrl) {
        setPostImageUrl(finalImageUrl);
        onTriggerToast('Photo attached successfully!', 'success');
      } else {
        onTriggerToast('Image upload failed. Please try again.', 'error');
      }
    } catch (err) {
      console.error('Photo processing error:', err);
      try {
        const fallbackUrl = await readAsDataUrl(file);
        if (fallbackUrl) {
          setPostImageUrl(fallbackUrl);
          onTriggerToast('Photo attached successfully!', 'success');
        } else {
          onTriggerToast('Image upload failed. Please try again.', 'error');
        }
      } catch {
        onTriggerToast('Image upload failed. Please try again.', 'error');
      }
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handle Remove Photo
  const handleRemovePhoto = () => {
    setPostImageUrl('');
  };

  // Handle Save Draft
  const handleSaveDraft = () => {
    if (!postContent.trim() && !postTitle.trim() && !postImageUrl.trim() && !postVideoUrl.trim()) {
      onTriggerToast('Write text or attach media to save a draft.', 'info');
      return;
    }

    const draftId = activeDraftId || `draft_${Date.now()}`;
    const newDraft: PostDraft = {
      id: draftId,
      title: postTitle.trim(),
      content: postContent.trim(),
      community: selectedCommunity,
      imageUrl: postImageUrl.trim() || undefined,
      videoUrl: postVideoUrl.trim() || undefined,
      tags,
      updatedAt: Date.now()
    };

    const existingIndex = drafts.findIndex(d => d.id === draftId);
    let updated: PostDraft[];
    if (existingIndex >= 0) {
      updated = [...drafts];
      updated[existingIndex] = newDraft;
    } else {
      updated = [newDraft, ...drafts];
    }

    saveDraftsToStorage(updated);
    setActiveDraftId(draftId);
    onTriggerToast('Post saved as draft.', 'success');
  };

  // Restore Draft
  const handleRestoreDraft = (draft: PostDraft) => {
    setPostTitle(draft.title || '');
    setPostContent(draft.content || '');
    setSelectedCommunity(draft.community || '😂 Funny');
    if (draft.imageUrl) {
      setPostImageUrl(draft.imageUrl);
      setShowImageInput(true);
    } else {
      setPostImageUrl('');
    }
    if (draft.videoUrl) {
      setPostVideoUrl(draft.videoUrl);
      setShowVideoInput(true);
    } else {
      setPostVideoUrl('');
    }
    if (draft.tags && draft.tags.length > 0) {
      setTags(draft.tags);
    }
    setActiveDraftId(draft.id);
    setShowDraftsList(false);
    onTriggerToast(`Restored draft "${draft.title || 'Untitled'}"`, 'info');
  };

  // Delete Draft
  const handleDeleteDraft = (draftId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = drafts.filter(d => d.id !== draftId);
    saveDraftsToStorage(updated);
    if (activeDraftId === draftId) {
      setActiveDraftId(null);
    }
    onTriggerToast('Draft removed.', 'info');
  };

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
        onTriggerToast('AI generated thought idea.', 'success');
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
    if (!postContent.trim() && !postImageUrl.trim() && !postVideoUrl.trim()) {
      onTriggerToast('Please write what\'s on your mind or attach media.', 'error');
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
      ownerId: currentUser.id,
      authorUsername: currentUser.username,
      username: activeUsername,
      userAvatar: (postAnonymously || isGlobalAnonymousMode) ? undefined : currentUser.avatarUrl,
      community: selectedCommunity,
      title: postTitle.trim() || undefined,
      content: postContent.trim(),
      imageUrl: postImageUrl.trim() || undefined,
      videoUrl: postVideoUrl.trim() || undefined,
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

    // Remove from active draft if previously saved as draft
    if (activeDraftId) {
      const updatedDrafts = drafts.filter(d => d.id !== activeDraftId);
      saveDraftsToStorage(updatedDrafts);
      setActiveDraftId(null);
    }

    // Reset Form
    setPostTitle('');
    setPostContent('');
    setPostImageUrl('');
    setPostVideoUrl('');
    setShowImageInput(false);
    setShowVideoInput(false);
    setShowPollCreator(false);
    onTriggerToast('Post published anonymously!', 'success');

    if (onCloseModal) {
      onCloseModal();
    }
  };

  const isAnonymousActive = postAnonymously || isGlobalAnonymousMode;

  return (
    <div className="w-full text-left" id="quick-post-card">
      
      {/* 1. MINIMAL HEADER WITH TITLE & CLOSE BUTTON */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1C2A3D]">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#F5F7FA] tracking-tight">
            New Anonymous Post
          </h2>
          <p className="text-xs text-[#8B95A7] mt-0.5">
            Share your thoughts anonymously.
          </p>
        </div>

        {onCloseModal && (
          <button
            type="button"
            onClick={onCloseModal}
            className="p-2 rounded-xl bg-[#070B14] hover:bg-[#1C2A3D] text-[#8B95A7] hover:text-[#F5F7FA] transition-colors cursor-pointer border border-[#1C2A3D]"
            aria-label="Close Composer"
            id="btn-close-composer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 2. ANONYMOUS IDENTITY SECTION & CATEGORY SELECTOR */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {/* User Identity */}
        <div className="flex items-center gap-3">
          {/* Avatar with lock */}
          <div className="relative shrink-0">
            {currentUser.avatarUrl && !isAnonymousActive ? (
              <img 
                src={currentUser.avatarUrl} 
                alt={currentUser.username}
                className="w-10 h-10 rounded-full object-cover border border-[#00D9FF]/40 shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#1677FF] to-[#00D9FF] flex items-center justify-center text-xs font-bold text-white border border-[#00D9FF]/50 shadow-sm">
                {isAnonymousActive ? 'AG' : currentUser.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#070B14] border border-[#00D9FF]/60 flex items-center justify-center">
              <Lock className="w-2.5 h-2.5 text-[#00D9FF]" />
            </div>
          </div>

          {/* Username & Isolated Badge */}
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs sm:text-sm font-bold text-[#F5F7FA]">
                {isAnonymousActive ? '@Anonymous_Ghost' : `@${currentUser.username}`}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-[#1677FF]/15 text-[#00D9FF] text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 border border-[#00D9FF]/30">
                <ShieldCheck className="w-2.5 h-2.5 text-[#00D9FF]" />
                ISOLATED
              </span>
            </div>
            <span className="text-[11px] text-[#8B95A7] block mt-0.5">
              Posting to anonymous feed
            </span>
          </div>
        </div>

        {/* Category Selector */}
        <div className="relative shrink-0" id="community-dropdown">
          <select
            value={selectedCommunity}
            onChange={(e) => setSelectedCommunity(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#070B14] border border-[#1C2A3D] hover:border-[#00D9FF]/50 text-[#F5F7FA] font-medium text-xs outline-none cursor-pointer transition-all appearance-none pr-8 shadow-sm focus:border-[#00D9FF]"
            id="select-post-category"
          >
            {COMMUNITIES.filter(c => c.id !== 'all').map(comm => (
              <option key={comm.id} value={comm.name} className="bg-[#101827] text-[#F5F7FA]">
                {comm.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#00D9FF] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* FORM INPUTS */}
      <form onSubmit={handleSubmitPost} className="space-y-3">
        
        {/* OPTIONAL TITLE INPUT */}
        <input
          type="text"
          value={postTitle}
          onChange={(e) => setPostTitle(e.target.value)}
          placeholder="Title (optional)"
          className="w-full px-3.5 py-2 rounded-xl bg-[#070B14] border border-[#1C2A3D] text-[#F5F7FA] placeholder-[#8B95A7]/60 text-xs font-medium outline-none focus:border-[#00D9FF]/60 transition-all"
          id="quick-post-title-input"
        />

        {/* MAIN TEXTAREA: "What's on your mind?" */}
        <div className="relative">
          <textarea
            value={postContent}
            onChange={(e) => {
              if (e.target.value.length <= 500) {
                setPostContent(e.target.value);
              }
            }}
            placeholder="What's on your mind?"
            rows={4}
            className="w-full p-3.5 rounded-2xl bg-[#070B14] border border-[#1C2A3D] focus:border-[#00D9FF]/70 text-[#F5F7FA] placeholder-[#8B95A7]/70 text-sm outline-none resize-none transition-all focus:shadow-[0_0_15px_rgba(0,217,255,0.15)] leading-relaxed"
            id="quick-post-content-textarea"
          />

          {/* LIVE CHARACTER COUNTER: 0 / 500 */}
          <div className="flex justify-end pt-1 pr-1">
            <span className="text-[11px] font-mono text-[#8B95A7]">
              <span className={postContent.length > 450 ? 'text-amber-400 font-bold' : 'text-[#F5F7FA]'}>
                {postContent.length}
              </span> / 500
            </span>
          </div>
        </div>

        {/* HIDDEN FILE PICKER FOR DEVICE GALLERY / LOCAL STORAGE */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*,image/heic,image/heif"
          onChange={handlePhotoUpload}
          className="hidden"
          id="photo-file-input"
        />

        {/* PHOTO ATTACHMENT PANEL */}
        <AnimatePresence>
          {(showImageInput || postImageUrl || isUploadingImage) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3.5 rounded-2xl bg-[#070B14] border border-[#1C2A3D] space-y-3 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#00D9FF] flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#00D9FF]" />
                  <span>Photo Attachment</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowImageInput(false);
                    setPostImageUrl('');
                  }}
                  className="text-[#8B95A7] hover:text-[#F5F7FA] transition-colors cursor-pointer p-1"
                  title="Close attachment"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Uploading Spinner State */}
              {isUploadingImage && (
                <div className="w-full py-6 rounded-xl bg-[#101827] border border-[#1C2A3D] flex flex-col items-center justify-center gap-2 text-[#00D9FF]">
                  <Loader2 className="w-5 h-5 animate-spin text-[#00D9FF]" />
                  <span className="text-xs font-medium">Processing photo...</span>
                </div>
              )}

              {/* Uploaded Photo Preview */}
              {!isUploadingImage && postImageUrl && (
                <div className="w-full max-h-56 rounded-xl overflow-hidden border border-[#1C2A3D] relative group bg-black/60">
                  <img src={postImageUrl} alt="Preview" className="w-full h-full max-h-56 object-contain mx-auto" />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/80 hover:bg-rose-600 text-white border border-white/20 transition-all cursor-pointer shadow-md"
                    title="Remove photo"
                    id="btn-remove-photo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Upload Button + URL Fallback */}
              {!isUploadingImage && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#1677FF]/15 hover:bg-[#1677FF]/25 border border-[#00D9FF]/40 text-[#00D9FF] text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                    id="btn-select-photo-file"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{postImageUrl ? 'Change Photo from Gallery' : 'Upload from Device Gallery'}</span>
                  </button>

                  {!postImageUrl && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] text-[#8B95A7] uppercase font-bold shrink-0">OR URL:</span>
                      <input
                        type="text"
                        value={postImageUrl}
                        onChange={(e) => setPostImageUrl(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="w-full px-3 py-1.5 rounded-xl bg-[#101827] border border-[#1C2A3D] text-xs text-[#F5F7FA] placeholder-[#8B95A7]/50 outline-none focus:border-[#00D9FF]"
                      />
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* VIDEO ATTACHMENT PANEL */}
        <AnimatePresence>
          {showVideoInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3.5 rounded-2xl bg-[#070B14] border border-[#1C2A3D] space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#00D9FF] flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-[#00D9FF]" />
                  <span>Video Link</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowVideoInput(false);
                    setPostVideoUrl('');
                  }}
                  className="text-[#8B95A7] hover:text-[#F5F7FA]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input
                type="text"
                value={postVideoUrl}
                onChange={(e) => setPostVideoUrl(e.target.value)}
                placeholder="Enter YouTube, Vimeo, or MP4 link..."
                className="w-full px-3 py-2 rounded-xl bg-[#101827] border border-[#1C2A3D] text-xs text-[#F5F7FA] placeholder-[#8B95A7]/50 outline-none focus:border-[#00D9FF]"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* POLL CREATOR PANEL */}
        <AnimatePresence>
          {showPollCreator && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3.5 rounded-2xl bg-[#070B14] border border-[#1C2A3D] space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#00D9FF] flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-[#00D9FF]" />
                  <span>Create Anonymous Poll</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowPollCreator(false)}
                  className="text-[#8B95A7] hover:text-[#F5F7FA]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                      className="flex-1 px-3 py-2 rounded-xl bg-[#101827] border border-[#1C2A3D] text-xs text-[#F5F7FA] outline-none focus:border-[#00D9FF]"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePollOption(idx)}
                        className="text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
                        title="Remove option"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {pollOptions.length < 5 && (
                <button
                  type="button"
                  onClick={handleAddPollOption}
                  className="text-xs font-bold text-[#00D9FF] hover:underline flex items-center gap-1 pt-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Option
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* TAGS PANEL */}
        <AnimatePresence>
          {showTagInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 rounded-2xl bg-[#070B14] border border-[#1C2A3D] space-y-2"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-[#8B95A7] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-[#00D9FF]" /> Tags:
                </span>
                {tags.map((t, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded-lg bg-[#1677FF]/15 border border-[#00D9FF]/30 text-[#00D9FF] text-xs font-medium flex items-center gap-1">
                    #{t}
                    <button type="button" onClick={() => handleRemoveTag(t)} className="hover:text-rose-400">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={postTag}
                    onChange={(e) => setPostTag(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                    placeholder="New tag..."
                    className="w-24 px-2 py-1 rounded-lg bg-[#101827] border border-[#1C2A3D] text-xs text-[#F5F7FA] outline-none focus:border-[#00D9FF]"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="p-1 rounded-lg bg-[#101827] hover:bg-[#1C2A3D] text-[#8B95A7] hover:text-[#F5F7FA] border border-[#1C2A3D]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* DRAFTS LIST PANEL */}
        <AnimatePresence>
          {showDraftsList && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3.5 rounded-2xl bg-[#070B14] border border-[#1C2A3D] space-y-2.5"
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-[#1C2A3D]">
                <span className="text-xs font-bold text-[#00D9FF] uppercase tracking-wider flex items-center gap-1.5">
                  <FolderKanban className="w-4 h-4 text-[#00D9FF]" />
                  Saved Drafts ({drafts.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowDraftsList(false)}
                  className="text-[#8B95A7] hover:text-[#F5F7FA]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {drafts.length === 0 ? (
                <p className="text-xs text-[#8B95A7] py-2 text-center italic">
                  No saved drafts. Write text and click "Save Draft".
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                  {drafts.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => handleRestoreDraft(d)}
                      className="p-2.5 rounded-xl bg-[#101827] hover:bg-[#1677FF]/15 border border-[#1C2A3D] hover:border-[#00D9FF]/40 transition-all cursor-pointer flex items-center justify-between gap-2 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#F5F7FA] truncate">
                            {d.title || d.content.substring(0, 30) || 'Untitled Draft'}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1677FF]/20 text-[#00D9FF] border border-[#00D9FF]/30">
                            {d.community}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8B95A7] truncate mt-0.5">
                          {d.content || 'No text content'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#00D9FF] group-hover:underline">
                          Restore
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteDraft(d.id, e)}
                          className="p-1.5 rounded-lg text-[#8B95A7] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete draft"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3. COMPOSER BUTTONS (RESPONSIVE STACKING ON MOBILE, INLINE ON TABLET/DESKTOP) */}
        <div className="pt-3 border-t border-[#1C2A3D] space-y-3">
          
          {/* MOBILE VIEW CONTROLS (STACKED/WRAPPED NATURALLY) */}
          <div className="sm:hidden space-y-2.5">
            {/* Row 1: [ Photo ] [ Video ] */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!postImageUrl) {
                    fileInputRef.current?.click();
                  } else {
                    setShowImageInput(!showImageInput);
                  }
                }}
                className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  showImageInput || postImageUrl
                    ? 'bg-[#1677FF]/20 border-[#00D9FF]/50 text-[#00D9FF]' 
                    : 'bg-[#070B14] hover:bg-[#101827] border-[#1C2A3D] text-[#F5F7FA]'
                }`}
                id="btn-mobile-photo"
              >
                <ImageIcon className="w-4 h-4 text-[#00D9FF]" />
                <span>Photo</span>
              </button>

              <button
                type="button"
                onClick={() => setShowVideoInput(!showVideoInput)}
                className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  showVideoInput || postVideoUrl
                    ? 'bg-[#1677FF]/20 border-[#00D9FF]/50 text-[#00D9FF]' 
                    : 'bg-[#070B14] hover:bg-[#101827] border-[#1C2A3D] text-[#F5F7FA]'
                }`}
                id="btn-mobile-video"
              >
                <Video className="w-4 h-4 text-[#00D9FF]" />
                <span>Video</span>
              </button>
            </div>

            {/* Row 2: [ Poll ] [ AI Assist ] */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowPollCreator(!showPollCreator)}
                className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  showPollCreator 
                    ? 'bg-[#1677FF]/20 border-[#00D9FF]/50 text-[#00D9FF]' 
                    : 'bg-[#070B14] hover:bg-[#101827] border-[#1C2A3D] text-[#F5F7FA]'
                }`}
                id="btn-mobile-poll"
              >
                <BarChart2 className="w-4 h-4 text-[#00D9FF]" />
                <span>Poll</span>
              </button>

              <button
                type="button"
                onClick={handleAiAssist}
                disabled={isAiGenerating}
                className="min-h-[44px] px-3 py-2 rounded-xl bg-[#070B14] hover:bg-[#101827] border border-[#1C2A3D] text-xs font-bold text-[#00D9FF] flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                id="btn-mobile-ai"
              >
                {isAiGenerating ? (
                  <Loader2 className="w-4 h-4 text-[#00D9FF] animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 text-[#00D9FF]" />
                )}
                <span>AI Assist</span>
              </button>
            </div>

            {/* Row 3: [ Ghost Mode ] Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#070B14] border border-[#1C2A3D]">
              <div className="flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-[#00D9FF]" />
                <span className="text-xs font-bold text-[#F5F7FA]">Ghost Mode (Anonymous)</span>
              </div>
              <input
                type="checkbox"
                checked={postAnonymously}
                onChange={(e) => setPostAnonymously(e.target.checked)}
                className="w-4 h-4 rounded bg-[#101827] border-[#1C2A3D] accent-[#1677FF] cursor-pointer"
                id="checkbox-ghost-mode-mobile"
              />
            </div>

            {/* Row 4: [ Save Draft ] [ Drafts (X) ] */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="min-h-[44px] px-3 py-2 rounded-xl bg-[#070B14] hover:bg-[#101827] border border-[#1C2A3D] text-[#8B95A7] hover:text-[#F5F7FA] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                id="btn-mobile-save-draft"
              >
                <Bookmark className="w-4 h-4 text-[#00D9FF]" />
                <span>Save Draft</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDraftsList(!showDraftsList)}
                className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  showDraftsList
                    ? 'bg-[#1677FF]/20 border-[#00D9FF]/50 text-[#00D9FF]'
                    : 'bg-[#070B14] hover:bg-[#101827] border-[#1C2A3D] text-[#8B95A7] hover:text-[#F5F7FA]'
                }`}
                id="btn-mobile-view-drafts"
              >
                <FolderKanban className="w-4 h-4 text-[#00D9FF]" />
                <span>Drafts ({drafts.length})</span>
              </button>
            </div>

            {/* Row 5: Primary Action [ ✈ Post ] (Visually Dominant) */}
            <button
              type="submit"
              disabled={(!postContent.trim() && !postImageUrl.trim() && !postVideoUrl.trim()) || isUploadingImage}
              className="w-full min-h-[48px] py-3 rounded-2xl bg-gradient-to-r from-[#1677FF] via-[#00B4D8] to-[#00D9FF] hover:opacity-95 font-bold text-sm tracking-wide text-white shadow-[0_4px_20px_rgba(0,217,255,0.35)] flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed border border-[#00D9FF]/40"
              id="btn-mobile-submit-post"
            >
              <Send className="w-4 h-4 text-white" />
              <span>Post</span>
            </button>
          </div>

          {/* TABLET / DESKTOP VIEW CONTROLS (INLINE & STRUCTURED) */}
          <div className="hidden sm:flex flex-wrap items-center justify-between gap-3">
            
            {/* Action Tools */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Photo */}
              <button
                type="button"
                onClick={() => {
                  if (!postImageUrl) {
                    fileInputRef.current?.click();
                  } else {
                    setShowImageInput(!showImageInput);
                  }
                }}
                className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  showImageInput || postImageUrl
                    ? 'bg-[#1677FF]/20 border-[#00D9FF]/50 text-[#00D9FF]' 
                    : 'bg-[#070B14] hover:bg-[#101827] border-[#1C2A3D] text-[#F5F7FA] hover:border-[#00D9FF]/40'
                }`}
                id="btn-desktop-photo"
              >
                <ImageIcon className="w-4 h-4 text-[#00D9FF]" />
                <span>Photo</span>
              </button>

              {/* Video */}
              <button
                type="button"
                onClick={() => setShowVideoInput(!showVideoInput)}
                className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  showVideoInput || postVideoUrl
                    ? 'bg-[#1677FF]/20 border-[#00D9FF]/50 text-[#00D9FF]' 
                    : 'bg-[#070B14] hover:bg-[#101827] border-[#1C2A3D] text-[#F5F7FA] hover:border-[#00D9FF]/40'
                }`}
                id="btn-desktop-video"
              >
                <Video className="w-4 h-4 text-[#00D9FF]" />
                <span>Video</span>
              </button>

              {/* Poll */}
              <button
                type="button"
                onClick={() => setShowPollCreator(!showPollCreator)}
                className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  showPollCreator 
                    ? 'bg-[#1677FF]/20 border-[#00D9FF]/50 text-[#00D9FF]' 
                    : 'bg-[#070B14] hover:bg-[#101827] border-[#1C2A3D] text-[#F5F7FA] hover:border-[#00D9FF]/40'
                }`}
                id="btn-desktop-poll"
              >
                <BarChart2 className="w-4 h-4 text-[#00D9FF]" />
                <span>Poll</span>
              </button>

              {/* AI Assist */}
              <button
                type="button"
                onClick={handleAiAssist}
                disabled={isAiGenerating}
                className="px-3 py-2 rounded-xl bg-[#070B14] hover:bg-[#101827] border border-[#1C2A3D] hover:border-[#00D9FF]/40 text-xs font-bold text-[#00D9FF] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                id="btn-desktop-ai"
              >
                {isAiGenerating ? (
                  <Loader2 className="w-4 h-4 text-[#00D9FF] animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 text-[#00D9FF]" />
                )}
                <span>AI Assist</span>
              </button>

              {/* Tags Toggle */}
              <button
                type="button"
                onClick={() => setShowTagInput(!showTagInput)}
                className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  showTagInput 
                    ? 'bg-[#1677FF]/20 border-[#00D9FF]/50 text-[#00D9FF]' 
                    : 'bg-[#070B14] hover:bg-[#101827] border-[#1C2A3D] text-[#8B95A7] hover:text-[#F5F7FA]'
                }`}
                title="Add tags"
              >
                <Hash className="w-4 h-4 text-[#00D9FF]" />
              </button>
            </div>

            {/* Secondary Controls & Primary Post Button */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              
              {/* Ghost Mode Toggle */}
              <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#070B14] border border-[#1C2A3D] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={postAnonymously}
                  onChange={(e) => setPostAnonymously(e.target.checked)}
                  className="w-3.5 h-3.5 rounded bg-[#101827] border-[#1C2A3D] accent-[#1677FF] cursor-pointer"
                />
                <span className="text-xs font-bold text-[#8B95A7] hover:text-[#F5F7FA] flex items-center gap-1 transition-colors">
                  <EyeOff className="w-3.5 h-3.5 text-[#00D9FF]" />
                  <span>Ghost Mode</span>
                </span>
              </label>

              {/* Save Draft Button */}
              <button
                type="button"
                onClick={handleSaveDraft}
                className="px-3 py-2 rounded-xl bg-[#070B14] hover:bg-[#101827] border border-[#1C2A3D] hover:border-[#00D9FF]/40 text-[#8B95A7] hover:text-[#F5F7FA] font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                id="btn-desktop-save-draft"
              >
                <Bookmark className="w-3.5 h-3.5 text-[#00D9FF]" />
                <span>Save Draft</span>
              </button>

              {/* View Drafts Button */}
              <button
                type="button"
                onClick={() => setShowDraftsList(!showDraftsList)}
                className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  showDraftsList
                    ? 'bg-[#1677FF]/20 border-[#00D9FF]/50 text-[#00D9FF]'
                    : 'bg-[#070B14] hover:bg-[#101827] border-[#1C2A3D] text-[#8B95A7] hover:text-[#F5F7FA]'
                }`}
                title="View saved drafts"
                id="btn-desktop-view-drafts"
              >
                <FolderKanban className="w-3.5 h-3.5 text-[#00D9FF]" />
                <span>Drafts ({drafts.length})</span>
              </button>

              {/* Primary Post Button (Visually Dominant) */}
              <button
                type="submit"
                disabled={(!postContent.trim() && !postImageUrl.trim() && !postVideoUrl.trim()) || isUploadingImage}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#1677FF] via-[#00B4D8] to-[#00D9FF] hover:opacity-95 font-bold text-xs tracking-wide text-white shadow-[0_4px_20px_rgba(0,217,255,0.35)] flex items-center gap-2 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed border border-[#00D9FF]/40"
                id="btn-desktop-submit-post"
              >
                <Send className="w-3.5 h-3.5 text-white" />
                <span>Post</span>
              </button>

            </div>

          </div>

        </div>

      </form>
    </div>
  );
}
