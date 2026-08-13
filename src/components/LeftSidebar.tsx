/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  Home, 
  Users,
  Trophy, 
  MessageSquare, 
  User, 
  Settings, 
  LogOut, 
  ShieldCheck, 
  ShieldAlert,
  EyeOff, 
  Sparkles,
  Zap,
  Lock,
  ChevronRight
} from 'lucide-react';
import { UserAccount } from '../types';
import IncognitoLogo from './IncognitoLogo';

interface LeftSidebarProps {
  activeTab: 'home' | 'communities' | 'leaderboard' | 'messages' | 'profile' | 'settings' | 'admin';
  setActiveTab: (tab: 'home' | 'communities' | 'leaderboard' | 'messages' | 'profile' | 'settings' | 'admin') => void;
  currentUser: UserAccount;
  onLogout: () => void;
  isAnonymousMode: boolean;
  setIsAnonymousMode: (val: boolean) => void;
  onOpenSettings: () => void;
  unreadMessagesCount?: number;
}

export default function LeftSidebar({
  activeTab,
  setActiveTab,
  currentUser,
  onLogout,
  isAnonymousMode,
  setIsAnonymousMode,
  onOpenSettings,
  unreadMessagesCount = 1
}: LeftSidebarProps) {

  const isStaff = currentUser.role === 'owner' || currentUser.role === 'super_admin' || currentUser.role === 'admin' || currentUser.role === 'moderator' || currentUser.email?.toLowerCase() === 'kavyanagpal0005@gmail.com';

  const baseNavItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'communities', label: 'Communities', icon: Users, badge: 'NEW' },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy, badge: 'TOP' },
    { id: 'messages', label: 'Messages', icon: MessageSquare, count: unreadMessagesCount },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  const navItems = isStaff
    ? [...baseNavItems, { id: 'admin', label: 'Admin & Legal', icon: ShieldAlert, badge: currentUser.role === 'owner' ? 'OWNER' : 'STAFF' }]
    : baseNavItems;

  return (
    <aside 
      className="w-full h-full flex flex-col justify-between p-4 sm:p-5 relative select-none overflow-y-auto custom-scrollbar"
      id="incognito-left-sidebar"
    >
      {/* Top Glass Section */}
      <div className="space-y-6">
        
        {/* BRAND HEADER */}
        <div className="flex flex-col items-center sm:items-start px-2 pt-1 pb-3 border-b border-white/10 relative">
          <div className="flex items-center gap-3">
            <IncognitoLogo size="sm" showText={false} />
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-display font-extrabold text-lg tracking-widest text-white uppercase">
                  INCOGNITO
                </h1>
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#00d9ff] animate-pulse" />
              </div>
              <p className="text-[10px] font-medium text-cyan-300/80 tracking-wider">
                Anonymous. Honest. Unfiltered.
              </p>
            </div>
          </div>
          <div className="absolute right-0 top-2 px-2 py-0.5 rounded-full bg-blue-500/10 border border-cyan-500/20 text-[8px] font-bold text-cyan-300 uppercase tracking-widest">
            v2.6 SECURE
          </div>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="space-y-1.5" id="sidebar-navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <motion.button
                key={item.id}
                onClick={() => {
                  if (item.id === 'settings') {
                    onOpenSettings();
                  } else {
                    setActiveTab(item.id);
                  }
                }}
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-semibold transition-all duration-200 cursor-pointer relative group overflow-hidden ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600/30 via-cyan-600/20 to-sky-600/10 border border-cyan-500/40 text-white shadow-[0_0_20px_rgba(22,119,255,0.25)]'
                    : 'text-white/60 hover:text-white bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-cyan-500/20'
                }`}
                id={`sidebar-nav-${item.id}`}
              >
                {/* Active Glowing Left Indicator Bar */}
                {isActive && (
                  <motion.div 
                    layoutId="active-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-blue-400 via-cyan-400 to-sky-400 rounded-r-full shadow-[0_0_12px_#00d9ff]"
                  />
                )}

                {/* Glass Reflection Highlight on Hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />

                <div className="flex items-center gap-3 z-10">
                  <div className={`p-2 rounded-xl transition-all ${
                    isActive 
                      ? 'bg-blue-500/30 text-cyan-200 border border-cyan-400/30 shadow-[0_0_10px_rgba(0,217,255,0.3)]' 
                      : 'bg-white/5 text-white/50 group-hover:text-cyan-300 group-hover:bg-blue-500/10'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-xs tracking-wide">{item.label}</span>
                </div>

                {/* Optional Badge or Count */}
                <div className="flex items-center gap-1.5 z-10">
                  {'badge' in item && item.badge && (
                    <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-500/30 to-cyan-500/30 border border-cyan-400/30 text-[9px] font-extrabold text-cyan-300 uppercase tracking-widest shadow-sm">
                      {item.badge}
                    </span>
                  )}
                  {'count' in item && item.count && item.count > 0 ? (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-[9.5px] font-extrabold text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                      {item.count}
                    </span>
                  ) : null}
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 ${isActive ? 'text-cyan-300 opacity-100' : 'text-white/20 opacity-0 group-hover:opacity-100'}`} />
                </div>
              </motion.button>
            );
          })}
        </nav>
      </div>

      {/* BOTTOM SECTION: USER CARD, SETTINGS & ANONYMOUS TOGGLE */}
      <div className="space-y-3 pt-4 border-t border-white/10" id="sidebar-bottom-controls">
        
        {/* LOGGED IN USER GLASS CARD */}
        <div 
          onClick={() => setActiveTab('profile')}
          className="p-3.5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-black/30 border border-cyan-500/20 backdrop-blur-xl relative overflow-hidden group cursor-pointer hover:border-cyan-500/40 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
          id="user-profile-glass-card"
        >
          {/* Subtle Ambient Glow inside card */}
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-blue-600/20 rounded-full blur-xl group-hover:bg-cyan-500/30 transition-all pointer-events-none" />

          <div className="flex items-center gap-3 relative z-10">
            {/* Circular Avatar */}
            <div className="relative">
              {currentUser.avatarUrl ? (
                <img 
                  src={currentUser.avatarUrl} 
                  alt={currentUser.username}
                  className="w-10 h-10 rounded-full object-cover border-2 border-cyan-500/40 shadow-[0_0_15px_rgba(22,119,255,0.3)] group-hover:scale-105 transition-transform" 
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 via-blue-500 to-cyan-500 flex items-center justify-center font-bold font-display text-white border-2 border-cyan-400/40 text-sm shadow-[0_0_15px_rgba(22,119,255,0.3)]">
                  {currentUser.username.charAt(0).toUpperCase()}
                </div>
              )}
              {/* Shield Status Dot */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#070B14] border border-emerald-400 flex items-center justify-center" title="Identity Isolated">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
            </div>

            {/* Username & Karma */}
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-1">
                <h4 className="text-xs font-bold text-white truncate group-hover:text-cyan-200 transition-colors">
                  {isAnonymousMode ? 'Anonymous Ghost' : currentUser.username}
                </h4>
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              </div>
              <p className="text-[10.5px] font-mono text-cyan-300/80 flex items-center gap-1 mt-0.5">
                <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>{(currentUser.karma || 12480).toLocaleString()} Karma</span>
              </p>
            </div>
          </div>

          {/* User Buttons: Settings & Logout */}
          <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-white/5 relative z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenSettings();
              }}
              className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-[10.5px] font-bold text-white/70 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              id="sidebar-card-settings-btn"
            >
              <Settings className="w-3 h-3 text-cyan-300" />
              <span>Vault</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLogout();
              }}
              className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-[10.5px] font-bold text-rose-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              id="sidebar-card-logout-btn"
            >
              <LogOut className="w-3 h-3" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* ANONYMOUS MODE TOGGLE AT THE VERY BOTTOM */}
        <div className="p-3 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md flex items-center justify-between shadow-inner" id="anonymous-mode-toggle-card">
          <div className="flex items-center gap-2.5 text-left">
            <div className={`p-2 rounded-xl border transition-all ${
              isAnonymousMode 
                ? 'bg-blue-500/20 border-cyan-400/40 text-cyan-300 shadow-[0_0_12px_rgba(0,217,255,0.4)]' 
                : 'bg-white/5 border-white/10 text-white/40'
            }`}>
              <EyeOff className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-[11px] font-bold text-white tracking-wide">
                Anonymous Mode
              </h5>
              <p className="text-[9.5px] text-white/50 leading-none mt-0.5">
                Your identity stays private.
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            onClick={() => setIsAnonymousMode(!isAnonymousMode)}
            className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-300 focus:outline-none cursor-pointer flex items-center ${
              isAnonymousMode ? 'bg-gradient-to-r from-blue-600 to-cyan-400' : 'bg-white/10'
            }`}
            id="anonymous-toggle-switch"
          >
            <motion.div
              layout
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={`w-4 h-4 rounded-full bg-white shadow-md transform ${
                isAnonymousMode ? 'translate-x-5 bg-cyan-100' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

      </div>
    </aside>
  );
}
