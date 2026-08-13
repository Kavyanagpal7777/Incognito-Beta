/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowUp, 
  MessageSquare, 
  Share2, 
  Bookmark, 
  Flag, 
  MoreHorizontal, 
  ShieldCheck, 
  Clock, 
  Check, 
  Send, 
  Eye, 
  Sparkles, 
  X,
  Lock,
  BarChart2,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { Post, Comment, UserAccount } from '../types';
import UserBadgesList from './UserBadgesList';

interface PostCardProps {
  key?: string;
  post: Post;
  currentUser: UserAccount;
  onUpvote: (postId: string) => void;
  onSave: (postId: string) => void;
  onAddComment: (postId: string, commentText: string) => void;
  onReportPost: (postId: string) => void;
  onDeletePost?: (postId: string) => void;
  onVotePoll?: (postId: string, optionId: string) => void;
  onViewUserProfile?: (username: string) => void;
  onTriggerToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function PostCard({
  post,
  currentUser,
  onUpvote,
  onSave,
  onAddComment,
  onReportPost,
  onDeletePost,
  onVotePoll,
  onViewUserProfile,
  onTriggerToast
}: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [showImageLightbox, setShowImageLightbox] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Poll state
  const poll = post.poll;

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    onAddComment(post.id, newCommentText.trim());
    setNewCommentText('');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    onTriggerToast('Cryptographic post permalink copied to clipboard!', 'success');
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.3 }}
      className="bg-[#0d091f]/80 hover:bg-[#0e0a24]/90 border border-violet-500/20 hover:border-violet-500/40 rounded-3xl p-5 shadow-[0_10px_35px_rgba(0,0,0,0.4)] hover:shadow-[0_15px_45px_rgba(124,58,237,0.2)] backdrop-blur-2xl relative overflow-hidden transition-all duration-300 group my-4 text-left"
      id={`post-card-${post.id}`}
    >
      {/* Top Refraction Beam Accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent pointer-events-none group-hover:via-violet-400/60 transition-colors" />

      {/* POST HEADER: COMMUNITY, USER, TIMESTAMP, SHIELD BADGE & MENU */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <button 
            type="button"
            onClick={() => onViewUserProfile?.(post.username)}
            className="relative cursor-pointer group/avatar focus:outline-none"
            title={`View profile of @${post.username}`}
          >
            {post.userAvatar ? (
              <img 
                src={post.userAvatar} 
                alt={post.username} 
                className="w-10 h-10 rounded-full object-cover border border-violet-400/40 shadow-sm group-hover/avatar:border-violet-300 transition-all"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-700 via-purple-600 to-indigo-600 flex items-center justify-center font-display font-bold text-white border border-violet-400/40 text-xs shadow-sm group-hover/avatar:border-violet-300 transition-all">
                {post.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#0c081d] border border-violet-400 flex items-center justify-center">
              <Lock className="w-2 h-2 text-violet-300" />
            </div>
          </button>

          {/* User & Community Info */}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-violet-500/15 border border-violet-500/30 text-violet-300 text-[10.5px] font-extrabold uppercase tracking-wider">
                {post.community || 'c/Privacy'}
              </span>
              <button
                type="button"
                onClick={() => onViewUserProfile?.(post.username)}
                className="text-xs font-bold text-white hover:text-violet-300 transition-colors cursor-pointer hover:underline"
              >
                @{post.username}
              </button>
              {post.username === currentUser.username && (
                <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[8px] font-extrabold uppercase tracking-widest">
                  You
                </span>
              )}
              <UserBadgesList
                role={post.username === 'VoidCipher' ? 'owner' : post.username === 'ShadowNova' ? 'moderator' : (post as any).authorRole}
                karma={post.username === 'VoidCipher' ? 15820 : post.username === 'ShadowNova' ? 12480 : post.username === 'CryptoKnight' ? 8920 : post.username === 'CipherVapor' ? 6450 : 850}
                leaderboardRank={post.username === 'VoidCipher' ? 1 : post.username === 'ShadowNova' ? 2 : post.username === 'CryptoKnight' ? 3 : post.username === 'CipherVapor' ? 4 : undefined}
                isOgMember={post.username === 'VoidCipher' || (post as any).isOgMember}
                size="xs"
              />
            </div>

            <div className="flex items-center gap-2 text-[10px] text-white/40 mt-0.5">
              <span className="flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {post.timestamp}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <ShieldCheck className="w-2.5 h-2.5" />
                Identity Shielded
              </span>
            </div>
          </div>
        </div>

        {/* THREE-DOT MENU DROPDOWN */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 5 }}
                className="absolute right-0 mt-1 w-40 bg-[#0c081d] border border-violet-500/30 rounded-xl p-1 shadow-2xl z-20 text-xs"
              >
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(post.content);
                    onTriggerToast('Post text copied to clipboard.', 'info');
                    setShowMenu(false);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-left text-white/80 hover:bg-violet-600/20 hover:text-white transition-colors"
                >
                  Copy Text
                </button>
                <button
                  onClick={() => {
                    onReportPost(post.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-left text-amber-300 hover:bg-amber-500/20 transition-colors"
                >
                  Report Post
                </button>
                {onDeletePost && (
                  <button
                    onClick={() => {
                      if (window.confirm('Delete this post permanently from the network?')) {
                        onDeletePost(post.id);
                        setShowMenu(false);
                      }
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-rose-400 hover:bg-rose-500/20 transition-colors font-bold flex items-center gap-1.5 mt-0.5 border-t border-white/10 pt-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Post</span>
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* POST TITLE */}
      {post.title && (
        <h3 className="text-sm sm:text-base font-bold text-white tracking-wide mb-2 font-display leading-snug">
          {post.title}
        </h3>
      )}

      {/* POST CONTENT / BODY TEXT */}
      <p className="text-xs sm:text-sm text-white/85 leading-relaxed whitespace-pre-line mb-3 font-sans">
        {post.content}
      </p>

      {/* POST IMAGE WITH HOVER ZOOM & LIGHTBOX CLICK */}
      {post.imageUrl && (
        <div 
          onClick={() => setShowImageLightbox(true)}
          className="w-full max-h-96 rounded-2xl overflow-hidden border border-white/10 my-3 relative group/img cursor-pointer shadow-lg"
        >
          <img 
            src={post.imageUrl} 
            alt="Post media" 
            className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
          />
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
            <span className="px-3 py-1.5 rounded-xl bg-black/60 border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-md">
              <Eye className="w-3.5 h-3.5 text-violet-300" /> Expand View
            </span>
          </div>
        </div>
      )}

      {/* POLL COMPONENT IF PRESENT */}
      {poll && (
        <div className="p-4 rounded-2xl bg-black/30 border border-violet-500/20 my-3 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-violet-300 mb-1">
            <span className="flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4 text-violet-400" />
              Community Poll
            </span>
            <span className="text-[10px] text-white/40">{poll.totalVotes} votes</span>
          </div>

          <div className="space-y-2">
            {poll.options.map((opt) => {
              const isSelected = poll.userVotedId === opt.id;
              const percentage = poll.totalVotes > 0 
                ? Math.round((opt.votes / poll.totalVotes) * 100) 
                : 0;

              return (
                <button
                  key={opt.id}
                  onClick={() => onVotePoll && onVotePoll(post.id, opt.id)}
                  className={`w-full p-2.5 rounded-xl border text-left relative overflow-hidden transition-all cursor-pointer ${
                    isSelected
                      ? 'border-violet-400/60 bg-violet-600/20 text-white font-bold'
                      : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-white/80'
                  }`}
                >
                  {/* Percentage Vote Fill Bar */}
                  <div 
                    className="absolute left-0 top-0 bottom-0 bg-violet-500/25 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                  <div className="relative z-10 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      {opt.text}
                    </span>
                    <span className="font-mono text-[11px] font-bold text-violet-300">{percentage}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* POST TAGS CHIPS */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {post.tags.map((tag, idx) => (
            <span 
              key={idx}
              className="px-2 py-0.5 rounded-lg bg-white/[0.03] hover:bg-violet-500/10 border border-white/5 hover:border-violet-500/20 text-[10px] font-mono text-white/50 hover:text-violet-300 transition-all cursor-pointer"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* ACTION BUTTONS BAR: UPVOTE, COMMENTS, SHARE, SAVE, REPORT */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/10">
        
        {/* UPVOTE BUTTON */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onUpvote(post.id)}
          className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            post.isUpvoted 
              ? 'bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 border-violet-400/50 text-violet-200 shadow-[0_0_15px_rgba(168,85,247,0.3)]' 
              : 'bg-white/[0.02] hover:bg-white/[0.08] border-white/10 text-white/60 hover:text-white'
          }`}
          id={`upvote-btn-${post.id}`}
        >
          <ArrowUp className={`w-3.5 h-3.5 ${post.isUpvoted ? 'text-violet-300 fill-violet-300' : ''}`} />
          <span>{post.upvotes}</span>
        </motion.button>

        {/* COMMENTS TOGGLE BUTTON */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowComments(!showComments)}
          className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            showComments 
              ? 'bg-violet-500/20 border-violet-400/40 text-violet-200' 
              : 'bg-white/[0.02] hover:bg-white/[0.08] border-white/10 text-white/60 hover:text-white'
          }`}
          id={`comments-btn-${post.id}`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>{post.comments.length}</span>
        </motion.button>

        {/* SHARE BUTTON */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleShare}
          className="p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.08] border border-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
          title="Share Permlink"
        >
          <Share2 className="w-3.5 h-3.5" />
        </motion.button>

        {/* SAVE / BOOKMARK BUTTON */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSave(post.id)}
          className={`p-2 rounded-xl border transition-all cursor-pointer ${
            post.isSaved 
              ? 'bg-amber-500/20 border-amber-400/40 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.3)]' 
              : 'bg-white/[0.02] hover:bg-white/[0.08] border-white/10 text-white/60 hover:text-white'
          }`}
          title="Save Post"
        >
          <Bookmark className={`w-3.5 h-3.5 ${post.isSaved ? 'fill-amber-300' : ''}`} />
        </motion.button>

        {/* REPORT BUTTON */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onReportPost(post.id)}
          className="p-2 rounded-xl bg-white/[0.02] hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 text-white/40 hover:text-rose-300 transition-all cursor-pointer"
          title="Report Post"
        >
          <Flag className="w-3.5 h-3.5" />
        </motion.button>

      </div>

      {/* COMMENTS DRAWER WITH SLIDE ANIMATION */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden pt-4 mt-3 border-t border-white/10 space-y-3"
          >
            {/* Comments List */}
            {post.comments.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                {post.comments.map((comment) => (
                  <div 
                    key={comment.id}
                    className="p-3 rounded-2xl bg-black/30 border border-white/5 space-y-1 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => onViewUserProfile?.(comment.username)}
                        className="text-xs font-bold text-violet-300 hover:text-violet-200 flex items-center gap-1 cursor-pointer hover:underline"
                      >
                        @{comment.username}
                        {comment.username === currentUser.username && (
                          <span className="text-[8px] bg-violet-500/20 px-1 rounded text-violet-200">You</span>
                        )}
                      </button>
                      <span className="text-[9px] text-white/30">{comment.timestamp}</span>
                    </div>
                    <p className="text-xs text-white/80 leading-relaxed">
                      {comment.content}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/40 italic py-2">
                No comments yet. Be the first to share an anonymous comment!
              </p>
            )}

            {/* Comment Add Form */}
            <form onSubmit={handleCommentSubmit} className="flex gap-2 pt-1">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder={`Comment as @${currentUser.username}...`}
                className="flex-1 px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 outline-none focus:border-violet-500/60"
                maxLength={250}
              />
              <button
                type="submit"
                disabled={!newCommentText.trim()}
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* IMAGE LIGHTBOX MODAL */}
      <AnimatePresence>
        {showImageLightbox && post.imageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowImageLightbox(false)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl p-4 sm:p-8 flex items-center justify-center cursor-zoom-out"
          >
            <button
              onClick={() => setShowImageLightbox(false)}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={post.imageUrl} 
              alt="Expanded media" 
              className="max-w-full max-h-[85vh] rounded-2xl border border-violet-500/40 shadow-2xl object-contain" 
            />
          </motion.div>
        )}
      </AnimatePresence>

    </motion.article>
  );
}
