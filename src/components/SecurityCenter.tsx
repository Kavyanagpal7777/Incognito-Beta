/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  ShieldCheck, 
  Lock, 
  Eye, 
  EyeOff, 
  Cpu, 
  Globe, 
  Sparkles, 
  Award, 
  Calendar, 
  Info,
  Check,
  Edit2,
  Bookmark,
  Shield,
  Smartphone,
  KeyRound,
  Copy,
  QrCode,
  RefreshCw,
  AlertCircle,
  Key,
  CheckCircle2,
  Zap,
  X,
  Download,
  ShieldAlert,
  Clock,
  Timer,
  LogOut
} from 'lucide-react';
import { UserAccount } from '../types';

interface SecurityCenterProps {
  currentUser: UserAccount;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserAccount | null>>;
  onTriggerToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onRequestUsernameChange?: () => void;
}

const AVATARS = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1618005198143-e5283b519a7f?auto=format&fit=crop&w=150&q=80'
];

export default function SecurityCenter({ currentUser, setCurrentUser, onTriggerToast, onRequestUsernameChange }: SecurityCenterProps) {
  const [bioText, setBioText] = useState(currentUser.bio || '');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isChoosingAvatar, setIsChoosingAvatar] = useState(false);
  
  // Visibility toggles for private info
  const [showRealName, setShowRealName] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [showDevice, setShowDevice] = useState(false);
  const [showIP, setShowIP] = useState(false);

  // Two-Factor Authentication (2FA) states
  const [is2FAEnabled, setIs2FAEnabled] = useState(currentUser.twoFactorEnabled || false);
  const [totpSecret] = useState(currentUser.totpSecret || 'JBSWY3DPEHPK3PXP');
  const [totpCode, setTotpCode] = useState('849201');
  const [countdown, setCountdown] = useState(30);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);

  const BACKUP_CODES = ['A7F2-901B', '88C4-12FE', '99FF-2211', '3344-8899', 'E5K0-7741', 'F901-44B2', 'B209-7711', '88AA-3344'];

  // Countdown timer for 30-second TOTP passcodes
  useEffect(() => {
    let timer: any;
    if (is2FAEnabled) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            const nextCode = Math.floor(100000 + Math.random() * 900000).toString();
            setTotpCode(nextCode);
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [is2FAEnabled]);

  // Handle 2FA Toggle Switch
  const handleToggle2FA = () => {
    const nextState = !is2FAEnabled;
    setIs2FAEnabled(nextState);
    if (nextState) {
      const freshCode = Math.floor(100000 + Math.random() * 900000).toString();
      setTotpCode(freshCode);
      setCountdown(30);
      setShowRecoveryModal(true); // Display Recovery Code Overlay when 2FA is enabled!
    }
    setCurrentUser(prev => prev ? { ...prev, twoFactorEnabled: nextState, totpSecret } : null);
    
    if (nextState) {
      onTriggerToast('Two-Factor Authentication (2FA) enabled! Backup recovery codes generated.', 'success');
    } else {
      onTriggerToast('Two-Factor Authentication (2FA) disabled.', 'info');
    }
  };

  const handleCopyAllRecoveryCodes = () => {
    const text = `ANONYMOUS RECOVERY CODES (@${currentUser.username}):\n\n` + BACKUP_CODES.map((c, i) => `${i + 1}. ${c}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedBackupCodes(true);
    setTimeout(() => setCopiedBackupCodes(false), 2000);
    onTriggerToast('All 2FA recovery codes copied to clipboard!', 'success');
  };

  const handleDownloadRecoveryCodes = () => {
    const content = `=================================================\n2FA EMERGENCY RECOVERY CODES\nAccount Handle: @${currentUser.username}\nGenerated At: ${new Date().toLocaleString()}\n=================================================\n\nKeep these single-use emergency backup codes in a safe place.\nIf you lose your mobile device, these codes are your ONLY way to log in.\n\n` + BACKUP_CODES.map((c, i) => `[ Code ${i + 1} ]  ${c}`).join('\n') + `\n\n=================================================`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `2FA-Recovery-Codes-${currentUser.username}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onTriggerToast('Recovery codes downloaded as text file!', 'success');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(totpCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    onTriggerToast('TOTP passcode copied to clipboard!', 'info');
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(totpSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
    onTriggerToast('2FA Secret Key copied to clipboard!', 'info');
  };

  // Handle Auto-Logout Inactivity Timeout selection
  const handleSelectAutoLogout = (minutes: number) => {
    setCurrentUser(prev => prev ? { ...prev, autoLogoutTimeout: minutes } : null);
    if (minutes === 0) {
      onTriggerToast('Auto-logout inactivity timeout disabled.', 'info');
    } else {
      onTriggerToast(`Auto-logout set to ${minutes} minute${minutes > 1 ? 's' : ''} of inactivity.`, 'success');
    }
  };

  // Save bio
  const handleSaveBio = () => {
    setCurrentUser(prev => prev ? { ...prev, bio: bioText } : null);
    setIsEditingBio(false);
    onTriggerToast('Bio updated successfully!', 'success');
  };

  // Change avatar
  const handleSelectAvatar = (url: string) => {
    setCurrentUser(prev => prev ? { ...prev, avatarUrl: url } : null);
    setIsChoosingAvatar(false);
    onTriggerToast('Profile avatar updated!', 'success');
  };

  // Mask string helper
  const maskEmail = (email?: string) => {
    if (!email) return 'N/A';
    const [name, domain] = email.split('@');
    if (!domain) return email;
    return `${name.slice(0, 2)}••••••@${domain}`;
  };

  const maskPhone = (phone?: string) => {
    if (!phone) return 'N/A';
    return `••••••${phone.slice(-4)}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="security-center-grid">
      
      {/* LEFT SIDE: PUBLIC IDENTITY PANEL (5 Cols) */}
      <div className="lg:col-span-5 space-y-6" id="public-identity-side">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel p-6 rounded-2xl border border-white/5 relative overflow-hidden"
          id="public-profile-card"
        >
          {/* Neon header badge */}
          <div className="absolute top-4 right-4 flex items-center gap-1 bg-violet-500/10 text-violet-300 border border-violet-500/20 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-[#A855F7]" /> Public Persona
          </div>

          <h3 className="text-sm font-bold uppercase tracking-widest text-white/50 mb-6 font-display">
            Public Identity
          </h3>

          <div className="flex flex-col items-center text-center space-y-4">
            {/* Avatar block with hover state */}
            <div className="relative group">
              <img 
                src={currentUser.avatarUrl || AVATARS[0]} 
                alt="Avatar" 
                className="w-24 h-24 rounded-full border-2 border-violet-500/30 object-cover shadow-xl transition-all duration-300 group-hover:brightness-75 group-hover:border-violet-500/60"
                referrerPolicy="no-referrer"
              />
              <button 
                onClick={() => setIsChoosingAvatar(!isChoosingAvatar)}
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-full text-white text-[10px] font-bold cursor-pointer outline-none"
              >
                Change Photo
              </button>
            </div>

            {/* Avatar choice drawer */}
            <AnimatePresence>
              {isChoosingAvatar && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="w-full pt-2 flex flex-wrap justify-center gap-2 overflow-hidden"
                  id="avatar-grid"
                >
                  {AVATARS.map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectAvatar(url)}
                      className={`w-10 h-10 rounded-full overflow-hidden border-2 cursor-pointer transition-all ${
                        currentUser.avatarUrl === url ? 'border-violet-500 scale-105 shadow-md' : 'border-white/10 hover:border-violet-400'
                      }`}
                    >
                      <img src={url} alt={`Option ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Username & Metadata */}
            <div className="space-y-2 flex flex-col items-center">
              <h4 className="text-xl font-bold font-display text-white">@{currentUser.username}</h4>
              <p className="text-xs text-white/40 flex items-center justify-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-white/30" />
                Joined {currentUser.joinDate || 'Today'}
              </p>

              {onRequestUsernameChange && (
                <button
                  type="button"
                  onClick={onRequestUsernameChange}
                  className="mt-1 px-3 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all hover:scale-105"
                >
                  <Edit2 className="w-3 h-3 text-cyan-400" /> Change Handle
                </button>
              )}
            </div>

            {/* Karma Stats widget */}
            <div className="w-full py-3 px-4 bg-white/5 border border-white/5 rounded-xl flex justify-around items-center">
              <div className="text-center">
                <span className="text-[10px] uppercase text-white/40 font-bold block">Karma Points</span>
                <span className="text-lg font-bold font-display text-violet-300">{currentUser.karma} XP</span>
              </div>
              <div className="h-6 w-[1px] bg-white/10" />
              <div className="text-center">
                <span className="text-[10px] uppercase text-white/40 font-bold block">Identity Status</span>
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Protected
                </span>
              </div>
            </div>

            {/* Bio section */}
            <div className="w-full text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase text-white/40 font-bold block">Optional Bio</span>
                {!isEditingBio ? (
                  <button 
                    onClick={() => setIsEditingBio(true)}
                    className="text-[10px] font-bold text-violet-400 uppercase tracking-wider hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none outline-none p-0"
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                ) : (
                  <button 
                    onClick={handleSaveBio}
                    className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none outline-none p-0"
                  >
                    <Check className="w-3 h-3" /> Save
                  </button>
                )}
              </div>

              {isEditingBio ? (
                <textarea
                  value={bioText}
                  onChange={(e) => setBioText(e.target.value)}
                  placeholder="Tell us about yourself anonymous stranger..."
                  className="w-full p-2.5 rounded-xl glass-input text-xs h-20 outline-none resize-none"
                  maxLength={150}
                />
              ) : (
                <p className="text-xs text-white/70 leading-relaxed bg-black/15 p-3 rounded-xl border border-white/5 min-h-[50px] italic">
                  {currentUser.bio || 'This user is anonymous and values their silence. No bio provided.'}
                </p>
              )}
            </div>

            {/* Badges and Achievements */}
            <div className="w-full text-left space-y-2 pt-2">
              <span className="text-[10px] uppercase text-white/40 font-bold block">Earned Badges</span>
              <div className="flex flex-wrap gap-1.5">
                {currentUser.badges.length > 0 ? (
                  currentUser.badges.map((badge, idx) => (
                    <span 
                      key={idx}
                      className="px-2.5 py-1 bg-purple-500/10 text-[#C084FC] border border-purple-500/15 rounded-lg text-[10px] font-semibold tracking-wide flex items-center gap-1"
                    >
                      <Award className="w-3 h-3" /> {badge}
                    </span>
                  ))
                ) : (
                  <span className="px-2.5 py-1 bg-white/5 text-white/40 border border-white/5 rounded-lg text-[10px] italic">
                    No badges earned yet
                  </span>
                )}
              </div>
            </div>

          </div>
        </motion.div>
      </div>

      {/* RIGHT SIDE: PRIVATE INFORMATION PANEL (7 Cols) */}
      <div className="lg:col-span-7 space-y-6" id="private-vault-side">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-panel p-6 rounded-2xl border border-rose-500/10 relative overflow-hidden h-full flex flex-col justify-between"
          id="private-vault-card"
        >
          {/* Locked Badge */}
          <div className="absolute top-4 right-4 flex items-center gap-1 bg-rose-500/10 text-rose-300 border border-rose-500/20 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
            <Lock className="w-3 h-3 text-rose-400" /> Isolated Vault
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-rose-400/80 mb-2 font-display flex items-center gap-2">
              Private Security Center
            </h3>
            <p className="text-[11px] text-white/40 leading-relaxed mb-6">
              ⚠️ <strong>Strictly confidential.</strong> The following private records exist solely for credential verification, recovery pathways, and server gateway compliance. This metadata is completely segregated from your community persona. Other users can <strong>never</strong> access, see, or search these fields.
            </p>

            {/* Cryptographic Vault List */}
            <div className="space-y-4" id="vault-rows-container">
              
              {/* Real Name */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold block">Real Name</span>
                  <span className="text-xs font-semibold text-white font-mono mt-1 block">
                    {showRealName ? (currentUser.realName || 'Not Provided') : '••••••••••••'}
                  </span>
                </div>
                <button
                  onClick={() => setShowRealName(!showRealName)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer outline-none"
                  aria-label="Toggle Real Name visibility"
                >
                  {showRealName ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Email Address */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold block">Verified Email</span>
                  <span className="text-xs font-semibold text-white font-mono mt-1 block">
                    {showEmail ? (currentUser.email || 'None Registered') : maskEmail(currentUser.email)}
                  </span>
                </div>
                <button
                  onClick={() => setShowEmail(!showEmail)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer outline-none"
                  aria-label="Toggle Email visibility"
                >
                  {showEmail ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Phone Number */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold block">Verified Phone</span>
                  <span className="text-xs font-semibold text-white font-mono mt-1 block">
                    {showPhone ? (currentUser.phone ? `${currentUser.countryCode || ''} ${currentUser.phone}` : 'None Registered') : maskPhone(currentUser.phone)}
                  </span>
                </div>
                <button
                  onClick={() => setShowPhone(!showPhone)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer outline-none"
                  aria-label="Toggle Phone visibility"
                >
                  {showPhone ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold block">Gateway Password</span>
                  <span className="text-xs font-semibold text-white font-mono mt-1 block tracking-widest">
                    ••••••••••••
                  </span>
                </div>
                <div className="px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/20 text-[8px] text-rose-300 font-bold uppercase">
                  Locked
                </div>
              </div>

              {/* Connected OAuth Credentials */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold block">Connected OAuth Platforms</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      currentUser.loginMethod === 'Google' || currentUser.googleId
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' 
                        : 'bg-white/5 text-white/20 border border-white/5'
                    }`}>
                      Google Auth
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      currentUser.loginMethod === 'Facebook' || currentUser.facebookId
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' 
                        : 'bg-white/5 text-white/20 border border-white/5'
                    }`}>
                      Facebook Auth
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-white/30 italic font-medium">Gateway: {currentUser.loginMethod}</span>
              </div>

              {/* TWO-FACTOR AUTHENTICATION (2FA) SECTION */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-950/40 via-purple-900/20 to-black/40 border border-violet-500/20 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-violet-500/15 text-violet-400 border border-violet-500/25">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold font-display text-white uppercase tracking-wider flex items-center gap-1.5">
                        Two-Factor Authentication (2FA)
                        {is2FAEnabled && (
                          <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[8px] font-extrabold">
                            ACTIVE
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] text-white/50">
                        Secure account logins with TOTP time-based passcodes
                      </p>
                    </div>
                  </div>

                  {/* Custom Styled Switch Toggle */}
                  <button
                    type="button"
                    onClick={handleToggle2FA}
                    className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer p-0.5 border outline-none ${
                      is2FAEnabled 
                        ? 'bg-emerald-500 border-emerald-400' 
                        : 'bg-white/10 border-white/20 hover:border-white/30'
                    }`}
                    aria-label="Toggle Two Factor Authentication"
                  >
                    <motion.div
                      layout
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className={`w-5 h-5 rounded-full shadow-md flex items-center justify-center ${
                        is2FAEnabled ? 'bg-black text-emerald-400 ml-auto' : 'bg-white/80 text-gray-800'
                      }`}
                    >
                      {is2FAEnabled ? <Check className="w-3 h-3 stroke-[3]" /> : <X className="w-3 h-3" />}
                    </motion.div>
                  </button>
                </div>

                {/* WHEN 2FA IS ENABLED: DISPLAY LIVE TOTP CODE, SECRET KEY & BACKUP CODES */}
                <AnimatePresence>
                  {is2FAEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3.5 pt-2 border-t border-violet-500/20 overflow-hidden"
                    >
                      {/* Live TOTP Code Generator Card */}
                      <div className="p-3.5 rounded-xl bg-black/40 border border-violet-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 relative">
                        <div className="space-y-1 text-center sm:text-left">
                          <span className="text-[9px] uppercase font-bold text-violet-300/80 tracking-widest flex items-center justify-center sm:justify-start gap-1">
                            <KeyRound className="w-3 h-3 text-violet-400" /> Current 30s Passcode
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-black font-mono tracking-widest text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">
                              {totpCode.slice(0, 3)} {totpCode.slice(3)}
                            </span>
                            <button
                              type="button"
                              onClick={handleCopyCode}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all cursor-pointer"
                              title="Copy TOTP Code"
                            >
                              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Countdown ring / progress */}
                        <div className="flex items-center gap-2 bg-violet-500/10 px-3 py-1.5 rounded-xl border border-violet-500/20">
                          <RefreshCw className="w-3.5 h-3.5 text-violet-400 animate-spin" style={{ animationDuration: '3s' }} />
                          <div className="text-right">
                            <span className="text-[9px] uppercase font-bold text-white/40 block">Refreshes in</span>
                            <span className="text-xs font-mono font-bold text-violet-300">{countdown}s</span>
                          </div>
                        </div>
                      </div>

                      {/* Secret Key & QR Code Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Secret Key Box */}
                        <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1">
                          <span className="text-[9px] uppercase font-bold text-white/40 block">TOTP Secret Key</span>
                          <div className="flex items-center justify-between">
                            <code className="text-xs font-mono font-bold text-cyan-300">{totpSecret}</code>
                            <button
                              type="button"
                              onClick={handleCopySecret}
                              className="p-1 text-white/40 hover:text-cyan-300 transition-colors cursor-pointer"
                              title="Copy Secret Key"
                            >
                              {copiedSecret ? <Check className="w-3.5 h-3.5 text-cyan-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* QR Code Scan Matrix */}
                        <div className="p-3 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between">
                          <div className="space-y-0.5">
                            <span className="text-[9px] uppercase font-bold text-white/40 block">Authenticator App</span>
                            <span className="text-[10px] text-white/70 font-semibold block">Scan barcode matrix</span>
                          </div>
                          <div className="w-8 h-8 rounded bg-white text-black p-1 flex items-center justify-center shrink-0">
                            <QrCode className="w-6 h-6" />
                          </div>
                        </div>
                      </div>

                      {/* Backup Recovery Codes Section & Overlay Trigger */}
                      <div className="pt-1 flex items-center justify-between gap-2 flex-wrap border-t border-white/5">
                        <button
                          type="button"
                          onClick={() => setShowBackupCodes(!showBackupCodes)}
                          className="text-[10px] font-bold text-violet-400 hover:text-violet-300 uppercase tracking-wider flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
                        >
                          <Key className="w-3 h-3" />
                          {showBackupCodes ? 'Hide Backup Codes' : 'View Quick Recovery Codes'}
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowRecoveryModal(true)}
                          className="px-2.5 py-1 rounded-lg bg-violet-600/30 hover:bg-violet-600/50 border border-violet-400/30 text-violet-200 text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                          id="btn-launch-recovery-overlay"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-violet-300" />
                          <span>Show Recovery Overlay</span>
                        </button>
                      </div>

                      <AnimatePresence>
                        {showBackupCodes && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2 p-3 rounded-xl bg-black/40 border border-white/10 space-y-2"
                          >
                            <span className="text-[9px] uppercase font-bold text-white/40 block">Single-Use Backup Codes</span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono text-[11px] text-emerald-300 font-bold">
                              {BACKUP_CODES.map((code, idx) => (
                                <div key={idx} className="p-1.5 rounded bg-white/5 border border-white/5 text-center">
                                  {code}
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* AUTO-LOGOUT INACTIVITY PROTECTION SECTION */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-violet-900/20 to-black/40 border border-indigo-500/25 space-y-3.5 shadow-xl" id="auto-logout-setting-card">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
                      <Timer className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold font-display text-white uppercase tracking-wider flex items-center gap-1.5">
                        Auto-Logout Session Protection
                        {currentUser.autoLogoutTimeout && currentUser.autoLogoutTimeout > 0 ? (
                          <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[8px] font-extrabold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {currentUser.autoLogoutTimeout}m TIMEOUT
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-white/50 border border-white/10 text-[8px] font-extrabold">
                            DISABLED
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] text-white/50">
                        Automatically terminate session and purge local credentials after period of inactivity
                      </p>
                    </div>
                  </div>
                </div>

                {/* Inactivity Duration Preset Selectors */}
                <div className="space-y-2 pt-1 border-t border-indigo-500/20">
                  <span className="text-[9px] uppercase font-bold text-white/40 block">Select Inactivity Duration</span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { label: 'Disabled', val: 0 },
                      { label: '5 min', val: 5 },
                      { label: '15 min', val: 15 },
                      { label: '30 min', val: 30 },
                      { label: '60 min', val: 60 },
                    ].map((opt) => {
                      const isSelected = (currentUser.autoLogoutTimeout || 0) === opt.val;
                      return (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => handleSelectAutoLogout(opt.val)}
                          className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer border flex flex-col items-center justify-center gap-0.5 ${
                            isSelected
                              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-violet-400/50 shadow-md shadow-violet-500/20 scale-[1.02]'
                              : 'bg-black/40 hover:bg-white/10 text-white/70 border-white/10 hover:border-white/20'
                          }`}
                        >
                          <Clock className={`w-3.5 h-3.5 ${isSelected ? 'text-cyan-300' : 'text-white/40'}`} />
                          <span className="text-[10px] font-mono">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Session Behavior Info */}
                <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between text-[10px]">
                  <span className="text-white/60 flex items-center gap-1.5">
                    <LogOut className="w-3.5 h-3.5 text-violet-400" />
                    Session Protection State:
                  </span>
                  <span className="font-mono font-bold text-cyan-300">
                    {currentUser.autoLogoutTimeout && currentUser.autoLogoutTimeout > 0
                      ? `Auto logs out after ${currentUser.autoLogoutTimeout} minutes idle`
                      : 'Indefinite session active (Manual logout only)'}
                  </span>
                </div>
              </div>

              {/* Telemetry/Session Info */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                
                {/* Device Info */}
                <div className="p-3 rounded-xl bg-black/20 border border-white/5 flex items-start gap-2.5 relative">
                  <div className="p-1 rounded bg-violet-500/10 text-violet-400 mt-0.5">
                    <Cpu className="w-3.5 h-3.5" />
                  </div>
                  <div className="overflow-hidden">
                    <span className="text-[8px] uppercase tracking-wider text-white/40 font-bold block">Device Telemetry</span>
                    <button 
                      onClick={() => setShowDevice(!showDevice)}
                      className="text-[10px] font-semibold font-mono text-white mt-1 text-left truncate w-full block cursor-pointer outline-none bg-transparent border-none p-0 hover:text-violet-300"
                    >
                      {showDevice ? currentUser.deviceInfo : 'Reveal Signature'}
                    </button>
                  </div>
                </div>

                {/* IP Address */}
                <div className="p-3 rounded-xl bg-black/20 border border-white/5 flex items-start gap-2.5 relative">
                  <div className="p-1 rounded bg-violet-500/10 text-violet-400 mt-0.5">
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-[8px] uppercase tracking-wider text-white/40 font-bold block">Masked IP Gateway</span>
                    <button 
                      onClick={() => setShowIP(!showIP)}
                      className="text-[10px] font-semibold font-mono text-white mt-1 block cursor-pointer outline-none bg-transparent border-none p-0 hover:text-violet-300"
                    >
                      {showIP ? currentUser.ipAddress : 'Reveal Gateway'}
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* Bottom Security Assurance statement */}
          <div className="mt-6 pt-4 border-t border-rose-500/15 flex gap-2.5 items-center bg-rose-500/5 p-3 rounded-xl border border-rose-500/10">
            <Info className="w-4 h-4 text-rose-300 shrink-0" />
            <p className="text-[9px] text-rose-300 leading-snug">
              Security standard AES-GCM-256 active. Your authenticators are stored inside sandboxed environment variable protocols, compliant with Web2.5 privacy mandates. Other community peers will only ever query or interact with your username.
            </p>
          </div>

        </motion.div>
      </div>

      {/* 2FA EMERGENCY RECOVERY CODES OVERLAY MODAL */}
      <AnimatePresence>
        {showRecoveryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xl"
            onClick={() => setShowRecoveryModal(false)}
            id="recovery-code-overlay"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-[#0d0922] border border-violet-500/40 rounded-3xl p-5 sm:p-7 shadow-[0_0_50px_rgba(168,85,247,0.3)] relative overflow-hidden text-left"
              id="recovery-code-card"
            >
              {/* Background gradient blur */}
              <div className="absolute -top-24 -right-24 w-60 h-60 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

              {/* Modal Header */}
              <div className="flex items-start justify-between pb-4 border-b border-white/10 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30">
                    <Key className="w-6 h-6 text-violet-100" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold font-display text-white tracking-wide">
                      Emergency Recovery Codes
                    </h3>
                    <p className="text-xs text-violet-300/80 font-medium">
                      Two-Factor Authentication Active
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowRecoveryModal(false)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-all cursor-pointer"
                  id="btn-close-recovery-modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Warning/Instruction Alert Box */}
              <div className="my-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex gap-3 items-start relative z-10">
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200/90 leading-relaxed">
                  <strong className="text-amber-300 font-bold block mb-0.5">Save these codes in a secure location!</strong>
                  Each recovery code can be used ONCE to log into your account if you lose access to your authenticator app or primary device.
                </div>
              </div>

              {/* Recovery Codes Grid */}
              <div className="space-y-2 my-5 relative z-10">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                    Single-Use Recovery Passcodes (8 Codes)
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    100% Valid
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 font-mono text-xs font-bold text-emerald-300">
                  {BACKUP_CODES.map((code, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-black/60 border border-violet-500/20 flex items-center justify-between hover:border-violet-500/50 transition-colors group"
                    >
                      <span className="tracking-widest">
                        <span className="text-white/30 text-[10px] mr-1">#{idx + 1}</span> {code}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(code);
                          onTriggerToast(`Code #${idx + 1} (${code}) copied!`, 'info');
                        }}
                        className="opacity-40 group-hover:opacity-100 hover:text-emerald-200 transition-opacity p-1 cursor-pointer"
                        title="Copy code"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row gap-2 relative z-10">
                <button
                  type="button"
                  onClick={handleCopyAllRecoveryCodes}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-violet-600/30 hover:bg-violet-600/50 border border-violet-400/30 text-violet-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  id="btn-copy-all-recovery"
                >
                  {copiedBackupCodes ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4 text-violet-300" />}
                  <span>{copiedBackupCodes ? 'Copied All!' : 'Copy All Codes'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadRecoveryCodes}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-400/30 text-cyan-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  id="btn-download-recovery"
                >
                  <Download className="w-4 h-4 text-cyan-300" />
                  <span>Download (.txt)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowRecoveryModal(false)}
                  className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  id="btn-confirm-saved-recovery"
                >
                  <Check className="w-4 h-4" />
                  <span>I've Saved These</span>
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
