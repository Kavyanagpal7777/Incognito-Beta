/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Lock, 
  Filter, 
  Flame, 
  Clock, 
  TrendingUp,
  Search,
  MessageSquare
} from 'lucide-react';
import { Post, UserAccount } from '../types';
import PostCard from './PostCard';
import { COMMUNITIES } from '../data/mockData';

interface PublicFeedProps {
  currentUser: UserAccount;
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  onTriggerToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  searchQuery: string;
  isAnonymousMode: boolean;
  onViewUserProfile?: (username: string) => void;
  onDeletePost?: (postId: string) => void;
}

export const CATEGORY_TABS = [
  { id: 'all', name: 'All' },
  { id: 'Funny', name: '😂 Funny' },
  { id: 'Memes', name: '🤣 Memes' },
  { id: 'Confessions', name: '💬 Confessions' },
  { id: 'Gaming', name: '🎮 Gaming' },
  { id: 'Technology', name: '💻 Technology' }
];

export default function PublicFeed({
  currentUser,
  posts,
  setPosts,
  onTriggerToast,
  searchQuery,
  isAnonymousMode,
  onViewUserProfile,
  onDeletePost
}: PublicFeedProps) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [feedSort, setFeedSort] = useState<'latest' | 'trending'>('latest');

  // Handle New Post Creation
  const handlePostCreated = (newPost: Post) => {
    setPosts(prev => [newPost, ...prev]);
    fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPost)
    }).catch(err => console.error('Error posting to server:', err));
  };

  // Upvote Handler
  const handleUpvote = (postId: string) => {
    setPosts(prev => 
      prev.map(post => {
        if (post.id === postId) {
          const isUpvotedNow = !post.isUpvoted;
          return {
            ...post,
            upvotes: isUpvotedNow ? post.upvotes + 1 : post.upvotes - 1,
            isUpvoted: isUpvotedNow
          };
        }
        return post;
      })
    );
    fetch(`/api/posts/${postId}/upvote`, { method: 'POST' })
      .catch(err => console.error('Error upvoting on server:', err));
  };

  // Save / Bookmark Handler
  const handleSave = (postId: string) => {
    setPosts(prev => 
      prev.map(post => {
        if (post.id === postId) {
          const isSavedNow = !post.isSaved;
          if (isSavedNow) {
            onTriggerToast('Post bookmarked to your encrypted vault.', 'success');
          }
          return {
            ...post,
            isSaved: isSavedNow
          };
        }
        return post;
      })
    );
  };

  // Add Comment Handler
  const handleAddComment = (postId: string, commentContent: string) => {
    const newComment = {
      id: `comment_${Date.now()}`,
      username: isAnonymousMode ? 'Anonymous_Ghost' : currentUser.username,
      content: commentContent,
      timestamp: 'Just now'
    };

    setPosts(prev => 
      prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: [...post.comments, newComment]
          };
        }
        return post;
      })
    );

    fetch(`/api/posts/${postId}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newComment)
    }).catch(err => console.error('Error adding comment on server:', err));

    onTriggerToast('Comment posted anonymously!', 'success');
  };

  // Poll Vote Handler (Toggleable, vote change, immediate UI update)
  const handleVotePoll = async (postId: string, optionId: string) => {
    // Optimistic UI update
    setPosts(prev => 
      prev.map(post => {
        if (post.id === postId && post.poll) {
          const currentPoll = post.poll;
          const isTogglingOff = currentPoll.userVotedId === optionId;
          const isChangingVote = Boolean(currentPoll.userVotedId && currentPoll.userVotedId !== optionId);

          let updatedOptions = [...currentPoll.options];
          let updatedTotalVotes = currentPoll.totalVotes || 0;
          let newUserVotedId: string | undefined = optionId;

          if (isTogglingOff) {
            // Remove vote
            updatedOptions = updatedOptions.map(opt => {
              if (opt.id === optionId) return { ...opt, votes: Math.max(0, (opt.votes || 0) - 1) };
              return opt;
            });
            updatedTotalVotes = Math.max(0, updatedTotalVotes - 1);
            newUserVotedId = undefined;
          } else if (isChangingVote) {
            // Switch vote from previous option to new option
            updatedOptions = updatedOptions.map(opt => {
              if (opt.id === optionId) return { ...opt, votes: (opt.votes || 0) + 1 };
              if (opt.id === currentPoll.userVotedId) return { ...opt, votes: Math.max(0, (opt.votes || 0) - 1) };
              return opt;
            });
            // Total votes remains constant on vote change
            newUserVotedId = optionId;
          } else {
            // First time voting
            updatedOptions = updatedOptions.map(opt => {
              if (opt.id === optionId) return { ...opt, votes: (opt.votes || 0) + 1 };
              return opt;
            });
            updatedTotalVotes = updatedTotalVotes + 1;
            newUserVotedId = optionId;
          }

          return {
            ...post,
            poll: {
              ...currentPoll,
              userVotedId: newUserVotedId,
              totalVotes: updatedTotalVotes,
              options: updatedOptions
            }
          };
        }
        return post;
      })
    );

    try {
      const res = await fetch(`/api/posts/${postId}/poll`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || ''
        },
        body: JSON.stringify({ optionId })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.post) {
        setPosts(prev => 
          prev.map(p => {
            if (p.id === postId && data.post?.poll) {
              return {
                ...p,
                poll: {
                  ...data.post.poll,
                  userVotedId: data.userVotedId !== undefined ? (data.userVotedId || undefined) : data.post.poll.userVotedId
                }
              };
            }
            return p;
          })
        );
      }
    } catch (err) {
      console.error('Error recording poll vote on server:', err);
    }
  };

  // Report Handler
  const handleReportPost = (postId: string) => {
    onTriggerToast('Post flagged for community moderation review.', 'info');
  };

  // Delete Post Handler
  const handleDeletePost = async (postId: string) => {
    if (onDeletePost) {
      onDeletePost(postId);
      return;
    }

    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': currentUser?.id || ''
        }
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.success === false) {
        if (res.status === 404 || data.error === 'POST_NOT_FOUND') {
          setPosts(prev => {
            const updated = prev.filter(p => p.id !== postId);
            localStorage.setItem('incognito_posts', JSON.stringify(updated));
            return updated;
          });
        }
        onTriggerToast('Unable to delete post. Please try again.', 'error');
        return;
      }

      setPosts(prev => {
        const updated = prev.filter(p => p.id !== postId);
        localStorage.setItem('incognito_posts', JSON.stringify(updated));
        localStorage.setItem('aetheris_posts', JSON.stringify(updated));
        return updated;
      });
      onTriggerToast('Post deleted successfully.', 'info');
    } catch (err) {
      console.error('Error deleting post on server:', err);
      onTriggerToast('Unable to delete post. Please try again.', 'error');
    }
  };

  // FILTERING LOGIC
  const isMatchCategory = (post: Post, catName: string) => {
    if (catName === 'all' || catName === 'All') return true;
    const cleanCat = catName.replace(/[^\w]/g, '').toLowerCase(); // "funny", "memes", "confessions", "gaming", "technology"
    const postComm = (post.community || '').toLowerCase();
    const postTitle = (post.title || '').toLowerCase();
    const postContent = (post.content || '').toLowerCase();
    const postTags = (post.tags || []).map(t => t.toLowerCase());

    return (
      postComm.includes(cleanCat) ||
      catName.toLowerCase().includes(postComm) ||
      postTags.some(t => t.includes(cleanCat)) ||
      postTitle.includes(cleanCat) ||
      postContent.includes(cleanCat)
    );
  };

  const filteredPosts = posts.filter(post => {
    // 1. Category Filter (Applied when not in Trending mode)
    if (feedSort !== 'trending') {
      if (selectedCategory !== 'all' && selectedCategory !== 'All') {
        if (!isMatchCategory(post, selectedCategory)) {
          return false;
        }
      }
    }
    // 2. Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = post.title?.toLowerCase().includes(q);
      const matchContent = post.content.toLowerCase().includes(q);
      const matchUser = post.username.toLowerCase().includes(q);
      const matchComm = post.community.toLowerCase().includes(q);
      const matchTag = post.tags?.some(t => t.toLowerCase().includes(q));
      return matchTitle || matchContent || matchUser || matchComm || matchTag;
    }
    return true;
  }).sort((a, b) => {
    if (feedSort === 'trending') {
      return b.upvotes - a.upvotes;
    }
    return 0; // default latest
  });

  return (
    <div className="space-y-4" id="incognito-public-feed">
      
      {/* CATEGORY TABS FILTER & SORT BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-2 border-y border-white/10" id="community-filter-bar">
        
        {/* Category Horizontal Pill Tabs - Hidden when Trending option is selected */}
        {feedSort !== 'trending' ? (
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar no-scrollbar pb-1 max-w-full" id="feed-category-tabs-bar">
            {CATEGORY_TABS.map((cat) => {
              const isSelected = selectedCategory === cat.name || selectedCategory === cat.id;
              return (
                <motion.button
                  key={cat.id}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setSelectedCategory(cat.id === 'all' ? 'all' : cat.name)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer border flex items-center gap-1.5 ${
                    isSelected 
                      ? 'bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 border-cyan-400 text-white shadow-[0_0_15px_rgba(0,217,255,0.4)]' 
                      : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-white/60 hover:text-white backdrop-blur-md'
                  }`}
                  id={`category-tab-${cat.id.toLowerCase()}`}
                >
                  <span>{cat.name}</span>
                </motion.button>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300/90 py-1.5 px-3.5 rounded-full bg-amber-500/10 border border-amber-500/20">
            <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Trending Broadcasts Across All Networks</span>
          </div>
        )}

        {/* Sort Toggles in Original Position */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs ml-auto flex-shrink-0">
          <button
            onClick={() => setFeedSort('latest')}
            className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
              feedSort === 'latest' ? 'bg-cyan-600 text-white shadow-sm' : 'text-white/40 hover:text-white'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Latest</span>
          </button>
          <button
            onClick={() => setFeedSort('trending')}
            className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
              feedSort === 'trending' ? 'bg-cyan-600 text-white shadow-sm' : 'text-white/40 hover:text-white'
            }`}
          >
            <Flame className="w-3 h-3 text-amber-400" />
            <span>Trending</span>
          </button>
        </div>

      </div>

      {/* POSTS FEED LIST */}
      <div className="space-y-4" id="posts-list-main">
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              onUpvote={handleUpvote}
              onSave={handleSave}
              onAddComment={handleAddComment}
              onVotePoll={handleVotePoll}
              onReportPost={handleReportPost}
              onDeletePost={handleDeletePost}
              onViewUserProfile={onViewUserProfile}
              onTriggerToast={onTriggerToast}
            />
          ))
        ) : (
          <div className="p-12 rounded-3xl bg-[#080d1a]/80 border border-white/10 text-center space-y-3">
            <Search className="w-8 h-8 text-cyan-400 mx-auto opacity-50" />
            <h4 className="text-sm font-bold text-white">No broadcasts found</h4>
            <p className="text-xs text-white/50 max-w-sm mx-auto">
              No posts matched your current search query or community filter. Try clearing filters or create a new post above!
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
