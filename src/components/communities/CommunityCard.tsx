/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Users, Check, Plus, Flame, TrendingUp } from 'lucide-react';
import { Community } from '../../types';

interface CommunityCardProps {
  key?: React.Key;
  community: Community;
  onSelect: (community: Community) => void;
  onToggleJoin: (community: Community, e: React.MouseEvent) => void;
}

export default function CommunityCard({
  community,
  onSelect,
  onToggleJoin
}: CommunityCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(community)}
      className="p-4 rounded-2xl bg-gradient-to-b from-white/[0.05] to-black/40 border border-cyan-500/20 hover:border-cyan-500/50 backdrop-blur-xl relative overflow-hidden group cursor-pointer transition-all shadow-[0_10px_30px_rgba(0,0,0,0.3)] flex flex-col justify-between text-left"
    >
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-600/15 rounded-full blur-2xl group-hover:bg-cyan-500/25 transition-all pointer-events-none" />

      <div>
        {community.bannerUrl && (
          <div className="h-16 w-full rounded-xl overflow-hidden mb-3 relative bg-black/60 border border-white/10">
            <img src={community.bannerUrl} alt={community.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          </div>
        )}

        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-3">
            <div className="relative">
              {community.iconUrl ? (
                <img
                  src={community.iconUrl}
                  alt={community.name}
                  className="w-11 h-11 rounded-2xl object-cover border-2 border-cyan-500/30 shadow-[0_0_15px_rgba(0,217,255,0.25)] group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-500 to-cyan-500 flex items-center justify-center font-bold text-white border-2 border-cyan-400/30 text-base shadow-[0_0_15px_rgba(0,217,255,0.25)] font-mono">
                  c/{community.handle.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <h4 className="text-sm font-bold text-white truncate group-hover:text-cyan-200 transition-colors">
                {community.name}
              </h4>
              <p className="text-[11px] font-mono font-bold text-cyan-400 flex items-center gap-1">
                <span>c/{community.handle}</span>
              </p>
            </div>
          </div>

          <button
            onClick={(e) => onToggleJoin(community, e)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              community.isJoined
                ? 'bg-blue-600/20 text-cyan-300 border border-cyan-500/40 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40'
                : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-[0_0_15px_rgba(22,119,255,0.3)]'
            }`}
          >
            {community.isJoined ? (
              <>
                <Check className="w-3.5 h-3.5 text-cyan-300" />
                <span>Joined</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 text-white" />
                <span>Join</span>
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-white/70 line-clamp-2 leading-relaxed mb-3">
          {community.description}
        </p>
      </div>

      <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-[10.5px] text-white/50 font-medium">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-cyan-300/80 font-mono">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>{(community.memberCount || 0).toLocaleString()} members</span>
          </span>

          <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/60 font-medium">
            {community.category}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {community.isPopular && (
            <span className="p-1 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-300" title="Popular Community">
              <Flame className="w-3 h-3 text-amber-400" />
            </span>
          )}
          {community.isTrending && (
            <span className="p-1 rounded-md bg-cyan-500/20 border border-cyan-500/30 text-cyan-300" title="Trending Community">
              <TrendingUp className="w-3 h-3 text-cyan-400" />
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
