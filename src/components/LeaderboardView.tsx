/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Crown, 
  ShieldCheck, 
  Zap, 
  Search, 
  Award,
  Clock,
  RotateCw,
  TrendingUp,
  TrendingDown,
  Minus,
  History,
  Bell,
  X,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Calendar,
  Layers,
  Info
} from 'lucide-react';
import { LeaderboardUser, UserAccount, LeaderboardSnapshot, LeaderboardState } from '../types';
import UserBadgesList from './UserBadgesList';

interface LeaderboardViewProps {
  currentUser: UserAccount;
  onViewUserProfile?: (username: string) => void;
}

export default function LeaderboardView({ currentUser, onViewUserProfile }: LeaderboardViewProps) {
  const [activeTab, setActiveTab] = useState<'standings' | 'history'>('standings');
  const [search, setSearch] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('');
  const [nextRefreshAt, setNextRefreshAt] = useState<string>('');
  const [userRankInfo, setUserRankInfo] = useState<LeaderboardState['userRankInfo']>(undefined);
  const [snapshots, setSnapshots] = useState<LeaderboardSnapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<LeaderboardSnapshot | null>(null);
  
  const [timeRemaining, setTimeRemaining] = useState<{ hours: number; minutes: number; seconds: number }>({ hours: 0, minutes: 0, seconds: 0 });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isForceRefreshing, setIsForceRefreshing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dismissedNotification, setDismissedNotification] = useState<boolean>(false);

  // Fetch Leaderboard state from backend
  const fetchLeaderboard = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/leaderboard?username=${encodeURIComponent(currentUser.username)}`, {
        headers: {
          'x-user-id': currentUser.id
        }
      });
      const data = await res.json();
      if (data.success) {
        setLeaderboard(data.officialLeaderboard || []);
        setLastRefreshedAt(data.lastRefreshedAt || new Date().toISOString());
        setNextRefreshAt(data.nextRefreshAt || new Date(Date.now() + 12 * 3600 * 1000).toISOString());
        setUserRankInfo(data.userRankInfo);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard from server:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Snapshots history
  const fetchSnapshots = async () => {
    try {
      const res = await fetch('/api/leaderboard/snapshots');
      const data = await res.json();
      if (data.success) {
        setSnapshots(data.snapshots || []);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard snapshots:', err);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    fetchSnapshots();
  }, [currentUser.username]);

  // Live countdown timer to next 12-hour refresh
  useEffect(() => {
    if (!nextRefreshAt) return;

    const timer = setInterval(() => {
      const nowMs = Date.now();
      const targetMs = new Date(nextRefreshAt).getTime();
      const diffSecs = Math.max(0, Math.floor((targetMs - nowMs) / 1000));

      if (diffSecs <= 0) {
        fetchLeaderboard(); // Auto-refetch when countdown hits zero
      }

      const hours = Math.floor(diffSecs / 3600);
      const minutes = Math.floor((diffSecs % 3600) / 60);
      const seconds = diffSecs % 60;

      setTimeRemaining({ hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(timer);
  }, [nextRefreshAt]);

  // Admin Force Refresh trigger
  const handleForceRefresh = async () => {
    try {
      setIsForceRefreshing(true);
      const res = await fetch('/api/admin/leaderboard/force-refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        }
      });
      const data = await res.json();
      if (data.success) {
        setLeaderboard(data.officialLeaderboard || []);
        setLastRefreshedAt(data.lastRefreshedAt);
        setNextRefreshAt(data.nextRefreshAt);
        setToastMessage('⚡ Leaderboard successfully force-refreshed! New snapshot generated.');
        fetchSnapshots();
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        setToastMessage(`Failed: ${data.message || 'Error executing force refresh'}`);
      }
    } catch (err) {
      console.error('Error force refreshing leaderboard:', err);
    } finally {
      setIsForceRefreshing(false);
    }
  };

  // Dismiss Rank Notification
  const handleDismissNotification = async () => {
    setDismissedNotification(true);
    try {
      await fetch('/api/leaderboard/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser.username })
      });
    } catch (e) {
      // Ignore
    }
  };

  const filteredUsers = leaderboard.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.topCommunity.toLowerCase().includes(search.toLowerCase())
  );

  const top1 = leaderboard[0];
  const top2 = leaderboard[1];
  const top3 = leaderboard[2];

  const isStaffAdmin = currentUser.role === 'owner' || currentUser.role === 'super_admin' || currentUser.email === 'kavyanagpal0005@gmail.com';

  const formatTimestamp = (isoString: string) => {
    if (!isoString) return 'Pending Calculation';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' }) + 
           ', ' + date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-6 text-left py-2" id="leaderboard-view-container">
      
      {/* TOAST ALERT */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center justify-between shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* USER RANK CHANGE NOTIFICATION BANNER */}
      {userRankInfo?.notification && !userRankInfo.notification.read && !dismissedNotification && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-2xl bg-gradient-to-r from-violet-600/30 via-purple-600/20 to-indigo-600/30 border border-violet-400/50 shadow-[0_0_25px_rgba(168,85,247,0.25)] flex items-center justify-between gap-4 backdrop-blur-xl"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-400/30">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                Official Leaderboard Update
                <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              </h4>
              <p className="text-xs text-violet-100 mt-0.5 font-medium">
                {userRankInfo.notification.message}
              </p>
            </div>
          </div>

          <button
            onClick={handleDismissNotification}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs text-white font-bold transition-all shrink-0"
          >
            Acknowledge
          </button>
        </motion.div>
      )}

      {/* HEADER BANNER */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-violet-950/50 via-purple-900/40 to-indigo-950/50 border border-violet-500/30 relative overflow-hidden backdrop-blur-xl space-y-4">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display text-white tracking-wide flex items-center gap-2">
                Global Karma Leaderboard
              </h2>
              <p className="text-xs text-white/60 mt-0.5">
                Refreshed on a strict 12-hour server schedule (00:00 & 12:00 UTC). Real-time karma locks to rank at cycle end.
              </p>
            </div>
          </div>

          {/* ADMIN FORCE REFRESH CONTROL */}
          {isStaffAdmin && (
            <button
              onClick={handleForceRefresh}
              disabled={isForceRefreshing}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500/20 to-violet-600/30 border border-amber-400/40 hover:border-amber-400 text-amber-200 text-xs font-bold flex items-center gap-2 transition-all shrink-0 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 text-amber-300 ${isForceRefreshing ? 'animate-spin' : ''}`} />
              {isForceRefreshing ? 'Recalculating Ranks...' : '⚡ Force Refresh (Admin)'}
            </button>
          )}
        </div>

        {/* TIMERS & SCHEDULE BAR */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-white/10">
          
          {/* COUNTDOWN TIMER */}
          <div className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-500/20 text-violet-300">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-white/50 tracking-wider">Next Scheduled Refresh</span>
              <div className="text-sm font-mono font-extrabold text-amber-300 flex items-center gap-1.5">
                <span>{String(timeRemaining.hours).padStart(2, '0')}h</span>
                <span>:</span>
                <span>{String(timeRemaining.minutes).padStart(2, '0')}m</span>
                <span>:</span>
                <span>{String(timeRemaining.seconds).padStart(2, '0')}s</span>
                <span className="text-[10px] text-white/40 font-normal font-sans">(12h UTC Cycle)</span>
              </div>
            </div>
          </div>

          {/* LAST UPDATED TIMESTAMP */}
          <div className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-white/50 tracking-wider">Last Official Standing Update</span>
              <div className="text-xs font-mono font-bold text-white/90">
                {formatTimestamp(lastRefreshedAt)}
              </div>
            </div>
          </div>

        </div>

        {/* TABS SELECTOR */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => setActiveTab('standings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'standings'
                ? 'bg-violet-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                : 'bg-black/30 text-white/60 hover:text-white hover:bg-black/50 border border-white/5'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            Official Standings
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'history'
                ? 'bg-violet-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                : 'bg-black/30 text-white/60 hover:text-white hover:bg-black/50 border border-white/5'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Historical Snapshots ({snapshots.length})
          </button>
        </div>

      </div>

      {activeTab === 'standings' ? (
        <>
          {/* PODIUM FOR TOP 3 MEMBERS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            
            {/* RANK 2 - SILVER */}
            {top2 && (
              <motion.div 
                whileHover={{ y: -4 }}
                onClick={() => onViewUserProfile?.(top2.username)}
                className="p-5 rounded-3xl bg-gradient-to-b from-gray-400/10 via-black/30 to-black/50 border border-slate-300/30 backdrop-blur-2xl relative overflow-hidden text-center flex flex-col items-center justify-between shadow-xl sm:order-1 cursor-pointer hover:border-slate-300/60 transition-all"
              >
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-slate-300/20 text-slate-200 text-[10px] font-extrabold uppercase">
                  #2 SILVER
                </div>
                <div className="relative mt-2">
                  <img src={top2.avatarUrl} alt={top2.username} className="w-16 h-16 rounded-full object-cover border-2 border-slate-300 shadow-lg" />
                  <div className="absolute -top-2 -right-2 p-1 rounded-full bg-slate-300 text-slate-900 font-bold text-xs">
                    🥈
                  </div>
                </div>
                <div className="my-3 flex flex-col items-center gap-1">
                  <h4 className="font-bold text-sm text-white flex items-center justify-center gap-1 hover:underline">
                    @{top2.username}
                    {top2.verified && <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />}
                  </h4>

                  {top2.leaderTitle && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/40 text-[9px] font-extrabold text-amber-300 uppercase tracking-wide">
                      {top2.leaderTitle}
                    </span>
                  )}

                  <UserBadgesList
                    role={(top2 as any).role || (top2.username === 'ShadowNova' ? 'moderator' : 'user')}
                    karma={top2.karma}
                    leaderboardRank={2}
                    isOgMember={(top2 as any).isOgMember}
                    size="xs"
                  />
                  <span className="text-[10px] text-white/50">{top2.topCommunity}</span>
                </div>
                <div className="px-3 py-1 rounded-full bg-slate-300/10 border border-slate-300/20 text-xs font-bold text-slate-200 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  {top2.karma.toLocaleString()} Karma
                </div>
              </motion.div>
            )}

            {/* RANK 1 - GOLD (CENTER / TALLEST) */}
            {top1 && (
              <motion.div 
                whileHover={{ y: -6 }}
                onClick={() => onViewUserProfile?.(top1.username)}
                className="p-6 rounded-3xl bg-gradient-to-b from-amber-500/20 via-violet-950/40 to-black/60 border border-amber-400/50 backdrop-blur-2xl relative overflow-hidden text-center flex flex-col items-center justify-between shadow-[0_10px_40px_rgba(245,158,11,0.25)] sm:-mt-3 sm:order-2 cursor-pointer hover:border-amber-400 transition-all"
              >
                <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-300" />
                  #1 GOLD
                </div>
                <div className="relative mt-2">
                  <img src={top1.avatarUrl} alt={top1.username} className="w-20 h-20 rounded-full object-cover border-2 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)]" />
                  <div className="absolute -top-2 -right-2 p-1.5 rounded-full bg-amber-400 text-amber-950 font-bold text-xs shadow-md">
                    👑
                  </div>
                </div>
                <div className="my-3 flex flex-col items-center gap-1">
                  <h4 className="font-extrabold text-base text-white flex items-center justify-center gap-1 hover:underline">
                    @{top1.username}
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                  </h4>

                  {top1.leaderTitle && (
                    <span className="px-2.5 py-0.5 rounded-md bg-amber-400/30 border border-amber-400/60 text-[10px] font-extrabold text-amber-200 uppercase tracking-wide flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" />
                      {top1.leaderTitle}
                    </span>
                  )}

                  <UserBadgesList
                    role={(top1 as any).role || (top1.username === 'VoidCipher' ? 'owner' : 'user')}
                    karma={top1.karma}
                    leaderboardRank={1}
                    isOgMember={true}
                    size="xs"
                  />
                  <span className="text-[10.5px] text-amber-200/80 font-medium">{top1.topCommunity}</span>
                </div>
                <div className="px-4 py-1.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-sm font-extrabold text-amber-200 flex items-center gap-1.5 shadow-md">
                  <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                  {top1.karma.toLocaleString()} Karma
                </div>
              </motion.div>
            )}

            {/* RANK 3 - BRONZE */}
            {top3 && (
              <motion.div 
                whileHover={{ y: -4 }}
                onClick={() => onViewUserProfile?.(top3.username)}
                className="p-5 rounded-3xl bg-gradient-to-b from-amber-700/10 via-black/30 to-black/50 border border-amber-600/30 backdrop-blur-2xl relative overflow-hidden text-center flex flex-col items-center justify-between shadow-xl sm:order-3 cursor-pointer hover:border-amber-600/60 transition-all"
              >
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-700/20 text-amber-300 text-[10px] font-extrabold uppercase">
                  #3 BRONZE
                </div>
                <div className="relative mt-2">
                  <img src={top3.avatarUrl} alt={top3.username} className="w-16 h-16 rounded-full object-cover border-2 border-amber-600 shadow-lg" />
                  <div className="absolute -top-2 -right-2 p-1 rounded-full bg-amber-700 text-white font-bold text-xs">
                    🥉
                  </div>
                </div>
                <div className="my-3 flex flex-col items-center gap-1">
                  <h4 className="font-bold text-sm text-white flex items-center justify-center gap-1 hover:underline">
                    @{top3.username}
                    {top3.verified && <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />}
                  </h4>

                  {top3.leaderTitle && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/40 text-[9px] font-extrabold text-amber-300 uppercase tracking-wide">
                      {top3.leaderTitle}
                    </span>
                  )}

                  <UserBadgesList
                    role={(top3 as any).role || 'user'}
                    karma={top3.karma}
                    leaderboardRank={3}
                    isOgMember={(top3 as any).isOgMember}
                    size="xs"
                  />
                  <span className="text-[10px] text-white/50">{top3.topCommunity}</span>
                </div>
                <div className="px-3 py-1 rounded-full bg-slate-300/10 border border-slate-300/20 text-xs font-bold text-slate-200 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  {top3.karma.toLocaleString()} Karma
                </div>
              </motion.div>
            )}

          </div>

          {/* SEARCH & LEADERBOARD TABLE */}
          <div className="p-5 rounded-3xl bg-[#0d091f]/80 border border-violet-500/20 backdrop-blur-2xl space-y-4 shadow-xl">
            
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4 text-violet-400" />
                Official Scheduled Ranks
              </h3>

              <div className="relative w-48 sm:w-64">
                <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search user..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white outline-none focus:border-violet-500"
                />
              </div>
            </div>

            {/* INFORMATIONAL NOTICE */}
            <div className="p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-xs text-violet-200/80 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
              <span>
                <strong>Fixed Window Rule</strong>: Positions remain locked throughout the 12-hour interval. Earning or spending Karma in real time updates your profile, and determines your rank on the next 12-hour refresh.
              </span>
            </div>

            {/* LIST */}
            <div className="space-y-2">
              {filteredUsers.map((user) => {
                const isSelf = user.username === currentUser.username;

                // Rank Change formatting
                let rankChangeBadge = null;
                if (user.rankChange !== undefined) {
                  if (user.rankChange > 0) {
                    rankChangeBadge = (
                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-extrabold flex items-center gap-0.5">
                        <TrendingUp className="w-2.5 h-2.5" />
                        +{user.rankChange}
                      </span>
                    );
                  } else if (user.rankChange < 0) {
                    rankChangeBadge = (
                      <span className="px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-extrabold flex items-center gap-0.5">
                        <TrendingDown className="w-2.5 h-2.5" />
                        {user.rankChange}
                      </span>
                    );
                  } else {
                    rankChangeBadge = (
                      <span className="px-1.5 py-0.5 rounded-md bg-white/5 text-white/40 text-[9px] font-mono font-bold flex items-center gap-0.5">
                        <Minus className="w-2.5 h-2.5" />
                        0
                      </span>
                    );
                  }
                } else {
                  rankChangeBadge = (
                    <span className="px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-extrabold">
                      NEW
                    </span>
                  );
                }

                return (
                  <div 
                    key={user.rank}
                    onClick={() => onViewUserProfile?.(user.username)}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      isSelf 
                        ? 'bg-violet-600/20 hover:bg-violet-600/30 border-violet-400/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
                        : 'bg-black/20 hover:bg-black/40 border-white/5 hover:border-violet-400/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold font-mono ${
                          user.rank === 1 ? 'bg-amber-400 text-amber-950 font-extrabold' :
                          user.rank === 2 ? 'bg-slate-300 text-slate-900 font-extrabold' :
                          user.rank === 3 ? 'bg-amber-700 text-amber-100 font-extrabold' : 'bg-white/5 text-white/60'
                        }`}>
                          #{user.rank}
                        </span>
                        {rankChangeBadge}
                      </div>

                      <img src={user.avatarUrl} alt={user.username} className="w-9 h-9 rounded-full object-cover border border-white/10" />

                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-white hover:text-violet-300 hover:underline">@{user.username}</span>
                          
                          {isSelf && (
                            <span className="px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-200 border border-violet-500/30 text-[8px] font-extrabold uppercase">
                              You
                            </span>
                          )}

                          {user.leaderTitle && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[9px] font-extrabold uppercase">
                              {user.leaderTitle}
                            </span>
                          )}

                          <UserBadgesList
                            role={(user as any).role || (user.username === 'VoidCipher' ? 'owner' : user.username === 'ShadowNova' ? 'moderator' : 'user')}
                            karma={user.karma}
                            leaderboardRank={user.rank}
                            isOgMember={user.username === 'VoidCipher' || (user as any).isOgMember}
                            size="xs"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-white/40">{user.topCommunity}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 font-mono font-bold text-xs text-amber-300">
                      <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      {user.karma.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </>
      ) : (
        /* HISTORICAL SNAPSHOTS VIEW */
        <div className="p-6 rounded-3xl bg-[#0d091f]/80 border border-violet-500/20 backdrop-blur-2xl space-y-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-violet-400" />
                Historical Leaderboard Snapshots
              </h3>
              <p className="text-xs text-white/60 mt-0.5">
                Immutable record of top participants and historical rankings generated every 12 hours.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {snapshots.map((snap, idx) => (
              <motion.div
                key={snap.id}
                whileHover={{ scale: 1.01 }}
                onClick={() => setSelectedSnapshot(snap)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  selectedSnapshot?.id === snap.id 
                    ? 'bg-violet-600/20 border-violet-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                    : 'bg-black/30 hover:bg-black/50 border-white/10 hover:border-violet-500/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[10px] font-extrabold uppercase tracking-wide">
                    Cycle #{snapshots.length - idx}
                  </span>
                  <span className="text-[10px] text-white/50 font-mono">
                    {new Date(snap.timestamp).toLocaleDateString()}
                  </span>
                </div>

                <div className="text-xs font-bold text-white flex items-center gap-1.5 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  {snap.refreshCycle}
                </div>

                <div className="text-[11px] text-white/60 mb-3">
                  Triggered by: <span className="text-violet-300 font-semibold">{snap.triggeredBy}</span>
                </div>

                {/* TOP 3 PREVIEW */}
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
                  <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider">Top Standings Preview</span>
                  {snap.topUsers.slice(0, 3).map((u) => (
                    <div key={u.rank} className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white/90">
                        #{u.rank} @{u.username}
                      </span>
                      <span className="font-mono text-amber-300 text-[11px]">
                        {u.karma.toLocaleString()} Karma
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-violet-300 font-semibold pt-2 border-t border-white/5">
                  <span>View Full Snapshot</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </motion.div>
            ))}
          </div>

          {/* SNAPSHOT DETAIL MODAL */}
          <AnimatePresence>
            {selectedSnapshot && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-[#0f0b24] border border-violet-500/40 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl relative"
                >
                  <button 
                    onClick={() => setSelectedSnapshot(null)}
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <History className="w-5 h-5 text-amber-400" />
                      Leaderboard Snapshot Record
                    </h3>
                    <p className="text-xs text-white/60 mt-0.5">
                      {selectedSnapshot.refreshCycle} ({selectedSnapshot.triggeredBy})
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl bg-black/40 border border-white/10">
                      <span className="text-[10px] uppercase font-bold text-white/40">Total Participants</span>
                      <div className="text-base font-bold text-white mt-0.5">{selectedSnapshot.totalParticipants} Accounts</div>
                    </div>

                    <div className="p-3 rounded-2xl bg-black/40 border border-white/10">
                      <span className="text-[10px] uppercase font-bold text-white/40">Top Cycle Gainer</span>
                      <div className="text-xs font-bold text-emerald-300 mt-0.5">
                        @{selectedSnapshot.topGainer?.username} (+{selectedSnapshot.topGainer?.karmaGain} Karma)
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Top Ranked Accounts</span>
                    {selectedSnapshot.topUsers.map((u) => (
                      <div key={u.rank} className="p-2.5 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-400">#{u.rank}</span>
                          <span className="font-bold text-white">@{u.username}</span>
                          {u.leaderTitle && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[8px] font-bold">
                              {u.leaderTitle}
                            </span>
                          )}
                        </div>
                        <span className="font-mono font-bold text-amber-300">
                          {u.karma.toLocaleString()} Karma
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 text-center">
                    <button
                      onClick={() => setSelectedSnapshot(null)}
                      className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold w-full transition-all"
                    >
                      Close Snapshot Viewer
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </div>
      )}

    </div>
  );
}
