/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Search,
  Plus,
  Flame,
  TrendingUp,
  Sparkles,
  Compass,
  Check,
  Shield,
  Loader2,
  Filter
} from 'lucide-react';
import { Community, UserAccount } from '../../types';
import CommunityCard from './CommunityCard';
import CreateCommunityModal from './CreateCommunityModal';
import CommunityDetail from './CommunityDetail';

interface CommunitiesViewProps {
  currentUser: UserAccount;
  onTriggerToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onSelectUser: (username: string) => void;
}

export default function CommunitiesView({
  currentUser,
  onTriggerToast,
  onSelectUser
}: CommunitiesViewProps) {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'discover' | 'joined' | 'popular'>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Selected community detail view
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);

  // Modal toggle
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchCommunities = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/communities', {
        headers: {
          'x-user-id': currentUser.id,
          'x-username': currentUser.username
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCommunities(data.communities || []);
        if (data.categories) {
          setCategories(['All', ...data.categories]);
        }
      }
    } catch (err) {
      console.error(err);
      onTriggerToast('Failed to load communities.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunities();
  }, []);

  const handleToggleJoin = async (comm: Community, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    try {
      const res = await fetch(`/api/communities/${comm.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-username': currentUser.username
        }
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const isJoined = data.isJoined;
        const newCount = data.memberCount;

        setCommunities(prev => prev.map(c => {
          if (c.id === comm.id) {
            return {
              ...c,
              isJoined,
              memberCount: newCount
            };
          }
          return c;
        }));

        if (selectedCommunity && selectedCommunity.id === comm.id) {
          setSelectedCommunity({
            ...selectedCommunity,
            isJoined,
            memberCount: newCount
          });
        }

        onTriggerToast(
          isJoined ? `Joined c/${comm.handle}` : `Left c/${comm.handle}`,
          isJoined ? 'success' : 'info'
        );
      }
    } catch (err) {
      console.error(err);
      onTriggerToast('Failed to update community membership.', 'error');
    }
  };

  const filteredCommunities = communities.filter(c => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesSearch = c.name.toLowerCase().includes(q) || c.handle.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    // Category filter
    if (selectedCategory !== 'All' && c.category !== selectedCategory) {
      return false;
    }

    // Tab filter
    if (activeTab === 'joined') {
      return c.isJoined;
    }
    if (activeTab === 'popular') {
      return c.isPopular || c.isTrending;
    }

    return true;
  });

  if (selectedCommunity) {
    return (
      <CommunityDetail
        community={selectedCommunity}
        currentUser={currentUser}
        onBack={() => {
          setSelectedCommunity(null);
          fetchCommunities();
        }}
        onToggleJoin={(comm) => handleToggleJoin(comm)}
        onTriggerToast={onTriggerToast}
        onSelectUser={onSelectUser}
      />
    );
  }

  return (
    <div className="space-y-6 text-left" id="communities-view-container">
      {/* BANNER HEADER */}
      <div className="relative rounded-3xl bg-gradient-to-r from-blue-950/60 via-[#0D1320] to-cyan-950/40 border border-cyan-500/25 p-6 sm:p-8 overflow-hidden backdrop-blur-2xl shadow-[0_20px_50px_rgba(22,119,255,0.2)]">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-blue-500/20 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] font-bold flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-cyan-400" /> Persistent Hubs
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] font-bold flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" /> E2E Encrypted
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
              Sub-Incognito Communities
            </h2>
            <p className="text-xs sm:text-sm text-white/70 max-w-xl mt-1.5 leading-relaxed">
              Join specialized, interest-driven circles with encrypted discussions, dedicated rules, and user moderation.
            </p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs tracking-wide shadow-[0_0_25px_rgba(22,119,255,0.4)] flex items-center justify-center gap-2 transition-all hover:scale-105 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Community</span>
          </button>
        </div>
      </div>

      {/* FILTER & TABS TOOLBAR */}
      <div className="p-4 rounded-2xl bg-[#0D1320]/80 border border-cyan-500/20 backdrop-blur-xl shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Main View Tabs */}
          <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('discover')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'discover'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-cyan-300" /> Discover All
            </button>

            <button
              onClick={() => setActiveTab('joined')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'joined'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" /> Joined Hubs
            </button>

            <button
              onClick={() => setActiveTab('popular')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'popular'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" /> Popular & Trending
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search communities by name or handle..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 text-xs outline-none focus:border-cyan-500 transition-all"
            />
          </div>
        </div>

        {/* Category Pills */}
        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pt-2 border-t border-white/10">
            <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider mr-1 flex items-center gap-1 shrink-0">
              <Filter className="w-3 h-3 text-cyan-400" /> Category:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-blue-500/25 border border-cyan-500/50 text-cyan-200'
                    : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* COMMUNITIES GRID */}
      {isLoading ? (
        <div className="p-16 text-center text-white/40 text-xs flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          <span>Fetching encrypted communities...</span>
        </div>
      ) : filteredCommunities.length === 0 ? (
        <div className="p-16 rounded-3xl bg-[#0D1320]/60 border border-cyan-500/10 text-center space-y-3">
          <Users className="w-10 h-10 text-cyan-400/40 mx-auto" />
          <h4 className="text-base font-bold text-white">No Communities Found</h4>
          <p className="text-xs text-white/50 max-w-sm mx-auto">
            {activeTab === 'joined'
              ? 'You have not joined any sub-communities yet. Discover communities and hit "Join".'
              : 'No matching community fits your search filter. Create one yourself!'}
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" /> Create a Community
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCommunities.map((comm) => (
            <CommunityCard
              key={comm.id}
              community={comm}
              onSelect={(c) => setSelectedCommunity(c)}
              onToggleJoin={(c, e) => handleToggleJoin(c, e)}
            />
          ))}
        </div>
      )}

      {/* CREATE COMMUNITY MODAL */}
      <CreateCommunityModal
        currentUser={currentUser}
        categories={categories.filter(c => c !== 'All')}
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCommunityCreated={(newComm) => {
          setCommunities([newComm, ...communities]);
          setSelectedCommunity(newComm);
        }}
        onTriggerToast={onTriggerToast}
      />
    </div>
  );
}
