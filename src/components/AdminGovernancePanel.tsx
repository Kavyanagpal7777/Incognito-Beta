import React, { useState, useEffect } from 'react';
import { Shield, Users, Flag, FileText, AlertTriangle, CheckCircle, Lock, RefreshCw, Eye, EyeOff, Ban, Key, Edit2, Save, X, Scale } from 'lucide-react';
import { UserAccount } from '../types';
import LegalCompliancePortal from './LegalCompliancePortal';

interface AdminGovernancePanelProps {
  currentUser: UserAccount;
  accounts?: UserAccount[];
  setAccounts?: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  posts?: any[];
  setPosts?: React.Dispatch<React.SetStateAction<any[]>>;
  onReturnHome?: () => void;
  onTriggerToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const AdminGovernancePanel: React.FC<AdminGovernancePanelProps> = ({
  currentUser,
  accounts,
  setAccounts,
  onReturnHome,
  onTriggerToast
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'reports' | 'logs' | 'legal'>('overview');
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [karmaInputValue, setKarmaInputValue] = useState<string>('');

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const headers = { 'x-user-id': currentUser.id || 'usr_4' };
      const [uRes, rRes, lRes] = await Promise.all([
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/reports', { headers }),
        fetch('/api/admin/audit-logs', { headers })
      ]);

      const uData = await uRes.json();
      const rData = await rRes.json();
      const lData = await lRes.json();

      if (uData.success) setUsers(uData.users || []);
      if (rData.success) setReports(rData.reports || []);
      if (lData.success) setAuditLogs(lData.auditLogs || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [currentUser.id]);

  const handleSaveKarma = async (userId: string, targetUsername: string) => {
    const val = parseInt(karmaInputValue, 10);
    if (isNaN(val)) {
      onTriggerToast?.('Please enter a valid numeric karma value.', 'error');
      return;
    }

    try {
      const headers = {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id || 'usr_4'
      };
      const res = await fetch(`/api/admin/users/${userId}/karma`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ karma: val })
      });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, karma: val } : u));
        if (setAccounts) {
          setAccounts(prev => prev.map(a => (a.id === userId || a.username.toLowerCase() === targetUsername.toLowerCase()) ? { ...a, karma: val } : a));
        }
        setEditingUserId(null);
        onTriggerToast?.(`Updated karma for @${targetUsername} to ${val} points`, 'success');
      } else {
        onTriggerToast?.(data.message || 'Failed to update karma', 'error');
      }
    } catch (err) {
      console.error('Error updating karma:', err);
      // Fallback local update if offline/mock
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, karma: val } : u));
      if (setAccounts) {
        setAccounts(prev => prev.map(a => (a.id === userId || a.username.toLowerCase() === targetUsername.toLowerCase()) ? { ...a, karma: val } : a));
      }
      setEditingUserId(null);
      onTriggerToast?.(`Updated karma for @${targetUsername} to ${val} points`, 'success');
    }
  };

  const handleUpdateRole = async (userId: string, targetUsername: string, newRole: string) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id || 'usr_4'
      };
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ newRole })
      });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        if (setAccounts) {
          setAccounts(prev => prev.map(a => (a.id === userId || a.username.toLowerCase() === targetUsername.toLowerCase()) ? { ...a, role: newRole } : a));
        }
        onTriggerToast?.(`Assigned staff role [${newRole}] to @${targetUsername}`, 'success');
        fetchAdminData();
      } else {
        onTriggerToast?.(data.message || 'Failed to update staff role', 'error');
      }
    } catch (err) {
      console.error('Error updating role:', err);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      if (setAccounts) {
        setAccounts(prev => prev.map(a => (a.id === userId || a.username.toLowerCase() === targetUsername.toLowerCase()) ? { ...a, role: newRole } : a));
      }
      onTriggerToast?.(`Assigned staff role [${newRole}] to @${targetUsername}`, 'success');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6 text-emerald-100">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-6 backdrop-blur-md shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-emerald-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Enterprise Governance Vault</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Authenticated as <span className="text-emerald-400 font-mono">@{currentUser.username}</span> ({currentUser.role || 'Admin'})
          </p>
        </div>
        <button
          onClick={fetchAdminData}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 rounded-lg text-emerald-300 text-sm font-medium transition"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Governance Data
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 space-x-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition ${
            activeTab === 'overview'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-4 h-4" /> Overview & Telemetry
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition ${
            activeTab === 'users'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" /> User Directory ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition ${
            activeTab === 'reports'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Flag className="w-4 h-4" /> Content Moderation ({reports.length})
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition ${
            activeTab === 'logs'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" /> Audit Logs
        </button>
        <button
          onClick={() => setActiveTab('legal')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition ${
            activeTab === 'legal'
              ? 'border-cyan-500 text-cyan-300 bg-cyan-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Scale className="w-4 h-4 text-cyan-400" /> Legal & Compliance Portal
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-400">Total Authenticated Users</span>
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold text-white mt-2">{users.length}</div>
            <div className="text-xs text-emerald-400 mt-2">User Accounts Mapped</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-400">Pending Safety Reports</span>
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-3xl font-extrabold text-white mt-2">{reports.filter(r => r.status === 'pending').length}</div>
            <div className="text-xs text-amber-400 mt-2">Active Moderation Queue</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-400">Authentication Security</span>
              <Key className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="text-lg font-bold text-emerald-300 mt-2">Active & Enforced</div>
            <div className="text-xs text-slate-400 mt-2">OAuth, Email, Phone, Sessions</div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 font-semibold text-white flex flex-wrap items-center justify-between gap-2">
            <span>Registered Users & Private Telemetry</span>
            <span className="text-xs text-emerald-400 font-medium">Click "Edit Karma" on any user to adjust their points</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-slate-400 text-xs uppercase border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3">Anonymous Username</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Account ID / Key</th>
                  <th className="px-6 py-3">Karma Score</th>
                  <th className="px-6 py-3">Method</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-semibold text-white flex items-center gap-3">
                      <img src={u.avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80'} alt="" className="w-8 h-8 rounded-full" />
                      @{u.username}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={u.role || 'user'}
                        onChange={(e) => handleUpdateRole(u.id, u.username, e.target.value)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-950 text-emerald-300 border border-emerald-500/40 outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer"
                      >
                        <option value="owner">👑 Owner</option>
                        <option value="super_admin">🛡️ Super Admin</option>
                        <option value="admin">⚖️ Administrator</option>
                        <option value="moderator">🛠️ Moderator</option>
                        <option value="user">👤 User (No Role)</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{u.id}</td>
                    <td className="px-6 py-4 text-emerald-400 font-bold">
                      {editingUserId === u.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={karmaInputValue}
                            onChange={(e) => setKarmaInputValue(e.target.value)}
                            className="w-24 px-2 py-1 bg-slate-950 border border-emerald-400/80 rounded-lg text-emerald-300 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                            placeholder="Karma"
                          />
                          <button
                            onClick={() => handleSaveKarma(u.id, u.username)}
                            className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded cursor-pointer transition"
                            title="Save Karma"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingUserId(null)}
                            className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer transition"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="font-mono text-sm text-emerald-400 font-extrabold">{u.karma}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">{u.loginMethod}</td>
                    <td className="px-6 py-4 text-right">
                      {editingUserId === u.id ? (
                        <button
                          onClick={() => handleSaveKarma(u.id, u.username)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow"
                        >
                          Save Karma
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingUserId(u.id);
                            setKarmaInputValue(String(u.karma || 0));
                          }}
                          className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-semibold transition flex items-center gap-1 ml-auto cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit Karma</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">Moderation Reports Queue</h2>
          {reports.length === 0 ? (
            <p className="text-slate-400 text-sm">No pending content reports found.</p>
          ) : (
            reports.map((r) => (
              <div key={r.id} className="p-4 border border-slate-800 bg-slate-950/60 rounded-lg flex justify-between items-center">
                <div>
                  <div className="text-sm font-semibold text-white">{r.targetTitle || r.targetContent}</div>
                  <div className="text-xs text-slate-400 mt-1">Reported @{r.reportedUsername} • Reason: {r.reason}</div>
                </div>
                <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 text-xs font-medium rounded-full">
                  {r.status}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'logs' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">Security & Audit Event Logs</h2>
          <div className="space-y-2 font-mono text-xs">
            {auditLogs.map((l) => (
              <div key={l.id} className="p-3 bg-slate-950/80 border border-slate-800/80 rounded flex flex-col md:flex-row justify-between gap-2 text-slate-300">
                <div>
                  <span className="text-emerald-400 font-bold">[{l.timestamp}]</span> <span className="text-white font-semibold">@{l.actorUsername}</span> ({l.action}): {l.details}
                </div>
                <div className="text-slate-500 text-right">{l.ipAddress}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legal & Compliance Portal Tab */}
      {activeTab === 'legal' && (
        <LegalCompliancePortal
          currentUser={currentUser}
          accounts={accounts || users}
          onTriggerToast={onTriggerToast}
        />
      )}
    </div>
  );
};

export default AdminGovernancePanel;
