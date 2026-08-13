/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Users,
  Check,
  Plus,
  Shield,
  ShieldAlert,
  Flame,
  Clock,
  Sparkles,
  Search,
  MessageSquare,
  ThumbsUp,
  Bookmark,
  Send,
  MoreVertical,
  Flag,
  Lock,
  Pin,
  TrendingUp,
  Info
} from 'lucide-react';
import { Community, UserAccount, CommunityPost, CommunityComment } from '../../types';
import CommunityModTools from './CommunityModTools';
import CommunityReportModal from './CommunityReportModal';

interface CommunityDetailProps {
  community: Community;
  currentUser: UserAccount;
  onBack: () => void;
  onToggleJoin: (community: Community) => void;
  onTriggerToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onSelectUser: (username: string) => void;
}

export default function CommunityDetail({
  community: initialCommunity,
  currentUser,
  onBack,
  onToggleJoin,
  onTriggerToast,
  onSelectUser
}: CommunityDetailProps) {
  const [community, setCommunity] = useState<Community>(initialCommunity);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [activeSort, setActiveSort] = useState<'trending' | 'new' | 'top'>('trending');
  const [searchQuery, setSearchQuery] = useState('');

  // Post creation state
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postTags, setPostTags] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  // Mod tools & report modal state
  const [showModTools, setShowModTools] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    type: 'post' | 'comment';
    id: string;
    title?: string;
    content?: string;
  } | null>(null);

  // Active expanded comments state
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState<{ [postId: string]: string }>({});

  const isMod = community.moderatorUsernames?.includes(currentUser.username) || community.creatorUsername === currentUser.username;
  const isBanned = community.bannedUsernames?.includes(currentUser.username);

  const fetchCommunityPosts = async () => {
    setIsLoadingPosts(true);
    try {
      const res = await fetch(`/api/communities/${community.id}/posts?sort=${activeSort}`, {
        headers: {
          'x-user-id': currentUser.id,
          'x-username': currentUser.username
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPosts(data.posts || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  useEffect(() => {
    fetchCommunityPosts();
  }, [community.id, activeSort]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBanned) {
      onTriggerToast('You are banned from posting in this community.', 'error');
      return;
    }

    if (!postTitle.trim() || !postContent.trim()) {
      onTriggerToast('Title and content are required.', 'error');
      return;
    }

    setIsSubmittingPost(true);
    try {
      const parsedTags = postTags
        .split(',')
        .map(t => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      const res = await fetch(`/api/communities/${community.id}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-username': currentUser.username
        },
        body: JSON.stringify({
          title: postTitle.trim(),
          content: postContent.trim(),
          tags: parsedTags,
          isAnonymous,
          authorUsername: isAnonymous ? 'Anonymous' : currentUser.username,
          authorAvatar: currentUser.avatarUrl
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.post) {
        setPosts([data.post, ...posts]);
        setPostTitle('');
        setPostContent('');
        setPostTags('');
        setIsCreatingPost(false);
        onTriggerToast('Post published to c/' + community.handle, 'success');
      } else {
        onTriggerToast(data.error || 'Failed to publish post.', 'error');
      }
    } catch (err) {
      console.error(err);
      onTriggerToast('Failed to publish post.', 'error');
    } finally {
      setIsSubmittingPost(false);
    }
  };

  const handleUpvotePost = async (postId: string) => {
    try {
      const res = await fetch(`/api/communities/${community.id}/posts/${postId}/upvote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-username': currentUser.username
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              upvotes: data.upvotes,
              isUpvoted: data.isUpvoted
            };
          }
          return p;
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (postId: string) => {
    const text = commentInput[postId]?.trim();
    if (!text) return;

    try {
      const res = await fetch(`/api/communities/${community.id}/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-username': currentUser.username
        },
        body: JSON.stringify({
          content: text,
          authorUsername: currentUser.username,
          authorAvatar: currentUser.avatarUrl
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.comment) {
        setPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              commentCount: (p.commentCount || 0) + 1,
              comments: [...(p.comments || []), data.comment]
            };
          }
          return p;
        }));
        setCommentInput({ ...commentInput, [postId]: '' });
        onTriggerToast('Comment posted', 'success');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredPosts = posts.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q) || p.authorUsername.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 text-left">
      {/* HEADER BANNER */}
      <div className="relative rounded-3xl overflow-hidden bg-[#0d0822] border border-violet-500/20 shadow-[0_15px_40px_rgba(0,0,0,0.4)]">
        {community.bannerUrl ? (
          <div className="h-36 sm:h-48 w-full overflow-hidden relative">
            <img src={community.bannerUrl} alt={community.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d0822] via-[#0d0822]/60 to-transparent" />
          </div>
        ) : (
          <div className="h-32 sm:h-40 w-full bg-gradient-to-r from-violet-900/60 via-purple-900/40 to-indigo-900/60 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d0822] to-transparent" />
          </div>
        )}

        <div className="p-4 sm:p-6 -mt-12 sm:-mt-16 relative z-10 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div className="flex items-end gap-4">
            <div className="relative">
              {community.iconUrl ? (
                <img
                  src={community.iconUrl}
                  alt={community.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover border-4 border-[#0d0822] shadow-[0_0_25px_rgba(124,58,237,0.4)]"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-violet-600 via-purple-600 to-indigo-600 flex items-center justify-center font-bold text-white border-4 border-[#0d0822] text-2xl shadow-[0_0_25px_rgba(124,58,237,0.4)] font-mono">
                  c/{community.handle.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="mb-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={onBack}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer mr-1"
                  title="Back to Communities"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                  {community.name}
                </h2>
              </div>
              <p className="text-xs sm:text-sm font-mono font-bold text-violet-400 mt-0.5">
                c/{community.handle} • <span className="text-white/60 font-sans">{community.category}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {isMod && (
              <button
                onClick={() => setShowModTools(true)}
                className="px-4 py-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
              >
                <Shield className="w-4 h-4 text-amber-400" />
                <span>Mod Tools</span>
              </button>
            )}

            <button
              onClick={() => {
                onToggleJoin(community);
                setCommunity(prev => ({
                  ...prev,
                  isJoined: !prev.isJoined,
                  memberCount: prev.isJoined ? prev.memberCount - 1 : prev.memberCount + 1
                }));
              }}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                community.isJoined
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-500/40 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40'
                  : 'bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.4)]'
              }`}
            >
              {community.isJoined ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Joined ({community.memberCount})</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Join Community ({community.memberCount})</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="px-6 pb-6 pt-2 border-t border-white/10 flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
              {community.description}
            </p>
          </div>

          {community.rules && community.rules.length > 0 && (
            <div className="w-full md:w-72 p-3.5 rounded-2xl bg-black/40 border border-white/10 text-xs shrink-0">
              <h4 className="font-bold text-violet-200 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-violet-400" /> Community Rules
              </h4>
              <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                {community.rules.map((rule, idx) => (
                  <div key={idx} className="text-[11px]">
                    <span className="font-bold text-white mr-1">{idx + 1}. {rule.title}:</span>
                    <span className="text-white/60">{rule.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CREATE POST CARD & CONTROLS */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0d0822]/80 border border-violet-500/20 backdrop-blur-xl shadow-lg space-y-4">
        {!isCreatingPost ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white shrink-0">
              {currentUser.username.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={() => setIsCreatingPost(true)}
              className="flex-1 px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white/40 text-xs font-bold text-left hover:border-violet-500/50 hover:text-white/60 transition-all cursor-pointer"
            >
              Post to c/{community.handle}...
            </button>
            <button
              onClick={() => setIsCreatingPost(true)}
              className="px-4 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" /> Create Post
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreatePost} className="space-y-3 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h4 className="text-xs font-bold uppercase tracking-wider text-violet-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-violet-400" /> Create Community Post
              </h4>
              <button
                type="button"
                onClick={() => setIsCreatingPost(false)}
                className="text-white/40 hover:text-white text-xs font-bold p-1 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <input
              type="text"
              required
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              placeholder="Title of your post..."
              className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white font-bold text-sm outline-none focus:border-violet-500"
            />

            <textarea
              required
              rows={4}
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="Write your discussion, insights, or code snippet here..."
              className="w-full p-3.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-violet-500 resize-none"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={postTags}
                onChange={(e) => setPostTags(e.target.value)}
                placeholder="Tags (comma-separated, e.g. privacy, security)"
                className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-violet-500"
              />

              <div className="flex items-center gap-2 justify-end">
                <label className="flex items-center gap-2 text-xs font-bold text-white/70 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="rounded border-white/20 bg-black/40 text-violet-600 focus:ring-violet-500 cursor-pointer"
                  />
                  <span>Post Anonymously</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreatingPost(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingPost}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" /> Publish
              </button>
            </div>
          </form>
        )}

        {/* FEED CONTROLS: SORT & SEARCH */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/10">
          <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 w-full sm:w-auto">
            <button
              onClick={() => setActiveSort('trending')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeSort === 'trending' ? 'bg-violet-600 text-white shadow' : 'text-white/60 hover:text-white'
              }`}
            >
              <Flame className="w-3 h-3 text-amber-400" /> Hot
            </button>
            <button
              onClick={() => setActiveSort('new')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeSort === 'new' ? 'bg-violet-600 text-white shadow' : 'text-white/60 hover:text-white'
              }`}
            >
              <Clock className="w-3 h-3 text-cyan-400" /> New
            </button>
            <button
              onClick={() => setActiveSort('top')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeSort === 'top' ? 'bg-violet-600 text-white shadow' : 'text-white/60 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3 h-3 text-emerald-400" /> Top
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in c/..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 text-xs outline-none focus:border-violet-500"
            />
          </div>
        </div>
      </div>

      {/* COMMUNITY POSTS LIST */}
      <div className="space-y-4">
        {isLoadingPosts ? (
          <div className="p-12 text-center text-white/40 text-xs">
            Loading community feed...
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="p-12 rounded-3xl bg-[#0d0822]/60 border border-violet-500/10 text-center space-y-2">
            <MessageSquare className="w-8 h-8 text-violet-400/40 mx-auto" />
            <h4 className="text-sm font-bold text-white">No posts in c/{community.handle} yet</h4>
            <p className="text-xs text-white/50 max-w-sm mx-auto">
              Be the first member to start a discussion in this encrypted community.
            </p>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-3xl bg-gradient-to-b from-white/[0.04] to-black/40 border border-violet-500/20 backdrop-blur-xl space-y-3 relative overflow-hidden group shadow-md text-left"
            >
              {post.isPinned && (
                <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-bold font-mono">
                  <Pin className="w-3.5 h-3.5" /> Pinned by Moderation
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    onClick={() => !post.isAnonymous && onSelectUser(post.authorUsername)}
                    className="w-8 h-8 rounded-xl bg-violet-600/30 border border-violet-500/40 flex items-center justify-center font-bold text-white text-xs cursor-pointer"
                  >
                    {post.authorUsername.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div
                      onClick={() => !post.isAnonymous && onSelectUser(post.authorUsername)}
                      className="text-xs font-bold text-white hover:text-violet-300 cursor-pointer flex items-center gap-1.5"
                    >
                      <span>@{post.authorUsername}</span>
                      {post.isAnonymous && (
                        <span className="px-1.5 py-0.2 rounded bg-white/10 text-[10px] text-white/60">
                          Incognito
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-white/40 font-mono">{post.timestamp}</p>
                  </div>
                </div>

                <button
                  onClick={() => setReportTarget({
                    type: 'post',
                    id: post.id,
                    title: post.title,
                    content: post.content
                  })}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-white/40 hover:text-rose-400 transition-colors cursor-pointer"
                  title="Report Post"
                >
                  <Flag className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <h3 className="text-base font-bold text-white mb-1.5 leading-snug">
                  {post.title}
                </h3>
                <p className="text-xs text-white/80 leading-relaxed whitespace-pre-line">
                  {post.content}
                </p>
              </div>

              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {post.tags.map((tag, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[10px] font-mono">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleUpvotePost(post.id)}
                    className={`flex items-center gap-1.5 font-bold transition-colors cursor-pointer ${
                      post.isUpvoted ? 'text-emerald-400' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>{post.upvotes || 0}</span>
                  </button>

                  <button
                    onClick={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)}
                    className="flex items-center gap-1.5 font-bold text-white/60 hover:text-white cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>{post.commentCount || (post.comments ? post.comments.length : 0)} Comments</span>
                  </button>
                </div>
              </div>

              {/* EXPANDED COMMENTS SECTION */}
              <AnimatePresence>
                {expandedPostId === post.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-3 border-t border-white/10 space-y-3"
                  >
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={commentInput[post.id] || ''}
                        onChange={(e) => setCommentInput({ ...commentInput, [post.id]: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                        placeholder="Write a comment..."
                        className="flex-1 px-3.5 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-violet-500"
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs cursor-pointer"
                      >
                        Send
                      </button>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                      {post.comments && post.comments.length > 0 ? (
                        post.comments.map((comm) => (
                          <div key={comm.id} className="p-2.5 rounded-xl bg-black/30 border border-white/10 text-xs text-left">
                            <div className="flex items-center justify-between mb-1">
                              <span
                                onClick={() => onSelectUser(comm.authorUsername)}
                                className="font-bold text-violet-300 hover:underline cursor-pointer"
                              >
                                @{comm.authorUsername}
                              </span>
                              <span className="text-[10px] text-white/40 font-mono">{comm.timestamp}</span>
                            </div>
                            <p className="text-white/80">{comm.content}</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-[11px] text-white/40 italic">No comments yet.</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>

      {/* MOD TOOLS MODAL */}
      {showModTools && (
        <CommunityModTools
          community={community}
          currentUser={currentUser}
          onClose={() => setShowModTools(false)}
          onTriggerToast={onTriggerToast}
          onCommunityUpdated={(updated) => setCommunity(updated)}
        />
      )}

      {/* REPORT CONTENT MODAL */}
      {reportTarget && (
        <CommunityReportModal
          communityId={community.id}
          communityHandle={community.handle}
          targetType={reportTarget.type}
          targetId={reportTarget.id}
          targetTitle={reportTarget.title}
          targetContent={reportTarget.content}
          currentUser={currentUser}
          isOpen={true}
          onClose={() => setReportTarget(null)}
          onTriggerToast={onTriggerToast}
        />
      )}
    </div>
  );
}
