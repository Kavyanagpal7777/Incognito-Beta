/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, Check, Trash2, Ban, UserPlus, FileText, AlertTriangle, RefreshCw, X, Loader2 } from 'lucide-react';
import { Community, UserAccount } from '../../types';

interface CommunityModToolsProps {
  community: Community;
  currentUser: UserAccount;
  onClose: () => void;
  onTriggerToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onCommunityUpdated: (updated: Community) => void;
}

interface ModReport {
  id: string;
  targetType: 'post' | 'comment';
  targetId: string;
  targetTitle?: string;
  targetContent?: string;
  reason: string;
  details?: string;
  reporterUsername: string;
  timestamp: string;
  status: 'pending' | 'resolved' | 'dismissed';
}

export default function CommunityModTools({
  community,
  currentUser,
  onClose,
  onTriggerToast,
  onCommunityUpdated
}: CommunityModToolsProps) {
  const [activeTab, setActiveTab] = useState<'reports' | 'moderators' | 'banned' | 'rules'>('reports');
  const [reports, setReports] = useState<ModReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  // Mod management state
  const [newModUsername, setNewModUsername] = useState('');
  const [moderators, setModerators] = useState<string[]>(community.moderatorUsernames || [community.creatorUsername]);

  // Banned user management state
  const [newBanUsername, setNewBanUsername] = useState('');
  const [bannedUsers, setBannedUsers] = useState<string[]>(community.bannedUsernames || []);

  // Rules state
  const [rules, setRules] = useState(community.rules || []);
  const [newRuleTitle, setNewRuleTitle] = useState('');
  const [newRuleDesc, setNewRuleDesc] = useState('');

  const fetchReports = async () => {
    setIsLoadingReports(true);
    try {
      const res = await fetch(`/api/communities/${community.id}/reports`, {
        headers: {
          'x-user-id': currentUser.id,
          'x-username': currentUser.username
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingReports(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports();
    }
  }, [activeTab, community.id]);

  const handleResolveReport = async (reportId: string, action: 'dismiss' | 'delete') => {
    try {
      const res = await fetch(`/api/communities/${community.id}/reports/${reportId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-username': currentUser.username
        },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReports(prev => prev.filter(r => r.id !== reportId));
        onTriggerToast(action === 'delete' ? 'Report resolved and content removed.' : 'Report dismissed.', 'success');
      } else {
        onTriggerToast(data.error || 'Failed to update report.', 'error');
      }
    } catch (err) {
      console.error(err);
      onTriggerToast('Failed to resolve report.', 'error');
    }
  };

  const handleAddModerator = async () => {
    if (!newModUsername.trim()) return;
    const modClean = newModUsername.trim();
    if (moderators.includes(modClean)) {
      onTriggerToast(`${modClean} is already a moderator.`, 'info');
      return;
    }

    const updatedMods = [...moderators, modClean];
    try {
      const res = await fetch(`/api/communities/${community.id}/moderators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-username': currentUser.username
        },
        body: JSON.stringify({ moderatorUsername: modClean, action: 'add' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setModerators(updatedMods);
        onCommunityUpdated({ ...community, moderatorUsernames: updatedMods });
        onTriggerToast(`Added @${modClean} as moderator.`, 'success');
        setNewModUsername('');
      } else {
        onTriggerToast(data.error || 'Failed to add moderator.', 'error');
      }
    } catch (err) {
      console.error(err);
      onTriggerToast('Failed to add moderator.', 'error');
    }
  };

  const handleRemoveModerator = async (modUsername: string) => {
    if (modUsername === community.creatorUsername) {
      onTriggerToast('Cannot remove the community creator as moderator.', 'error');
      return;
    }

    const updatedMods = moderators.filter(m => m !== modUsername);
    try {
      const res = await fetch(`/api/communities/${community.id}/moderators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-username': currentUser.username
        },
        body: JSON.stringify({ moderatorUsername: modUsername, action: 'remove' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setModerators(updatedMods);
        onCommunityUpdated({ ...community, moderatorUsernames: updatedMods });
        onTriggerToast(`Removed @${modUsername} from moderators.`, 'info');
      } else {
        onTriggerToast(data.error || 'Failed to remove moderator.', 'error');
      }
    } catch (err) {
      console.error(err);
      onTriggerToast('Failed to remove moderator.', 'error');
    }
  };

  const handleBanUser = async () => {
    if (!newBanUsername.trim()) return;
    const banClean = newBanUsername.trim();
    if (bannedUsers.includes(banClean)) {
      onTriggerToast(`@${banClean} is already banned.`, 'info');
      return;
    }

    const updatedBanned = [...bannedUsers, banClean];
    try {
      const res = await fetch(`/api/communities/${community.id}/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-username': currentUser.username
        },
        body: JSON.stringify({ banUsername: banClean, action: 'ban' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBannedUsers(updatedBanned);
        onCommunityUpdated({ ...community, bannedUsernames: updatedBanned });
        onTriggerToast(`Banned @${banClean} from c/${community.handle}.`, 'success');
        setNewBanUsername('');
      } else {
        onTriggerToast(data.error || 'Failed to ban user.', 'error');
      }
    } catch (err) {
      console.error(err);
      onTriggerToast('Failed to ban user.', 'error');
    }
  };

  const handleUnbanUser = async (banUsername: string) => {
    const updatedBanned = bannedUsers.filter(b => b !== banUsername);
    try {
      const res = await fetch(`/api/communities/${community.id}/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-username': currentUser.username
        },
        body: JSON.stringify({ banUsername, action: 'unban' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBannedUsers(updatedBanned);
        onCommunityUpdated({ ...community, bannedUsernames: updatedBanned });
        onTriggerToast(`Unbanned @${banUsername}.`, 'info');
      } else {
        onTriggerToast(data.error || 'Failed to unban user.', 'error');
      }
    } catch (err) {
      console.error(err);
      onTriggerToast('Failed to unban user.', 'error');
    }
  };

  const handleSaveRules = async () => {
    try {
      const res = await fetch(`/api/communities/${community.id}/rules`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-username': currentUser.username
        },
        body: JSON.stringify({ rules })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onCommunityUpdated({ ...community, rules });
        onTriggerToast('Community rules updated!', 'success');
      } else {
        onTriggerToast(data.error || 'Failed to update rules.', 'error');
      }
    } catch (err) {
      console.error(err);
      onTriggerToast('Failed to update rules.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto custom-scrollbar">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-xl"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-3xl bg-[#0d0822] border border-violet-500/30 rounded-3xl p-5 sm:p-7 shadow-[0_25px_60px_rgba(124,58,237,0.35)] z-10 my-auto max-h-[90vh] overflow-y-auto custom-scrollbar text-left"
        id="community-mod-tools-modal"
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-violet-600/20 border border-violet-500/30 text-violet-300">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                <span>Moderation Suite</span>
                <span className="text-xs font-mono font-bold text-violet-400">c/{community.handle}</span>
              </h3>
              <p className="text-xs text-white/50">
                Manage reports, community rules, sub-mods, and banned accounts.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-3 mb-5 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'reports'
                ? 'bg-violet-600 text-white shadow-md'
                : 'bg-white/5 text-white/60 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Reports</span>
            {reports.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px]">
                {reports.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('moderators')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'moderators'
                ? 'bg-violet-600 text-white shadow-md'
                : 'bg-white/5 text-white/60 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Moderators ({moderators.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('banned')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'banned'
                ? 'bg-violet-600 text-white shadow-md'
                : 'bg-white/5 text-white/60 hover:text-white'
            }`}
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Banned Users ({bannedUsers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'rules'
                ? 'bg-violet-600 text-white shadow-md'
                : 'bg-white/5 text-white/60 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Rules Management</span>
          </button>
        </div>

        {/* TAB 1: REPORTS */}
        {activeTab === 'reports' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-violet-200">
                Pending Flagged Reports
              </h4>
              <button
                onClick={fetchReports}
                className="text-xs text-violet-400 hover:text-violet-300 font-bold flex items-center gap-1 p-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingReports ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>

            {isLoadingReports ? (
              <div className="p-8 text-center text-white/40 text-xs flex flex-col items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
                <span>Loading reports...</span>
              </div>
            ) : reports.length === 0 ? (
              <div className="p-8 rounded-2xl bg-black/30 border border-white/10 text-center text-white/50 text-xs">
                No active flagged reports for c/{community.handle}. All clear!
              </div>
            ) : (
              <div className="space-y-2.5">
                {reports.map((report) => (
                  <div key={report.id} className="p-3.5 rounded-2xl bg-black/40 border border-rose-500/20 text-xs space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-rose-400 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> {report.reason}
                      </span>
                      <span className="text-white/40 font-mono">Reported by @{report.reporterUsername} • {report.timestamp}</span>
                    </div>

                    {(report.targetTitle || report.targetContent) && (
                      <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white/80">
                        {report.targetTitle && <div className="font-bold text-white mb-0.5">{report.targetTitle}</div>}
                        {report.targetContent && <div className="text-white/60 line-clamp-2">{report.targetContent}</div>}
                      </div>
                    )}

                    {report.details && (
                      <div className="text-white/60 text-[11px] italic">
                        "{report.details}"
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/10">
                      <button
                        onClick={() => handleResolveReport(report.id, 'dismiss')}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Dismiss Report
                      </button>
                      <button
                        onClick={() => handleResolveReport(report.id, 'delete')}
                        className="px-3 py-1.5 rounded-xl bg-rose-600/30 border border-rose-500/40 hover:bg-rose-600 text-rose-200 hover:text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove Content
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MODERATORS */}
        {activeTab === 'moderators' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10">
              <label className="block text-xs font-bold text-violet-200 uppercase tracking-wider mb-2">
                Add New Moderator
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newModUsername}
                  onChange={(e) => setNewModUsername(e.target.value)}
                  placeholder="Enter username (e.g. ShadowCipher)"
                  className="flex-1 px-3.5 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-violet-500"
                />
                <button
                  onClick={handleAddModerator}
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" /> Add Mod
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-violet-200 mb-1">
                Current Moderators
              </h4>
              {moderators.map((mod) => (
                <div key={mod} className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">@{mod}</span>
                    {mod === community.creatorUsername && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                        Creator / Admin
                      </span>
                    )}
                  </div>
                  {mod !== community.creatorUsername && (
                    <button
                      onClick={() => handleRemoveModerator(mod)}
                      className="text-rose-400 hover:text-rose-300 font-bold text-xs p-1 cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: BANNED USERS */}
        {activeTab === 'banned' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10">
              <label className="block text-xs font-bold text-rose-300 uppercase tracking-wider mb-2">
                Ban User from Community
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newBanUsername}
                  onChange={(e) => setNewBanUsername(e.target.value)}
                  placeholder="Enter username to ban..."
                  className="flex-1 px-3.5 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-rose-500"
                />
                <button
                  onClick={handleBanUser}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Ban className="w-4 h-4" /> Ban User
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-300 mb-1">
                Banned Accounts ({bannedUsers.length})
              </h4>
              {bannedUsers.length === 0 ? (
                <div className="p-4 rounded-xl bg-black/20 border border-white/10 text-xs text-white/40 text-center">
                  No users are currently banned from c/{community.handle}.
                </div>
              ) : (
                bannedUsers.map((bUser) => (
                  <div key={bUser} className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
                    <span className="font-bold text-rose-300">@{bUser}</span>
                    <button
                      onClick={() => handleUnbanUser(bUser)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-bold text-xs cursor-pointer"
                    >
                      Unban
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: RULES MANAGEMENT */}
        {activeTab === 'rules' && (
          <div className="space-y-4">
            <div className="space-y-2">
              {rules.map((rule, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-start justify-between gap-2 text-xs">
                  <div>
                    <div className="font-bold text-white mb-0.5">{idx + 1}. {rule.title}</div>
                    <div className="text-white/50 text-[11px]">{rule.description}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRules(rules.filter((_, i) => i !== idx))}
                    className="text-rose-400 hover:text-rose-300 p-1 font-bold cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
              <input
                type="text"
                value={newRuleTitle}
                onChange={(e) => setNewRuleTitle(e.target.value)}
                placeholder="Rule Title"
                className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newRuleDesc}
                  onChange={(e) => setNewRuleDesc(e.target.value)}
                  placeholder="Rule Details..."
                  className="flex-1 px-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newRuleTitle.trim()) {
                      setRules([...rules, { title: newRuleTitle.trim(), description: newRuleDesc.trim() }]);
                      setNewRuleTitle('');
                      setNewRuleDesc('');
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs cursor-pointer"
                >
                  Add Rule
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveRules}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Check className="w-4 h-4" /> Save Rules
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
