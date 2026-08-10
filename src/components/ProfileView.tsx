/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  User, 
  ShieldCheck, 
  Zap, 
  Award, 
  Lock, 
  Clock, 
  Edit3, 
  Key, 
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { UserAccount, Post } from '../types';
import PostCard from './PostCard';

interface ProfileViewProps {
  currentUser: UserAccount;
  userPosts: Post[];
  onUpvote: (postId: string) => void;
  onSave: (postId: string) => void;
  onAddComment: (postId: string, commentText: string) => void;
  onReportPost: (postId: string) => void;
  onTriggerToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onOpenSettings: () => void;
}

export default function ProfileView({
  currentUser,
  userPosts,
  onUpvote,
  onSave,
  onAddComment,
  onReportPost,
  onTriggerToast,
  onOpenSettings
}: ProfileViewProps) {
  return (
    <div className="space-y-6 text-left py-2" id="profile-view-container">
      
      {/* PROFILE HEADER HERO CARD */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-violet-950/60 via-purple-900/40 to-indigo-950/60 border border-violet-500/30 relative overflow-hidden backdrop-blur-2xl shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 relative z-10">
          
          {/* Avatar */}
          <div className="relative">
            {currentUser.avatarUrl ? (
              <img 
                src={currentUser.avatarUrl} 
                alt={currentUser.username} 
                className="w-24 h-24 rounded-full object-cover border-4 border-violet-400/50 shadow-[0_0_25px_rgba(124,58,237,0.4)]"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-violet-600 via-purple-600 to-indigo-600 flex items-center justify-center text-3xl font-bold font-display text-white border-4 border-violet-400/50 shadow-[0_0_25px_rgba(124,58,237,0.4)]">
                {currentUser.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute bottom-1 right-1 p-1.5 rounded-full bg-[#0d091f] border border-emerald-400 text-emerald-400 shadow-md" title="Identity Isolated">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white tracking-wide">
                @{currentUser.username}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-400" /> Isolated
              </span>
            </div>

            <p className="text-xs text-white/70 max-w-xl leading-relaxed">
              {currentUser.bio || 'Anonymous participant on the INCOGNITO zero-knowledge privacy network.'}
            </p>

            {/* Badges */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
              {(currentUser.badges || ['Founding Member', 'Privacy Architect']).map((badge, idx) => (
                <span 
                  key={idx} 
                  className="px-2.5 py-1 rounded-xl bg-violet-500/20 border border-violet-400/30 text-violet-200 text-[10px] font-bold flex items-center gap-1 shadow-sm"
                >
                  <Award className="w-3 h-3 text-violet-300" />
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* Karma Score & Settings Button */}
          <div className="flex sm:flex-col items-center justify-between sm:justify-center gap-3 bg-black/30 p-4 rounded-2xl border border-white/10 w-full sm:w-auto">
            <div className="text-center">
              <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold block">Total Karma</span>
              <div className="flex items-center justify-center gap-1.5 text-lg font-extrabold font-mono text-amber-300 mt-0.5">
                <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
                {(currentUser.karma || 12480).toLocaleString()}
              </div>
            </div>

            <button
              onClick={onOpenSettings}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-white/10"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Vault</span>
            </button>
          </div>

        </div>
      </div>

      {/* USER'S POSTED BROADCASTS */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          Your Broadcast History ({userPosts.length})
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
              onTriggerToast={onTriggerToast}
            />
          ))
        ) : (
          <div className="p-8 rounded-3xl bg-[#0d091f]/80 border border-white/10 text-center text-white/40">
            <p className="text-xs">You haven't posted any broadcasts yet.</p>
          </div>
        )}
      </div>

    </div>
  );
}
