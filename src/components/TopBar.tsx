/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Bell, 
  Moon, 
  Sun, 
  User, 
  ShieldCheck, 
  ShieldAlert,
  LogOut, 
  Zap, 
  KeyRound, 
  CheckCircle2, 
  X,
  Sparkles,
  Filter
} from 'lucide-react';
import { UserAccount } from '../types';

interface TopBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenCreatePost?: () => void;
  currentUser: UserAccount;
  onLogout: () => void;
  onOpenSettings: () => void;
  onNavigateTab: (tab: 'home' | 'leaderboard' | 'messages' | 'profile' | 'settings' | 'admin') => void;
  isClerkConfigured?: boolean;
  onOpenClerkSetup?: () => void;
}

export default function TopBar({
  searchQuery,
  setSearchQuery,
  onOpenCreatePost,
  currentUser,
  onLogout,
  onOpenSettings,
  onNavigateTab,
  isClerkConfigured,
  onOpenClerkSetup
}: TopBarProps) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 'n1',
      title: 'Cryptographic Handle Verified',
      desc: `Your persona @${currentUser.username} is fully isolated in ZK vault.`,
      time: '10m ago',
      read: false,
      icon: ShieldCheck,
      color: 'text-cyan-400'
    },
    {
      id: 'n2',
      title: 'Upvote Milestone Reached',
      desc: 'Your post "Why Zero-Knowledge Identity Isolation..." reached +1,400 Karma!',
      time: '1h ago',
      read: false,
      icon: Zap,
      color: 'text-amber-400'
    },
    {
      id: 'n3',
      title: 'TOTP 2FA Hardware Active',
      desc: 'Multi-factor authentication key backed up safely offline.',
      time: '1d ago',
      read: true,
      icon: KeyRound,
      color: 'text-emerald-400'
    }
  ]);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllNotificationsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  return (
    <header 
      className="sticky top-0 z-30 w-full bg-[#070B14]/85 backdrop-blur-2xl border-b border-cyan-500/15 px-4 sm:px-6 py-3 transition-all"
      id="incognito-topbar"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
        
        {/* SEARCH BAR SECTION */}
        <div className="flex-1 max-w-2xl relative" id="topbar-search-container">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posts, communities or users..."
              className="w-full pl-10 pr-10 py-2 sm:py-2.5 rounded-2xl bg-[#0D1320] border border-[#1C2A3D] text-white placeholder-white/30 text-xs sm:text-sm outline-none focus:border-blue-500/60 focus:bg-[#101827] focus:shadow-[0_0_20px_rgba(22,119,255,0.25)] transition-all"
              id="topbar-search-input"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 p-1 rounded-full text-white/40 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="hidden sm:flex absolute right-3 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono text-white/30">
                ⌘K
              </span>
            )}
          </div>
        </div>

        {/* TOPBAR ACTION BUTTONS */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0" id="topbar-actions">
          
          {/* NOTIFICATIONS DROPDOWN */}
          <div className="relative" ref={notifRef} id="topbar-notifications">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-2 sm:p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer relative"
              id="notif-trigger-btn"
            >
              <Bell className="w-4.5 h-4.5 text-cyan-300" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center border-2 border-[#070B14] shadow-[0_0_10px_rgba(244,63,94,0.6)]">
                  {unreadCount}
                </span>
              )}
            </motion.button>

            {/* Notifications Popup */}
            <AnimatePresence>
              {isNotificationsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#0D1320]/95 border border-cyan-500/30 rounded-3xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl z-50 overflow-hidden"
                  id="notifications-panel"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-cyan-400" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Encrypted Alerts
                      </h4>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsRead}
                        className="text-[10px] font-bold text-cyan-300 hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 mt-3 max-h-72 overflow-y-auto custom-scrollbar">
                    {notifications.map((n) => {
                      const Icon = n.icon;
                      return (
                        <div
                          key={n.id}
                          className={`p-3 rounded-2xl border transition-all flex items-start gap-3 ${
                            n.read 
                              ? 'bg-black/20 border-white/5 opacity-70' 
                              : 'bg-blue-950/30 border-cyan-500/30 shadow-[0_0_15px_rgba(22,119,255,0.15)]'
                          }`}
                        >
                          <div className={`p-2 rounded-xl bg-white/5 ${n.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 text-left">
                            <div className="flex items-center justify-between">
                              <h5 className="text-xs font-bold text-white">{n.title}</h5>
                              <span className="text-[9px] text-white/40">{n.time}</span>
                            </div>
                            <p className="text-[11px] text-white/60 leading-tight mt-1">{n.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* USER AVATAR & DROPDOWN */}
          <div className="relative" ref={profileRef} id="topbar-user-dropdown">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 cursor-pointer transition-all"
              id="topbar-user-avatar-btn"
            >
              {currentUser.avatarUrl ? (
                <img 
                  src={currentUser.avatarUrl} 
                  alt={currentUser.username} 
                  className="w-7 h-7 rounded-full object-cover border border-cyan-400/50" 
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-xs font-bold font-display text-white border border-cyan-400/50">
                  {currentUser.username.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="hidden md:inline text-xs font-bold text-white">
                @{currentUser.username}
              </span>
            </motion.button>

            {/* Profile Dropdown Menu */}
            <AnimatePresence>
              {isProfileDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-56 bg-[#0D1320]/95 border border-cyan-500/30 rounded-2xl p-2 shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl z-50 overflow-hidden"
                  id="profile-dropdown-menu"
                >
                  <div className="px-3 py-2 border-b border-white/10 text-left">
                    <span className="text-[10px] text-cyan-300/80 font-bold uppercase tracking-wider block">Signed in as</span>
                    <span className="text-xs font-bold text-white truncate block">@{currentUser.username}</span>
                    <div className="flex items-center gap-1 text-[9.5px] text-amber-400 mt-0.5">
                      <Zap className="w-3 h-3 fill-amber-400" />
                      <span>{(currentUser.karma || 12480).toLocaleString()} Karma</span>
                    </div>
                  </div>

                  <div className="py-1 space-y-1">
                    <button
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        onNavigateTab('profile');
                      }}
                      className="w-full px-3 py-2 rounded-xl text-xs text-white/80 hover:text-white hover:bg-blue-600/20 flex items-center gap-2 transition-colors cursor-pointer text-left"
                    >
                      <User className="w-3.5 h-3.5 text-cyan-300" />
                      <span>View Profile</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        onOpenSettings();
                      }}
                      className="w-full px-3 py-2 rounded-xl text-xs text-white/80 hover:text-white hover:bg-blue-600/20 flex items-center gap-2 transition-colors cursor-pointer text-left"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-300" />
                      <span>Security Vault</span>
                    </button>

                    {currentUser.email?.toLowerCase() === 'kavyanagpal0005@gmail.com' && (
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          onNavigateTab('admin' as any);
                        }}
                        className="w-full px-3 py-2 rounded-xl text-xs text-amber-300 font-bold hover:text-amber-200 hover:bg-amber-500/20 flex items-center gap-2 transition-colors cursor-pointer text-left border border-amber-500/30 bg-amber-500/10 shadow-[0_0_10px_rgba(245,158,11,0.15)]"
                        id="dropdown-admin-panel-btn"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                        <span>Admin Panel</span>
                      </button>
                    )}

                    {onOpenClerkSetup && (
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          onOpenClerkSetup();
                        }}
                        className="w-full px-3 py-2 rounded-xl text-xs text-purple-300 hover:text-purple-200 hover:bg-purple-600/20 flex items-center justify-between transition-colors cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                          <span>Clerk Status</span>
                        </div>
                        <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                          {isClerkConfigured ? 'Active' : 'Setup'}
                        </span>
                      </button>
                    )}
                  </div>

                  <div className="pt-1 border-t border-white/10">
                    <button
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        onLogout();
                      }}
                      className="w-full px-3 py-2 rounded-xl text-xs text-rose-300 hover:bg-rose-500/20 flex items-center gap-2 transition-colors cursor-pointer text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

      </div>
    </header>
  );
}
