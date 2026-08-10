import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Search, 
  FileText, 
  Lock, 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  History, 
  Smartphone, 
  Globe, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MessageSquare, 
  Key, 
  Database,
  FileSpreadsheet,
  FileCode,
  Printer,
  ChevronRight,
  ShieldAlert,
  Crown
} from 'lucide-react';
import { UserAccount, AuditLog, LegalUserData, LegalExportRequest } from '../types';

interface LegalCompliancePortalProps {
  currentUser: UserAccount;
  accounts?: UserAccount[];
  onTriggerToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const LegalCompliancePortal: React.FC<LegalCompliancePortalProps> = ({
  currentUser,
  accounts = [],
  onTriggerToast
}) => {
  const isOwner = currentUser.role === 'owner' || currentUser.email?.toLowerCase() === 'kavyanagpal0005@gmail.com';
  const isSuperAdmin = currentUser.role === 'super_admin' || isOwner;

  const [activeTab, setActiveTab] = useState<'dossier' | 'export' | 'audit'>('dossier');
  
  // Search & Target User selection
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>(accounts[0]?.id || 'usr_1');
  const [accessReason, setAccessReason] = useState('Compliance & Safety Investigation');

  // Fetched Legal Data
  const [legalData, setLegalData] = useState<LegalUserData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Legal Export Form State
  const [exportReason, setExportReason] = useState('Law Enforcement Subpoena / Official Inquiry');
  const [exportFormat, setExportFormat] = useState<'PDF' | 'CSV' | 'JSON'>('PDF');
  const [exportScope, setExportScope] = useState({
    profile: true,
    telemetry: true,
    reports: true,
    content: true,
    messages: isOwner
  });
  const [isExporting, setIsExporting] = useState(false);
  const [lastExport, setLastExport] = useState<any | null>(null);

  // Fetch Legal User Data
  const fetchLegalData = async (userId: string, reason: string) => {
    setIsLoading(true);
    try {
      const headers = {
        'x-clerk-user-id': currentUser.id || 'usr_4'
      };
      const res = await fetch(`/api/admin/legal/user/${userId}?reason=${encodeURIComponent(reason)}`, { headers });
      const data = await res.json();
      if (data.success) {
        setLegalData(data.legalData);
      } else {
        onTriggerToast?.(data.message || 'Failed to fetch legal dossier', 'error');
      }
    } catch (err) {
      console.error('Error fetching legal compliance dossier:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Audit Logs
  const fetchAuditLogs = async () => {
    try {
      const headers = { 'x-clerk-user-id': currentUser.id || 'usr_4' };
      const res = await fetch('/api/admin/audit-logs', { headers });
      const data = await res.json();
      if (data.success) {
        setAuditLogs(data.auditLogs || []);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    }
  };

  useEffect(() => {
    if (selectedUserId) {
      fetchLegalData(selectedUserId, accessReason);
    }
    fetchAuditLogs();
  }, [selectedUserId]);

  const handleTogglePmPermission = async (granted: boolean) => {
    if (!isOwner) {
      onTriggerToast?.('Only Platform Owner can modify investigation permissions', 'error');
      return;
    }
    try {
      const res = await fetch('/api/admin/legal/pm-permission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-clerk-user-id': currentUser.id || 'usr_4'
        },
        body: JSON.stringify({ targetUserId: selectedUserId, granted })
      });
      const data = await res.json();
      if (data.success) {
        onTriggerToast?.(`Investigation PM permission ${granted ? 'GRANTED' : 'REVOKED'} for Super Admins`, 'success');
        fetchLegalData(selectedUserId, 'Owner PM Permission Toggle');
        fetchAuditLogs();
      }
    } catch (err) {
      console.error('Error toggling PM permission:', err);
    }
  };

  const handleGenerateExport = async () => {
    if (!exportReason || exportReason.trim().length < 3) {
      onTriggerToast?.('Please enter a valid reason for legal data export', 'error');
      return;
    }

    setIsExporting(true);
    try {
      const scopeKeys = Object.entries(exportScope).filter(([_, val]) => val).map(([key]) => key);
      const res = await fetch('/api/admin/legal/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-clerk-user-id': currentUser.id || 'usr_4'
        },
        body: JSON.stringify({
          targetUserId: selectedUserId,
          reason: exportReason,
          format: exportFormat,
          scope: scopeKeys
        })
      });

      const data = await res.json();
      if (data.success) {
        setLastExport(data);
        onTriggerToast?.(`Legal Request Export generated successfully [${data.requestId}]`, 'success');
        fetchAuditLogs();

        // Download or Print handling
        if (exportFormat === 'JSON') {
          downloadJson(data);
        } else if (exportFormat === 'CSV') {
          downloadCsv(data);
        } else if (exportFormat === 'PDF') {
          printPdfReport(data);
        }
      } else {
        onTriggerToast?.(data.message || 'Export failed', 'error');
      }
    } catch (err) {
      console.error('Error generating legal request export:', err);
      onTriggerToast?.('Failed to process legal request export', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const downloadJson = (exportData: any) => {
    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Incognito_Legal_Dossier_${exportData.requestId}_${exportData.legalData.username}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCsv = (exportData: any) => {
    const ld = exportData.legalData;
    let csvContent = `INCOGNITO LEGAL COMPLIANCE EXPORT REPORT\n`;
    csvContent += `Request ID,${exportData.requestId}\n`;
    csvContent += `Timestamp,${exportData.timestamp}\n`;
    csvContent += `Exported By,${exportData.exportedBy}\n`;
    csvContent += `Reason,${exportData.reason.replace(/,/g, ';')}\n\n`;

    csvContent += `USER PROFILE IDENTIFIERS\n`;
    csvContent += `User ID,Username,Real Name,Registered Email,Verified Phone,Joined Date,Status,Karma\n`;
    csvContent += `"${ld.id}","${ld.username}","${ld.realName}","${ld.registeredEmail}","${ld.verifiedMobile}","${ld.creationDate}","${ld.accountStatus.statusLabel}",${ld.accountStatus.karma}\n\n`;

    csvContent += `LOGIN HISTORY TELEMETRY\n`;
    csvContent += `Timestamp,IP Address,Method,Device Info,Outcome,Location\n`;
    (ld.loginHistory || []).forEach((lh: any) => {
      csvContent += `"${lh.timestamp}","${lh.ipAddress}","${lh.method}","${lh.deviceInfo.replace(/,/g, ' ')}","${lh.outcome}","${lh.location}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Incognito_Legal_Report_${exportData.requestId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPdfReport = (exportData: any) => {
    const ld = exportData.legalData;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Legal Compliance Export Report - ${exportData.requestId}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; padding: 40px; line-height: 1.5; }
            .header { border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
            .title { font-size: 22px; font-weight: bold; color: #312e81; }
            .badge { background: #e0e7ff; color: #3730a3; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: bold; }
            .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 13px; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
            h2 { font-size: 16px; color: #4338ca; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-top: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { background: #f1f5f9; font-weight: bold; }
            .redacted { background: #fee2e2; color: #991b1b; font-weight: bold; text-align: center; font-family: monospace; }
            .footer { margin-top: 40px; border-top: 1px solid #cbd5e1; pt-4; font-size: 11px; color: #64748b; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">INCÓGNITO LEGAL COMPLIANCE DOSSIER</div>
              <div style="font-size: 12px; color: #64748b;">Official Law Enforcement & Regulatory Records</div>
            </div>
            <div class="badge">CONFIDENTIAL</div>
          </div>

          <div class="meta-box">
            <div class="meta-grid">
              <div><strong>Request ID:</strong> ${exportData.requestId}</div>
              <div><strong>Timestamp:</strong> ${exportData.timestamp}</div>
              <div><strong>Exported By:</strong> ${exportData.exportedBy}</div>
              <div><strong>Reason for Export:</strong> ${exportData.reason}</div>
            </div>
          </div>

          <h2>1. Registered Account Identity</h2>
          <table>
            <tr><th>Field</th><th>Value</th></tr>
            <tr><td>Account User ID</td><td>${ld.id}</td></tr>
            <tr><td>Public Username</td><td>@${ld.username}</td></tr>
            <tr><td>Registered Legal Name</td><td>${ld.realName}</td></tr>
            <tr><td>Registered Email Address</td><td>${ld.registeredEmail}</td></tr>
            <tr><td>Verified Phone Number</td><td>${ld.verifiedMobile}</td></tr>
            <tr><td>Account Creation Date</td><td>${ld.creationDate}</td></tr>
            <tr><td>Account Status</td><td>${ld.accountStatus.statusLabel}</td></tr>
          </table>

          <h2>2. Security Credentials & Secrets Status</h2>
          <table>
            <tr><th>Credential Type</th><th>Security & Compliance Protection Status</th></tr>
            <tr><td>Passwords & Password Hashes</td><td class="redacted">[REDACTED FOR SECURITY - ASVS COMPLIANCE]</td></tr>
            <tr><td>Authentication Secrets / 2FA Keys</td><td class="redacted">[REDACTED FOR SECURITY - ASVS COMPLIANCE]</td></tr>
            <tr><td>Session Tokens & API Keys</td><td class="redacted">[REDACTED FOR SECURITY - ASVS COMPLIANCE]</td></tr>
            <tr><td>OAuth Tokens & Secrets</td><td class="redacted">[REDACTED FOR SECURITY - ASVS COMPLIANCE]</td></tr>
          </table>

          <h2>3. Login & IP Telemetry History</h2>
          <table>
            <tr><th>Timestamp</th><th>IP Address</th><th>Method</th><th>Device / OS</th><th>Outcome</th><th>Location</th></tr>
            ${(ld.loginHistory || []).map((lh: any) => `
              <tr>
                <td>${lh.timestamp}</td>
                <td>${lh.ipAddress}</td>
                <td>${lh.method}</td>
                <td>${lh.deviceInfo}</td>
                <td>${lh.outcome}</td>
                <td>${lh.location}</td>
              </tr>
            `).join('')}
          </table>

          <h2>4. Public & Deleted Content Activity</h2>
          <table>
            <tr><th>Post ID</th><th>Community</th><th>Title / Content Snippet</th><th>Timestamp</th><th>Status</th></tr>
            ${(ld.publicPosts || []).map((p: any) => `
              <tr>
                <td>${p.id}</td>
                <td>${p.community}</td>
                <td>${p.title ? `<strong>${p.title}</strong><br/>` : ''}${p.content}</td>
                <td>${p.timestamp}</td>
                <td>${p.isDeleted ? '<span style="color:red; font-weight:bold;">DELETED</span>' : 'ACTIVE'}</td>
              </tr>
            `).join('')}
          </table>

          <div class="footer">
            Generated via Incógnito Legal Compliance System • Authenticated Signature Log #90142
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredAccounts = accounts.filter(a => 
    a.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.phone?.includes(searchQuery) ||
    a.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isSuperAdmin) {
    return (
      <div className="w-full max-w-4xl mx-auto p-8 bg-slate-900 border border-red-500/30 rounded-2xl text-center space-y-4">
        <ShieldAlert className="w-16 h-16 text-red-400 mx-auto" />
        <h2 className="text-2xl font-bold text-white">Access Denied: Restricted Legal Portal</h2>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          The Legal Compliance & Investigation Portal is restricted strictly to Platform Owner and Super Admin staff members.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6 text-slate-100">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-950 via-purple-950/40 to-slate-950 border border-purple-500/30 rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-300">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
                Legal Compliance & Investigation Portal
                {isOwner ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-400/40 uppercase tracking-wide flex items-center gap-1">
                    <Crown className="w-3 h-3 fill-amber-300" /> Owner Privilege
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-500/20 text-purple-300 border border-purple-400/40 uppercase tracking-wide">
                    Super Admin Privilege
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Audited Compliance Portal • Staff Member: <span className="text-purple-300 font-mono font-semibold">@{currentUser.username}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
            <Lock className="w-3.5 h-3.5" /> Immutable Audit Engine Active
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex border-b border-slate-800 space-x-2">
        <button
          onClick={() => setActiveTab('dossier')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition cursor-pointer ${
            activeTab === 'dossier'
              ? 'border-purple-500 text-purple-300 bg-purple-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Search className="w-4 h-4" /> Legal Dossier Investigation
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition cursor-pointer ${
            activeTab === 'export'
              ? 'border-purple-500 text-purple-300 bg-purple-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" /> Legal Requests & Exports
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition cursor-pointer ${
            activeTab === 'audit'
              ? 'border-purple-500 text-purple-300 bg-purple-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" /> Immutable Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: DOSSIER INVESTIGATION */}
      {activeTab === 'dossier' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: USER SELECTOR & REASON */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
              <h2 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                <Search className="w-4 h-4" /> Target User Search
              </h2>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search username, email, phone, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {filteredAccounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => setSelectedUserId(acc.id)}
                    className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between transition cursor-pointer ${
                      selectedUserId === acc.id
                        ? 'bg-purple-600/20 border border-purple-500/50 text-white'
                        : 'bg-slate-950/60 border border-slate-800/80 text-slate-300 hover:bg-slate-800/50'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs text-purple-300">@{acc.username}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[180px]">{acc.email || acc.phone || acc.id}</div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {acc.role || 'user'}
                    </span>
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase">
                  Mandatory Reason for Access <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={accessReason}
                  onChange={(e) => setAccessReason(e.target.value)}
                  placeholder="e.g. Subpoena #8492, TOS Safety Review..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
                <p className="text-[10px] text-slate-500 italic">
                  Note: Viewing this dossier generates a permanent, unalterable record in the audit log.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT: DOSSIER CONTENT */}
          <div className="lg:col-span-8 space-y-6">
            {isLoading ? (
              <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-400">
                <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-3" />
                Loading Verified Legal Compliance Dossier...
              </div>
            ) : legalData ? (
              <div className="space-y-6">

                {/* USER PROFILE & IDENTITY */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <User className="w-4 h-4 text-purple-400" /> Account Identity & Verification Profile
                    </h3>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {legalData.accountStatus.statusLabel}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-500 block text-[10px] font-bold uppercase">Account ID</span>
                      <span className="font-mono text-purple-300 font-semibold">{legalData.id}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-500 block text-[10px] font-bold uppercase">Public Handle</span>
                      <span className="font-bold text-white">@{legalData.username}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-500 block text-[10px] font-bold uppercase">Registered Legal Name</span>
                      <span className="font-semibold text-slate-200">{legalData.realName}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-500 block text-[10px] font-bold uppercase flex items-center gap-1">
                        <Mail className="w-3 h-3 text-purple-400" /> Registered Email Address
                      </span>
                      <span className="font-mono text-slate-200 font-medium">{legalData.registeredEmail}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-500 block text-[10px] font-bold uppercase flex items-center gap-1">
                        <Phone className="w-3 h-3 text-purple-400" /> Verified Mobile Number
                      </span>
                      <span className="font-mono text-slate-200 font-medium">{legalData.verifiedMobile}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-500 block text-[10px] font-bold uppercase flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-purple-400" /> Account Creation Date
                      </span>
                      <span className="font-semibold text-slate-200">{legalData.creationDate}</span>
                    </div>
                  </div>

                  {/* SECURITY REDACTION NOTICE (NEVER EXPOSE PASSWORDS OR SECRETS) */}
                  <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 text-xs space-y-2">
                    <div className="flex items-center gap-2 text-red-400 font-bold">
                      <Lock className="w-4 h-4" /> ASVS Security Protection Mask Active
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded bg-slate-950 text-slate-400 flex justify-between">
                        <span>Password & Hashes:</span>
                        <span className="text-red-400 font-mono font-bold">[REDACTED FOR SECURITY]</span>
                      </div>
                      <div className="p-2 rounded bg-slate-950 text-slate-400 flex justify-between">
                        <span>2FA Secrets & TOTP Keys:</span>
                        <span className="text-red-400 font-mono font-bold">[REDACTED FOR SECURITY]</span>
                      </div>
                      <div className="p-2 rounded bg-slate-950 text-slate-400 flex justify-between">
                        <span>Active Session Tokens:</span>
                        <span className="text-red-400 font-mono font-bold">[REDACTED FOR SECURITY]</span>
                      </div>
                      <div className="p-2 rounded bg-slate-950 text-slate-400 flex justify-between">
                        <span>API & OAuth Keys:</span>
                        <span className="text-red-400 font-mono font-bold">[REDACTED FOR SECURITY]</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* TELEMETRY & HISTORY */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                    <Globe className="w-4 h-4 text-purple-400" /> Login & IP Address Telemetry History
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                          <th className="p-2">Timestamp</th>
                          <th className="p-2">IP Address</th>
                          <th className="p-2">Method</th>
                          <th className="p-2">Device / OS</th>
                          <th className="p-2">Outcome</th>
                          <th className="p-2">Geographic Location</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                        {legalData.loginHistory.map((lh) => (
                          <tr key={lh.id} className="hover:bg-slate-800/30">
                            <td className="p-2 text-slate-300">{lh.timestamp}</td>
                            <td className="p-2 text-purple-300 font-bold">{lh.ipAddress}</td>
                            <td className="p-2 text-slate-300">{lh.method}</td>
                            <td className="p-2 text-slate-400 truncate max-w-[150px]">{lh.deviceInfo}</td>
                            <td className="p-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                lh.outcome.includes('SUCCESS') ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                              }`}>
                                {lh.outcome}
                              </span>
                            </td>
                            <td className="p-2 text-slate-400">{lh.location}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* DEVICE FINGERPRINTS (Owner Only View) */}
                  {isOwner ? (
                    <div className="mt-4 pt-4 border-t border-slate-800">
                      <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                        <Smartphone className="w-3.5 h-3.5" /> Hardware & Device Fingerprints (Owner Restricted)
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {legalData.deviceFingerprints.map((df) => (
                          <div key={df.fingerprint} className="p-3 rounded-xl bg-slate-950 border border-amber-500/20">
                            <div className="font-mono text-amber-400 font-bold text-[11px]">{df.fingerprint}</div>
                            <div className="text-[10px] text-slate-400">{df.os} • {df.browser}</div>
                            <div className="text-[10px] text-slate-500 mt-1">Last seen: {df.lastUsed}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 italic">
                      🔒 Hardware Device Fingerprints are restricted exclusively to Platform Owner access.
                    </div>
                  )}
                </div>

                {/* PRIVATE MESSAGES & INVESTIGATION PERMISSION */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-purple-400" /> Private Messages Investigation Gateway
                    </h3>
                    
                    {/* OWNER INVESTIGATION TOGGLE */}
                    {isOwner && (
                      <button
                        onClick={() => handleTogglePmPermission(!legalData.pmAccessGrantedByOwner)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                          legalData.pmAccessGrantedByOwner
                            ? 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                        }`}
                      >
                        {legalData.pmAccessGrantedByOwner 
                          ? 'Revoke Super Admin PM Access' 
                          : 'Grant Super Admin Investigation Access'}
                      </button>
                    )}
                  </div>

                  {!isOwner && !legalData.pmAccessGrantedByOwner && (
                    <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-200 text-xs space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400" /> Super Admin Message Protection Rule
                      </div>
                      <p className="text-[11px] text-amber-300/80">
                        Super Admins cannot freely browse every private message. Only reported conversations, active moderation linked cases, or Owner-permitted investigations are visible below.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {legalData.privateMessages && legalData.privateMessages.length > 0 ? (
                      legalData.privateMessages.map((pm) => (
                        <div key={pm.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-purple-300">
                              @{pm.senderUsername} ➔ @{pm.recipientUsername}
                            </span>
                            <div className="flex items-center gap-2">
                              {pm.isReported && (
                                <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-extrabold text-[9px] uppercase border border-red-500/40">
                                  Reported Conversation
                                </span>
                              )}
                              {pm.linkedModerationCaseId && (
                                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-extrabold text-[9px] border border-amber-500/40">
                                  Case #{pm.linkedModerationCaseId}
                                </span>
                              )}
                              <span className="text-slate-500 font-mono text-[10px]">{pm.timestamp}</span>
                            </div>
                          </div>
                          <p className="text-slate-200 bg-slate-900/60 p-2 rounded-lg font-mono text-[11px]">
                            "{pm.content}"
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-slate-500 text-xs italic">
                        No private messages meet current investigation permissions or active moderation cases.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            ) : null}
          </div>

        </div>
      )}

      {/* TAB 2: LEGAL REQUESTS & EXPORTS */}
      {activeTab === 'export' && (
        <div className="max-w-3xl mx-auto bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" /> Formal Legal Request Export Generator
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Export verified user compliance dossiers for law enforcement, regulatory compliance, or legal counsel.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            {/* Target User */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                Target User Account
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-purple-300 font-bold focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    @{acc.username} ({acc.realName || 'User'} - {acc.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Mandatory Reason */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                Mandatory Legal Justification / Reason <span className="text-red-400">*</span>
              </label>
              <textarea
                value={exportReason}
                onChange={(e) => setExportReason(e.target.value)}
                rows={3}
                placeholder="e.g. Federal Law Enforcement Subpoena #8492-B, Court Order Enforcement, GDPR Compliance..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Scope Selection */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-2">
                Export Data Scope
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportScope.profile}
                    onChange={(e) => setExportScope({ ...exportScope, profile: e.target.checked })}
                    className="accent-purple-500"
                  />
                  <span>Account Profile & Identity</span>
                </label>
                <label className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportScope.telemetry}
                    onChange={(e) => setExportScope({ ...exportScope, telemetry: e.target.checked })}
                    className="accent-purple-500"
                  />
                  <span>Login & IP Telemetry</span>
                </label>
                <label className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportScope.reports}
                    onChange={(e) => setExportScope({ ...exportScope, reports: e.target.checked })}
                    className="accent-purple-500"
                  />
                  <span>Reports & Moderation History</span>
                </label>
                <label className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportScope.content}
                    onChange={(e) => setExportScope({ ...exportScope, content: e.target.checked })}
                    className="accent-purple-500"
                  />
                  <span>Public & Deleted Content</span>
                </label>
              </div>
            </div>

            {/* Export Format Buttons */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-2">
                Select Export Format
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setExportFormat('PDF')}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                    exportFormat === 'PDF'
                      ? 'bg-purple-600/20 border-purple-500 text-purple-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Printer className="w-5 h-5" />
                  <span className="text-xs">PDF Document</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat('CSV')}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                    exportFormat === 'CSV'
                      ? 'bg-purple-600/20 border-purple-500 text-purple-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileSpreadsheet className="w-5 h-5" />
                  <span className="text-xs">CSV Spreadsheet</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat('JSON')}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                    exportFormat === 'JSON'
                      ? 'bg-purple-600/20 border-purple-500 text-purple-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileCode className="w-5 h-5" />
                  <span className="text-xs">JSON Object</span>
                </button>
              </div>
            </div>

            {/* Generate Action Button */}
            <button
              onClick={handleGenerateExport}
              disabled={isExporting}
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isExporting ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Generate & Download Legal Export ({exportFormat})
            </button>
          </div>

          {lastExport && (
            <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 text-xs space-y-1">
              <div className="font-bold text-purple-300 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-400" /> Export Generated Successfully
              </div>
              <div className="text-[11px] text-slate-300 font-mono">
                Request ID: {lastExport.requestId} • {lastExport.timestamp}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: IMMUTABLE AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-purple-400" /> Cryptographic Immutable Audit Trail
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Every access to private compliance data and legal export generation is permanently logged and unalterable.
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-purple-300">
              Strict Immutability Enforced
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="p-3">Log ID</th>
                  <th className="p-3">Staff Actor</th>
                  <th className="p-3">Target Account</th>
                  <th className="p-3">Action / Information Viewed</th>
                  <th className="p-3">Reason for Access</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30">
                    <td className="p-3 text-slate-500">{log.id}</td>
                    <td className="p-3 text-purple-300 font-bold">
                      @{log.actorUsername} ({log.role || log.staffRole || 'admin'})
                    </td>
                    <td className="p-3 text-slate-200 font-semibold">{log.userAccountAccessed || log.targetResource}</td>
                    <td className="p-3 text-slate-300 max-w-[200px] truncate">{log.informationViewed || log.action}</td>
                    <td className="p-3 text-amber-300/90 italic">{log.reasonForAccess || log.details}</td>
                    <td className="p-3 text-slate-400">{log.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default LegalCompliancePortal;
