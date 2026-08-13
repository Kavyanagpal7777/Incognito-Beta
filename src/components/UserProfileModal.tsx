import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ShieldCheck, 
  Zap, 
  Award, 
  Lock, 
  MessageSquare, 
  Sparkles, 
  UserPlus, 
  Check, 
  Radio,
  Edit2,
  Crown,
  Pin,
  FileText
} from 'lucide-react';
import { UserAccount, Post } from '../types';
import PostCard from './PostCard';
import UserBadgesList from './UserBadgesList';

interface UserProfileModalProps {
  username: string | null;
  accounts: UserAccount[];
  posts: Post[];
  currentUser: UserAccount;
  onClose: () => void;
  onUpvote: (postId: string) => void;
  onSave: (postId: string) => void;
  onAddComment: (postId: string, commentText: string) => void;
  onReportPost: (postId: string) => void;
  onDeletePost?: (postId: string) => void;
  onVotePoll?: (postId: string, optionId: string) => void;
  onStartDirectMessage?: (username: string) => void;
  onTriggerToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onUpdateKarma?: (targetUsername: string, newKarma: number) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  username,
  accounts,
  posts,
  currentUser,
  onClose,
  onUpvote,
  onSave,
  onAddComment,
  onReportPost,
  onDeletePost,
  onVotePoll,
  onStartDirectMessage,
  onTriggerToast,
  onUpdateKarma
}) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isEditingKarma, setIsEditingKarma] = useState(false);
  const [karmaInput, setKarmaInput] = useState('');

  useEffect(() => {
    setIsFollowing(false);
    setIsEditingKarma(false);
  }, [username]);

  if (!username) return null;

  // Find user details from registered accounts or build public profile from post metadata
  const userAccount = accounts.find(a => a.username.toLowerCase() === username.toLowerCase());
  const userPosts = posts.filter(p => p.username.toLowerCase() === username.toLowerCase());

  // Fallback metadata if user created posts before registering in accounts store
  const displayAvatar = userAccount?.avatarUrl || userPosts[0]?.userAvatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80';
  const displayBio = userAccount?.bio || 'Anonymous participant on the INCOGNITO zero-knowledge privacy network.';
  const displayKarma = userAccount?.karma || (userPosts.length * 45 + 120);
  const displayBadges = userAccount?.badges || ['Privacy Knight', 'Verified Node'];
  const displayJoinDate = userAccount?.joinDate || '2026';

  const isSelf = currentUser.username.toLowerCase() === username.toLowerCase();

  const handleToggleFollow = () => {
    setIsFollowing(!isFollowing);
    if (!isFollowing) {
      onTriggerToast(`Subscribed to public broadcasts from @${username}`, 'success');
    } else {
      onTriggerToast(`Unsubscribed from @${username}`, 'info');
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
        id="user-profile-modal-overlay"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-3xl bg-[#080d1a]/95 border border-cyan-500/30 rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl text-left my-8 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          id={`user-profile-modal-${username}`}
        >
          {/* Top Refraction Accent Light */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-500" />
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* CLOSE BUTTON */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2.5 rounded-full bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-all cursor-pointer border border-white/10 z-20"
            title="Close Profile"
          >
            <X className="w-5 h-5" />
          </button>

          {/* HERO PROFILE HEADER */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950/60 via-slate-900/60 to-cyan-950/60 border border-cyan-500/30 relative overflow-hidden mb-6 shadow-xl">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 relative z-10">
              
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <img 
                  src={displayAvatar} 
                  alt={username} 
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-cyan-400/50 shadow-[0_0_25px_rgba(0,217,255,0.3)]"
                />
                <div className="absolute bottom-1 right-1 p-1.5 rounded-full bg-[#080d1a] border border-emerald-400 text-emerald-400 shadow-md" title="Public Identity Isolated">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>

              {/* Identity & Badges */}
              <div className="flex-1 text-center sm:text-left space-y-2">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white tracking-wide">
                    @{username}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1">
                    <Lock className="w-3 h-3 text-emerald-400" /> Isolated
                  </span>
                  {userAccount?.role && userAccount.role !== 'user' && (
                    <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-extrabold uppercase">
                      {userAccount.role}
                    </span>
                  )}
                </div>

                <p className="text-xs text-white/70 leading-relaxed max-w-lg">
                  {displayBio}
                </p>

                {/* Ordered Ranks & Badges: 1. Staff, 2. Leaderboard, 3. Rank */}
                <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <UserBadgesList
                    role={userAccount?.role || (username.toLowerCase() === 'voidcipher' ? 'owner' : username.toLowerCase() === 'shadownova' ? 'moderator' : 'user')}
                    karma={displayKarma}
                    leaderboardRank={username.toLowerCase() === 'voidcipher' ? 1 : username.toLowerCase() === 'shadownova' ? 2 : username.toLowerCase() === 'cryptoknight' ? 3 : username.toLowerCase() === 'ciphervapor' ? 4 : undefined}
                    isOgMember={userAccount?.isOgMember || username.toLowerCase() === 'voidcipher'}
                    ogSubscriptionExpiryDate={userAccount?.ogSubscriptionExpiryDate}
                    size="md"
                  />
                </div>
              </div>

              {/* Karma & Direct Action */}
              <div className="flex flex-col items-center sm:items-end justify-between gap-3 bg-black/40 p-4 rounded-2xl border border-white/10 w-full sm:w-auto flex-shrink-0">
                <div className="text-center sm:text-right w-full">
                  <div className="flex items-center justify-between sm:justify-end gap-2">
                    <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold block">Karma Score</span>
                    <button
                      onClick={() => {
                        if (isEditingKarma) {
                          setIsEditingKarma(false);
                        } else {
                          setKarmaInput(String(displayKarma));
                          setIsEditingKarma(true);
                        }
                      }}
                      className="px-2 py-0.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 text-[10px] font-bold border border-cyan-400/30 flex items-center gap-1 cursor-pointer transition-all"
                      title="Edit Karma Points"
                    >
                      <Edit2 className="w-2.5 h-2.5" />
                      <span>{isEditingKarma ? 'Cancel' : 'Edit Karma'}</span>
                    </button>
                  </div>

                  {isEditingKarma ? (
                    <div className="mt-2 flex items-center gap-1.5 justify-end">
                      <input
                        type="number"
                        value={karmaInput}
                        onChange={(e) => setKarmaInput(e.target.value)}
                        className="w-28 px-2 py-1 bg-black/80 border border-amber-400/60 rounded-xl text-amber-300 font-mono text-sm font-bold text-center outline-none focus:ring-2 focus:ring-amber-400"
                        placeholder="Karma"
                      />
                      <button
                        onClick={() => {
                          const val = parseInt(karmaInput, 10);
                          if (!isNaN(val)) {
                            if (onUpdateKarma) {
                              onUpdateKarma(username, val);
                            }
                            setIsEditingKarma(false);
                            onTriggerToast(`Karma points for @${username} updated to ${val}`, 'success');
                          } else {
                            onTriggerToast('Please enter a valid numeric karma value.', 'error');
                          }
                        }}
                        className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold cursor-pointer transition-all shadow-md"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center sm:justify-end gap-1.5 text-lg font-extrabold font-mono text-amber-300 mt-0.5">
                      <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
                      {displayKarma.toLocaleString()}
                    </div>
                  )}
                </div>

                {!isSelf && (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={handleToggleFollow}
                      className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                        isFollowing
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white border-cyan-400/30 shadow-md'
                      }`}
                    >
                      {isFollowing ? <Check className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                      <span>{isFollowing ? 'Subscribed' : 'Subscribe'}</span>
                    </button>

                    {onStartDirectMessage && (
                      <button
                        onClick={() => {
                          onStartDirectMessage(username);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-white/10"
                        title="Send Direct Message"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-cyan-300" />
                        <span>Message</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* PUBLIC BROADCASTS SECTION */}
          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 sticky top-0 bg-[#080d1a]/95 py-2 z-10 border-b border-white/10">
              <Radio className="w-4 h-4 text-cyan-400" />
              Public Broadcasts by @{username} ({userPosts.length})
            </h3>

            {userPosts.length > 0 ? (
              userPosts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUser={currentUser}
                  onUpvote={onUpvote}
                  onSave={onSave}
                  onAddComment={onAddComment}
                  onReportPost={onReportPost}
                  onDeletePost={onDeletePost}
                  onVotePoll={onVotePoll}
                  onTriggerToast={onTriggerToast}
                />
              ))
            ) : (
              <div className="p-8 rounded-2xl bg-black/30 border border-white/10 text-center text-white/40">
                <Sparkles className="w-6 h-6 text-cyan-400 mx-auto mb-2 opacity-60" />
                <p className="text-xs">No public broadcasts recorded from @{username} yet.</p>
              </div>
            )}
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default UserProfileModal;
