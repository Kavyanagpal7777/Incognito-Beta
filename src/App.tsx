/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mail,
  Lock,
  User,
  Smartphone,
  Eye,
  EyeOff,
  Check,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  ShieldCheck,
  KeyRound,
  LogOut,
  Moon,
  Sun,
  HelpCircle,
  Users,
  AtSign,
  ShieldAlert as VaultIcon
} from 'lucide-react';

import { CountryCode, UserAccount, Post } from './types';
import { 
  COUNTRY_CODES, 
  INITIAL_ACCOUNTS, 
  INITIAL_POSTS, 
  generateUsernameSuggestions 
} from './data/mockData';

// Modular Components
import LeftSidebar from './components/LeftSidebar';
import TopBar from './components/TopBar';
import PublicFeed from './components/PublicFeed';
import CommunitiesView from './components/communities/CommunitiesView';
import LeaderboardView from './components/LeaderboardView';
import MessagesView from './components/MessagesView';
import ProfileView from './components/ProfileView';
import SecurityCenter from './components/SecurityCenter';
import UsernameChangePage from './components/UsernameChangePage';
import AIUsernameGenerator from './components/AIUsernameGenerator';
import IncognitoLogo from './components/IncognitoLogo';
import InteractiveAtmosphere from './components/InteractiveAtmosphere';
import UserProfileModal from './components/UserProfileModal';
import AdminGovernancePanel from './components/AdminGovernancePanel';
import WelcomeLegalGateway from './components/WelcomeLegalGateway';
import FloatingPostButton from './components/FloatingPostButton';
import { ClerkAuthBridge, ClerkUserBadge } from './components/ClerkAuthBridge';
import { ClerkConfigModal } from './components/ClerkConfigModal';
import { Home, Trophy, MessageSquare, Menu, X as CloseIcon } from 'lucide-react';

const CURRENT_POLICY_VERSION = "1.0";

export default function App({ isClerkConfigured = false }: { isClerkConfigured?: boolean }) {
  const [mouseCoords, setMouseCoords] = useState({ x: 0, y: 0, normalizedX: 0, normalizedY: 0 });
  const [isClerkModalOpen, setIsClerkModalOpen] = useState(false);

  // Authentication & DB states (Persisted in Local Storage)
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Policy Agreement State
  const [hasAcceptedPolicy, setHasAcceptedPolicy] = useState<boolean>(() => {
    const savedAccepted = localStorage.getItem('incognito_policy_accepted');
    const savedVersion = localStorage.getItem('incognito_policy_version');
    return savedAccepted === 'true' && savedVersion === CURRENT_POLICY_VERSION;
  });

  // Tab & Navigation Management
  const [sidebarTab, setSidebarTab] = useState<'home' | 'communities' | 'leaderboard' | 'messages' | 'profile' | 'settings' | 'admin'>('home');
  const [viewingProfileUsername, setViewingProfileUsername] = useState<string | null>(null);
  const [isAnonymousMode, setIsAnonymousMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Tab management inside security vault ('security' | 'username')
  const [dashboardTab, setDashboardTab] = useState<'security' | 'username'>('security');

  // Navigation Tabs for login gate: 'login' | 'signup' | 'recover'
  const [authTab, setAuthTab] = useState<'login' | 'signup' | 'recover'>('signup');

  // Recovery Form Fields & State
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryNotice, setRecoveryNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Input Toggles: 'email' | 'phone'
  const [loginMode, setLoginMode] = useState<'email' | 'phone'>('email');
  const [signupMode, setSignupMode] = useState<'email' | 'phone'>('email');

  // Login Form Fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginCountryCode, setLoginCountryCode] = useState<CountryCode>(COUNTRY_CODES[0]);

  // Sign Up Form Fields
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupCountryCode, setSignupCountryCode] = useState<CountryCode>(COUNTRY_CODES[0]);
  const [signupRealName, setSignupRealName] = useState('');

  // Real-time Username Check States (for Signup Form)
  const [signupUsernameStatus, setSignupUsernameStatus] = useState<'empty' | 'validating' | 'available' | 'taken' | 'invalid'>('empty');
  const [signupUsernameError, setSignupUsernameError] = useState('');
  const [signupUsernameSuggestions, setSignupUsernameSuggestions] = useState<string[]>([]);
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Settings & Toggles
  const [rememberMe, setRememberMe] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Dropdown states
  const [isLoginCountryOpen, setIsLoginCountryOpen] = useState(false);
  const [isSignupCountryOpen, setIsSignupCountryOpen] = useState(false);
  const loginDropdownRef = useRef<HTMLDivElement>(null);
  const signupDropdownRef = useRef<HTMLDivElement>(null);

  // FX feedback states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    // 1. Initial Accounts
    const localAccounts = localStorage.getItem('incognito_accounts') || localStorage.getItem('aetheris_accounts');
    if (localAccounts) {
      try {
        const parsed: UserAccount[] = JSON.parse(localAccounts);
        const sanitized = parsed.map((acc: UserAccount) => {
          if (acc.id === 'usr_4' && acc.email === 'kavyanagpal0005@gmail.com') {
            return { ...acc, email: 'void@incognito.sec', realName: 'Cipher Nexus' };
          }
          return acc;
        });
        setAccounts(sanitized);
        localStorage.setItem('incognito_accounts', JSON.stringify(sanitized));
      } catch (e) {
        setAccounts(INITIAL_ACCOUNTS);
      }
    } else {
      localStorage.setItem('incognito_accounts', JSON.stringify(INITIAL_ACCOUNTS));
      setAccounts(INITIAL_ACCOUNTS);
    }

    // 2. Initial Posts
    const localPosts = localStorage.getItem('incognito_posts') || localStorage.getItem('aetheris_posts');
    if (localPosts) {
      setPosts(JSON.parse(localPosts));
    } else {
      localStorage.setItem('incognito_posts', JSON.stringify(INITIAL_POSTS));
      setPosts(INITIAL_POSTS);
    }

    // 3. Keep-alive check for auto-login
    const savedUser = localStorage.getItem('incognito_current_user') || localStorage.getItem('aetheris_current_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
  }, []);

  // --- REAL-TIME NETWORK POST POLLING SYNC ---
  useEffect(() => {
    const fetchNetworkPosts = async () => {
      try {
        const res = await fetch('/api/posts');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.posts) && data.posts.length > 0) {
            setPosts(prev => {
              const savedMap = new Map<string, boolean>();
              const upvotedMap = new Map<string, boolean>();
              prev.forEach(p => {
                if (p.isSaved) savedMap.set(p.id, true);
                if (p.isUpvoted) upvotedMap.set(p.id, true);
              });

              const updated = data.posts.map((sp: Post) => ({
                ...sp,
                isSaved: savedMap.has(sp.id) ? true : sp.isSaved,
                isUpvoted: upvotedMap.has(sp.id) ? true : sp.isUpvoted
              }));

              localStorage.setItem('incognito_posts', JSON.stringify(updated));
              return updated;
            });
          }
        }
      } catch (err) {
        // Quiet retry on network idle
      }
    };

    fetchNetworkPosts();
    const interval = setInterval(fetchNetworkPosts, 3000);
    return () => clearInterval(interval);
  }, []);

  // Sync state modifications to localStorage
  useEffect(() => {
    if (accounts.length > 0) {
      localStorage.setItem('incognito_accounts', JSON.stringify(accounts));
    }
  }, [accounts]);

  useEffect(() => {
    if (posts.length > 0) {
      localStorage.setItem('incognito_posts', JSON.stringify(posts));
    }
  }, [posts]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('incognito_current_user', JSON.stringify(currentUser));
    }
  }, [currentUser]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (loginDropdownRef.current && !loginDropdownRef.current.contains(event.target as Node)) {
        setIsLoginCountryOpen(false);
      }
      if (signupDropdownRef.current && !signupDropdownRef.current.contains(event.target as Node)) {
        setIsSignupCountryOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toast Auto-Hide helper
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // URL Hash Route Protection (#/admin or #admin)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#/admin' || hash === '#admin') {
        const user = currentUser || (localStorage.getItem('incognito_current_user') ? JSON.parse(localStorage.getItem('incognito_current_user')!) : null);
        const isAdmin = user && user.email?.toLowerCase() === 'kavyanagpal0005@gmail.com';
        if (isAdmin) {
          setSidebarTab('admin');
        } else {
          setToast({ message: 'HTTP 403 Forbidden: Administrative panel access is restricted exclusively to kavyanagpal0005@gmail.com.', type: 'error' });
          setSidebarTab('home');
          window.location.hash = '#/home';
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    if (window.location.hash === '#/admin' || window.location.hash === '#admin') {
      handleHashChange();
    }
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentUser]);

  // Keyboard Navigation & Scrolling Controls for Main Feed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not hijack browser shortcuts with modifier keys (Ctrl, Alt, Meta)
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      // Check if user is typing in an editable field, input, textarea, contenteditable, or search field
      const target = e.target as HTMLElement | null;
      if (target) {
        const isEditable = 
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable ||
          target.getAttribute('contenteditable') === 'true' ||
          target.closest('input, textarea, select, [contenteditable="true"]') !== null;

        if (isEditable) return;
      }

      // Identify scroll container: <main> if scrollable, or window / scrolling element
      const mainContainer = document.querySelector('main');
      const container = (mainContainer && mainContainer.scrollHeight > mainContainer.clientHeight)
        ? mainContainer
        : (document.scrollingElement || document.documentElement);

      const screenHeight = container.clientHeight || window.innerHeight;
      const scrollStep = 120; // Step size for arrow keys

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          container.scrollBy({ top: scrollStep, behavior: 'smooth' });
          break;
        case 'ArrowUp':
          e.preventDefault();
          container.scrollBy({ top: -scrollStep, behavior: 'smooth' });
          break;
        case 'PageDown':
          e.preventDefault();
          container.scrollBy({ top: screenHeight * 0.85, behavior: 'smooth' });
          break;
        case 'PageUp':
          e.preventDefault();
          container.scrollBy({ top: -screenHeight * 0.85, behavior: 'smooth' });
          break;
        case ' ':
          e.preventDefault();
          if (e.shiftKey) {
            container.scrollBy({ top: -screenHeight * 0.85, behavior: 'smooth' });
          } else {
            container.scrollBy({ top: screenHeight * 0.85, behavior: 'smooth' });
          }
          break;
        case 'Home':
          e.preventDefault();
          container.scrollTo({ top: 0, behavior: 'smooth' });
          break;
        case 'End':
          e.preventDefault();
          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Real-time Username Checking Logic (Sign Up Form)
  useEffect(() => {
    if (!signupUsername.trim()) {
      setSignupUsernameStatus('empty');
      setSignupUsernameError('');
      setSignupUsernameSuggestions([]);
      return;
    }

    setSignupUsernameStatus('validating');
    setCheckingUsername(true);

    const timer = setTimeout(() => {
      setCheckingUsername(false);

      // Rule 1: Length check (3-20 characters)
      if (signupUsername.length < 3 || signupUsername.length > 20) {
        setSignupUsernameStatus('invalid');
        setSignupUsernameError('Username must be 3–20 characters.');
        setSignupUsernameSuggestions(generateUsernameSuggestions(signupUsername));
        return;
      }

      // Rule 2: Allowed characters (A-Z, a-z, 0-9, _, .)
      if (!/^[a-zA-Z0-9_.]+$/.test(signupUsername)) {
        setSignupUsernameStatus('invalid');
        setSignupUsernameError('Only letters, numbers, underscores (_), and periods (.) allowed.');
        setSignupUsernameSuggestions(generateUsernameSuggestions(signupUsername));
        return;
      }

      // Rule 3: Uniqueness check against all existing accounts
      const isTaken = accounts.some(acc => acc.username.toLowerCase() === signupUsername.trim().toLowerCase());
      if (isTaken) {
        setSignupUsernameStatus('taken');
        setSignupUsernameError('This username is already taken.');
        setSignupUsernameSuggestions(generateUsernameSuggestions(signupUsername));
      } else {
        setSignupUsernameStatus('available');
        setSignupUsernameError('');
        setSignupUsernameSuggestions([]);
      }
    }, 500); // 500ms debounce to feel highly responsive and professional

    return () => clearTimeout(timer);
  }, [signupUsername, accounts]);

  const triggerToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
  };

  const handleDeletePost = async (postId: string) => {
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
        triggerToast('Unable to delete post. Please try again.', 'error');
        return;
      }

      setPosts(prev => {
        const updated = prev.filter(p => p.id !== postId);
        localStorage.setItem('incognito_posts', JSON.stringify(updated));
        localStorage.setItem('aetheris_posts', JSON.stringify(updated));
        return updated;
      });
      triggerToast('Post deleted successfully.', 'info');
    } catch (err) {
      console.error('Error deleting post on server:', err);
      triggerToast('Unable to delete post. Please try again.', 'error');
    }
  };

  const handleVotePoll = async (postId: string, optionId: string) => {
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
            updatedOptions = updatedOptions.map(opt => {
              if (opt.id === optionId) return { ...opt, votes: Math.max(0, (opt.votes || 0) - 1) };
              return opt;
            });
            updatedTotalVotes = Math.max(0, updatedTotalVotes - 1);
            newUserVotedId = undefined;
          } else if (isChangingVote) {
            updatedOptions = updatedOptions.map(opt => {
              if (opt.id === optionId) return { ...opt, votes: (opt.votes || 0) + 1 };
              if (opt.id === currentPoll.userVotedId) return { ...opt, votes: Math.max(0, (opt.votes || 0) - 1) };
              return opt;
            });
            newUserVotedId = optionId;
          } else {
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
      console.error('Error syncing poll vote to server:', err);
    }
  };

  // --- FORM SUBMIT HANDLERS ---

  // LOGIN PROCESS
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let identifier = '';
    if (loginMode === 'email') {
      identifier = loginEmail.trim();
      if (!identifier || !loginPassword) {
        triggerToast('Please provide both your email/handle and password.', 'error');
        return;
      }
    } else {
      identifier = loginPhone.replace(/[\s\-\(\)]/g, '');
      if (!identifier || !loginPassword) {
        triggerToast('Please enter both mobile number and password.', 'error');
        return;
      }
    }

    setIsSubmitting(true);
    setSubmitMessage('Verifying authentication credentials...');

    try {
      // Sanitize: lowercase for email/handle
      const cleanIdentifier = loginMode === 'email' ? identifier.toLowerCase() : identifier;
      const payload = {
        identifier: cleanIdentifier,
        email: loginMode === 'email' ? cleanIdentifier : undefined,
        phone: loginMode === 'phone' ? identifier : undefined,
        password: loginPassword,
        loginMethod: loginMode
      };

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let data: any = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (jsonErr) {
          console.error('[LOGIN_ERROR] JSON parse failed:', jsonErr);
        }
      }

      setIsSubmitting(false);

      if (response.ok && data && data.success && data.user) {
        const userAccount: UserAccount = data.user;
        setCurrentUser(userAccount);
        setIsAuthenticated(true);

        if (rememberMe) {
          localStorage.setItem('incognito_current_user', JSON.stringify(userAccount));
          localStorage.setItem('aetheris_current_user', JSON.stringify(userAccount));
        }

        if (data.redirectTo === '/admin' || userAccount.role === 'super_admin' || userAccount.role === 'owner') {
          setSidebarTab('admin');
          window.location.hash = '#/admin';
          triggerToast(`Authenticated: Administrator @${userAccount.username}. Governance Panel unlocked.`, 'success');
        } else {
          setSidebarTab('home');
          window.location.hash = '#/home';
          triggerToast(`Authenticated: Welcome back @${userAccount.username}!`, 'success');
        }
      } else {
        const errorMessage = data?.message || data?.error || 'Invalid email/ID or password.';
        triggerToast(errorMessage, 'error');
      }
    } catch (err) {
      setIsSubmitting(false);
      triggerToast('Invalid email/ID or password.', 'error');
    }
  };

  // REGISTRATION SIGNUP PROCESS
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedUsername = signupUsername.trim();
    const cleanUsername = trimmedUsername.startsWith('@') ? trimmedUsername.slice(1) : trimmedUsername;
    if (!cleanUsername) {
      triggerToast('Please enter a username handle.', 'error');
      return;
    }

    if (cleanUsername.length < 3 || cleanUsername.length > 20) {
      triggerToast('Username must be 3–20 characters.', 'error');
      return;
    }

    if (!/^[a-zA-Z0-9_.]+$/.test(cleanUsername)) {
      triggerToast('Only letters, numbers, underscores (_), and periods (.) allowed in handle.', 'error');
      return;
    }

    const isTaken = accounts.some(acc => acc.username.trim().toLowerCase() === cleanUsername.toLowerCase());
    if (isTaken) {
      triggerToast('Handle taken', 'error');
      return;
    }

    const sanitizedEmail = signupEmail.trim().toLowerCase();
    if (signupMode === 'email') {
      if (!sanitizedEmail || !/\S+@\S+\.\S+/.test(sanitizedEmail)) {
        triggerToast('Please enter a valid email address.', 'error');
        return;
      }
    } else {
      const sanitizedPhone = signupPhone.replace(/[\s\-\(\)]/g, '');
      if (!sanitizedPhone || !/^\+?\d{7,15}$/.test(sanitizedPhone)) {
        triggerToast('Please enter a valid mobile number (7–15 digits).', 'error');
        return;
      }
    }

    if (!signupPassword || signupPassword.length < 8) {
      triggerToast('Password must be at least 8 characters long.', 'error');
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      triggerToast('Passwords do not match.', 'error');
      return;
    }

    if (!agreeToTerms) {
      triggerToast('You must agree to the Terms & Conditions.', 'error');
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage('Provisioning secure user vault...');

    try {
      const generatedUserId = `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
      const response = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: generatedUserId,
          username: cleanUsername,
          realName: signupRealName.trim() || 'Anonymous Vault Member',
          email: signupMode === 'email' ? sanitizedEmail : undefined,
          phone: signupMode === 'phone' ? signupPhone.replace(/[\s\-\(\)]/g, '') : undefined,
          password: signupPassword,
          loginMethod: signupMode === 'email' ? 'Email' : 'Mobile'
        })
      });

      let data: any = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (jsonErr) {
          console.error('[REGISTRATION_ERROR] JSON Parse Error:', jsonErr);
        }
      }

      setIsSubmitting(false);

      if ((response.ok || response.status === 201) && data && data.success && data.user) {
        const newAccount: UserAccount = data.user;
        setCurrentUser(newAccount);
        setIsAuthenticated(true);
        setAccounts(prev => [newAccount, ...prev.filter(a => a.id !== newAccount.id)]);
        localStorage.setItem('incognito_current_user', JSON.stringify(newAccount));
        localStorage.setItem('aetheris_current_user', JSON.stringify(newAccount));

        // Reset form fields
        setSignupUsername('');
        setSignupEmail('');
        setSignupPhone('');
        setSignupPassword('');
        setSignupConfirmPassword('');
        setSignupRealName('');
        setAgreeToTerms(false);

        if (data.redirectTo === '/admin') {
          setSidebarTab('admin');
          window.location.hash = '#/admin';
          triggerToast('Superadmin Profile created! Admin Governance Panel unlocked.', 'success');
        } else {
          setSidebarTab('home');
          window.location.hash = '#/home';
          triggerToast('Your secure public identity has been created!', 'success');
        }
      } else {
        // Handle explicit collision cases
        if (data?.field === 'email' || data?.error === 'DUPLICATE_EMAIL' || (data?.message && data.message.toLowerCase().includes('already exists with this email'))) {
          triggerToast('Account already exists with this email', 'error');
          if (sanitizedEmail) {
            setLoginEmail(sanitizedEmail);
            setLoginMode('email');
            setAuthTab('login');
          }
          return;
        }

        if (data?.field === 'username' || data?.error === 'USERNAME_TAKEN' || (data?.message && data.message.toLowerCase().includes('handle taken'))) {
          triggerToast('Handle taken', 'error');
          return;
        }

        const errorMessage = data?.message || data?.error || 'An account with these credentials already exists.';
        triggerToast(errorMessage, 'error');
      }
    } catch (err: any) {
      console.error('[REGISTRATION_ERROR] Unhandled Exception:', err);
      setIsSubmitting(false);
      triggerToast('An error occurred during registration. Please try again.', 'error');
    }
  };

  // PASSWORD RECOVERY HANDLER (Rate-Limited, Non-Enumerative)
  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryNotice(null);

    if (!recoveryIdentifier.trim()) {
      triggerToast('Please enter your registered email address or handle.', 'error');
      return;
    }

    setRecoveryLoading(true);
    try {
      const response = await fetch('/api/auth/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: recoveryIdentifier.trim() })
      });

      const data = await response.json();

      if (response.status === 429) {
        const msg = data.message || 'Too many recovery attempts. Please try again later.';
        setRecoveryNotice({ type: 'error', message: msg });
        triggerToast(msg, 'error');
      } else {
        const msg = data.message || 'If an account matching those credentials exists in our system, a password recovery notification has been dispatched.';
        setRecoveryNotice({ type: 'success', message: msg });
        triggerToast(msg, 'success');
      }
    } catch (err) {
      setRecoveryNotice({ type: 'error', message: 'Unable to connect to recovery gateway. Please check network status.' });
      triggerToast('Network error during recovery request.', 'error');
    } finally {
      setRecoveryLoading(false);
    }
  };

  // LOGOUT PROCESS
  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('incognito_current_user');
    localStorage.removeItem('aetheris_current_user');
    setLoginPassword('');
    setSignupPassword('');
    setSignupConfirmPassword('');
    setSignupUsername('');
    triggerToast('Securely signed out. Session telemetry purged.', 'info');
  };

  // Auto-Logout Inactivity Timer
  useEffect(() => {
    if (!isAuthenticated || !currentUser || !currentUser.autoLogoutTimeout || currentUser.autoLogoutTimeout <= 0) {
      return;
    }

    const timeoutMinutes = currentUser.autoLogoutTimeout;
    const timeoutMs = timeoutMinutes * 60 * 1000;
    let timer: NodeJS.Timeout;

    const resetInactivityTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setIsAuthenticated(false);
        setCurrentUser(null);
        localStorage.removeItem('incognito_current_user');
        localStorage.removeItem('aetheris_current_user');
        setLoginPassword('');
        setSignupPassword('');
        setSignupConfirmPassword('');
        setSignupUsername('');
        setToast({
          message: `Session auto-terminated after ${timeoutMinutes} minute${timeoutMinutes > 1 ? 's' : ''} of inactivity.`,
          type: 'info'
        });
      }, timeoutMs);
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    
    // Initial start of inactivity timer
    resetInactivityTimer();

    // Reset inactivity timer on user interaction
    activityEvents.forEach(evt => {
      window.addEventListener(evt, resetInactivityTimer, { passive: true });
    });

    return () => {
      clearTimeout(timer);
      activityEvents.forEach(evt => {
        window.removeEventListener(evt, resetInactivityTimer);
      });
    };
  }, [isAuthenticated, currentUser?.autoLogoutTimeout]);


  return (
    <InteractiveAtmosphere onMouseMoveCoords={setMouseCoords}>
      {/* CLERK DASHBOARD CONFIGURATION / HELP MODAL */}
      <ClerkConfigModal
        isOpen={isClerkModalOpen}
        onClose={() => setIsClerkModalOpen(false)}
      />

      {/* WELCOME & LEGAL GATEWAY MODAL FOR UNVERIFIED / FIRST-TIME / UPDATED USERS */}
      {!hasAcceptedPolicy && (
        <WelcomeLegalGateway
          userId={currentUser?.id}
          username={currentUser?.username}
          onAccept={(version) => setHasAcceptedPolicy(true)}
        />
      )}

      {/* Custom Global Glassmorphism Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#080d1a]/90 border border-cyan-500/40 shadow-[0_8px_32px_rgba(0,217,255,0.25)] backdrop-blur-xl text-xs whitespace-nowrap"
            id="global-toast-alert"
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {toast.type === 'error' && <ShieldAlert className="w-4 h-4 text-rose-400" />}
            {toast.type === 'info' && <Sparkles className="w-4 h-4 text-cyan-300" />}
            <span className="font-semibold tracking-wide text-white">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Loader Overlay */}
      <AnimatePresence>
        {isSubmitting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#050811]/90 backdrop-blur-2xl z-50 flex flex-col items-center justify-center p-6"
            id="global-loader-overlay"
          >
            <div className="relative flex flex-col items-center">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20" />
                <motion.div 
                  className="absolute inset-0 rounded-full border-t-2 border-r-2 border-cyan-400 shadow-[0_0_20px_rgba(0,217,255,0.4)]"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                />
                <Sparkles className="w-8 h-8 text-cyan-300 animate-pulse" />
              </div>

              <motion.h3 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-8 text-xl font-display font-bold tracking-wider text-white uppercase"
              >
                INCÓGNITO Gateway
              </motion.h3>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-2 text-xs text-cyan-300/80 font-medium tracking-wide animate-pulse text-center max-w-xs"
              >
                {submitMessage}
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CONTAINER LAYOUT */}
      <AnimatePresence mode="wait">
        {!isAuthenticated ? (
          <motion.div
            key="auth-portal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full min-h-screen overflow-y-auto flex flex-col lg:flex-row z-10"
          >
            {/* LEFT SECTION (Branding Panel - 42% on Desktop, Compact Header on Tablet/Mobile) */}
            <div 
              className="w-full lg:w-[42%] flex flex-col justify-between p-2.5 sm:p-4 lg:p-10 relative border-b border-cyan-500/15 lg:border-b-0 lg:border-r lg:border-cyan-500/20 h-auto lg:h-full flex-none overflow-hidden bg-gradient-to-b lg:bg-gradient-to-r from-[#070d1e]/80 via-[#060a14] to-transparent z-10"
              id="left-branding-section"
            >
              {/* Top-Left Translucent Wireframe Mask Shield Watermark - Desktop Only */}
              <div className="hidden lg:block absolute -top-12 -left-12 w-96 h-96 opacity-[0.14] pointer-events-none text-cyan-400">
                <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full stroke-current stroke-[1]">
                  <path d="M100 20L170 50V100C170 145 138 178 100 190C62 178 30 145 30 100V50L100 20Z" />
                  <path d="M60 85C70 80 85 85 90 95C85 98 70 98 60 85Z" fill="currentColor" opacity="0.3" />
                  <path d="M140 85C130 80 115 85 110 95C115 98 130 98 140 85Z" fill="currentColor" opacity="0.3" />
                </svg>
              </div>

              {/* Cinematic ambient cyan light flare */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 lg:w-96 h-80 lg:h-96 rounded-full bg-cyan-500/15 blur-[100px] lg:blur-[120px] pointer-events-none" />

              <div className="flex flex-col items-center text-center z-10 max-w-md mx-auto my-0 lg:my-auto space-y-2 md:space-y-2.5 lg:space-y-6">
                {/* Floating Futuristic Shield Logo */}
                <IncognitoLogo 
                  size="auth-hero" 
                  showText={false} 
                  className="flex-col"
                  tiltX={mouseCoords.normalizedX}
                  tiltY={mouseCoords.normalizedY}
                />

                {/* Typography: INCÓGNITO */}
                <div className="space-y-1 md:space-y-1.5">
                  <h1 className="text-[32px] md:text-[40px] lg:text-5xl font-black font-display tracking-[0.16em] md:tracking-[0.18em] leading-none bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-100 to-blue-300 uppercase drop-shadow-[0_0_30px_rgba(0,217,255,0.6)]">
                    INCÓGNITO
                  </h1>

                  {/* Tagline: ANONYMOUS. HONEST. UNFILTERED. */}
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-[14px] lg:text-sm font-bold uppercase tracking-[0.18em] md:tracking-[0.2em] lg:tracking-[0.22em] text-white/70">
                    <span>ANONYMOUS.</span>
                    <span>HONEST.</span>
                    <span className="text-[#00D9FF] drop-shadow-[0_0_12px_rgba(0,217,255,0.8)] font-black">
                      UNFILTERED.
                    </span>
                  </div>
                </div>

                {/* 3 Premium Feature Cards with Glassmorphism & Lift-on-Hover - Hidden on Mobile & Tablet */}
                <div className="hidden lg:grid grid-cols-1 gap-3 w-full pt-1">
                  <motion.div 
                    whileHover={{ y: -3, scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="p-3.5 rounded-2xl bg-[#081022]/60 border border-cyan-500/25 backdrop-blur-xl flex items-center justify-between gap-3 text-left shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:border-cyan-400/50 hover:bg-[#0d172e]/70 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex-shrink-0 group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(0,217,255,0.25)]">
                        <ShieldCheck className="w-5 h-5 text-cyan-300" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white tracking-wide">Zero Identity Telemetry</h4>
                        <p className="text-[10.5px] text-white/50 leading-relaxed">Real names, emails & phone numbers remain isolated.</p>
                      </div>
                    </div>
                    {/* Glowing White Dot on Right Edge */}
                    <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_#ffffff] flex-shrink-0" />
                  </motion.div>

                  <motion.div 
                    whileHover={{ y: -3, scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="p-3.5 rounded-2xl bg-[#081022]/60 border border-cyan-500/25 backdrop-blur-xl flex items-center justify-between gap-3 text-left shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:border-cyan-400/50 hover:bg-[#0d172e]/70 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 flex-shrink-0 group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(35,136,255,0.25)]">
                        <Sparkles className="w-5 h-5 text-blue-300" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white tracking-wide">AI Neural Personas</h4>
                        <p className="text-[10.5px] text-white/50 leading-relaxed">Generate unique anonymous handles instantly with Gemini 1.5 Pro.</p>
                      </div>
                    </div>
                    {/* Glowing White Dot on Right Edge */}
                    <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_#ffffff] flex-shrink-0" />
                  </motion.div>

                  <motion.div 
                    whileHover={{ y: -3, scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="p-3.5 rounded-2xl bg-[#081022]/60 border border-cyan-500/25 backdrop-blur-xl flex items-center justify-between gap-3 text-left shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:border-cyan-400/50 hover:bg-[#0d172e]/70 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 flex-shrink-0 group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(20,184,166,0.25)]">
                        <KeyRound className="w-5 h-5 text-teal-300" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white tracking-wide">Hardware TOTP & 2FA</h4>
                        <p className="text-[10.5px] text-white/50 leading-relaxed">Multi-factor authorization & offline backup recovery codes.</p>
                      </div>
                    </div>
                    {/* Glowing White Dot on Right Edge */}
                    <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_#ffffff] flex-shrink-0" />
                  </motion.div>
                </div>

                {/* Glowing Floor Stage Portal Platform Ring - Hidden on Mobile & Tablet */}
                <div className="hidden lg:flex relative w-full h-8 mt-2 items-center justify-center pointer-events-none">
                  <div className="w-48 h-5 rounded-[100%] border border-cyan-400/50 bg-gradient-to-r from-blue-500/20 via-cyan-500/30 to-teal-500/20 blur-[1px] shadow-[0_0_25px_rgba(0,217,255,0.4)]" />
                  <div className="absolute w-32 h-2 rounded-[100%] bg-cyan-400 blur-sm animate-pulse" />
                </div>
              </div>
            </div>

            {/* RIGHT SECTION (Authentication Card Panel - 58% on Desktop, Full Width on Tablet/Mobile) */}
            <div 
              className="w-full lg:w-[58%] flex items-center justify-center p-2 sm:p-4 lg:p-8 relative z-10 min-h-full flex-1 overflow-y-auto py-2 sm:py-6 lg:py-8"
              id="right-auth-section"
            >
              {/* Glowing Neon Perimeter Border Frame Wrapper */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-[92%] sm:w-[90%] lg:w-full max-w-[490px] p-[1.5px] rounded-[24px] sm:rounded-[32px] bg-gradient-to-b from-blue-500/70 via-cyan-500/40 to-teal-600/60 shadow-[0_0_50px_rgba(0,217,255,0.3)] relative my-1 sm:my-3 lg:my-auto mx-auto mt-3 md:mt-4 lg:mt-0"
              >
                {/* Inner Glassmorphism Card */}
                <div
                  className="w-full bg-[#080d1a]/90 backdrop-blur-2xl rounded-[22px] sm:rounded-[30px] p-3 sm:p-5 lg:p-8 relative flex flex-col justify-between overflow-hidden"
                  id="auth-card"
                >
                  {/* Top Glass Highlight Reflection Beam */}
                  <div className="absolute top-0 left-1/6 right-1/6 h-[1px] bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent pointer-events-none" />
                  
                  {/* Card Header & Encrypted Top-Right Badge */}
                  <div className="text-left mb-2 sm:mb-3 lg:mb-4 flex-none" id="card-welcome-header">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold font-display text-white tracking-wide">
                        {authTab === 'login' ? 'Portal Gateway' : authTab === 'signup' ? 'Forge Persona' : 'Account Recovery'}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-400/40 text-[9px] sm:text-[10px] font-black text-cyan-300 uppercase tracking-widest flex items-center gap-1 shadow-[0_0_15px_rgba(0,217,255,0.25)]">
                        <ShieldCheck className="w-3 h-3 text-cyan-400" />
                        🛡 ENCRYPTED
                      </span>
                    </div>
                    <p className="text-white/50 text-[11px] sm:text-xs mt-0.5">
                      {authTab === 'login' 
                        ? 'Authenticate into your encrypted anonymous workspace.' 
                        : authTab === 'signup'
                        ? 'Claim your untraceable identity on the network.'
                        : 'Zero-knowledge non-enumerative reset gateway.'}
                    </p>
                  </div>

                {/* LOGIN & SIGN UP SEGMENTED NAV TABS */}
                {authTab !== 'recover' && (
                  <div className="p-1 bg-black/50 border border-white/10 rounded-2xl mb-2.5 sm:mb-3.5 lg:mb-4 w-full flex-none relative" id="nav-tabs-container">
                    <div className="grid grid-cols-2 gap-1 relative z-10">
                      <button
                        type="button"
                        onClick={() => { setAuthTab('login'); setRecoveryNotice(null); }}
                        className={`py-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          authTab === 'login'
                            ? 'bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white shadow-[0_0_15px_rgba(0,217,255,0.4)]'
                            : 'text-white/40 hover:text-white'
                        }`}
                        id="tab-login-btn"
                      >
                        <span>LOGIN</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAuthTab('signup'); setRecoveryNotice(null); }}
                        className={`py-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          authTab === 'signup'
                            ? 'bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white shadow-[0_0_15px_rgba(0,217,255,0.4)]'
                            : 'text-white/40 hover:text-white'
                        }`}
                        id="tab-signup-btn"
                      >
                        <span>SIGN UP</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* FORM GATEWAY WITH SMOOTH ANIMATED TRANSITION */}
                <AnimatePresence mode="wait">
                  <motion.form 
                    key={authTab}
                    initial={{ opacity: 0, x: authTab === 'login' ? -15 : authTab === 'signup' ? 0 : 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    onSubmit={authTab === 'login' ? handleLoginSubmit : authTab === 'signup' ? handleSignupSubmit : handleRecoverySubmit} 
                    noValidate 
                    className="flex-grow flex flex-col justify-between"
                    id="auth-flow-form"
                  >
                    {authTab === 'recover' ? (
                      <div className="space-y-3 text-left my-auto">
                        <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-xl text-xs text-cyan-200/90 leading-relaxed">
                          <div className="flex items-center gap-2 text-cyan-300 font-bold mb-1">
                            <ShieldAlert className="w-4 h-4 text-cyan-400" />
                            <span>Non-Enumerative Reset Gateway</span>
                          </div>
                          To protect user privacy and prevent credential enumeration attacks, generic recovery feedback is rendered regardless of account existence.
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[9.5px] sm:text-[10px] uppercase tracking-widest text-cyan-300/90 font-bold flex items-center gap-1">
                            <Mail className="w-3 h-3 text-cyan-400" />
                            <span>ACCOUNT EMAIL OR HANDLE</span>
                          </label>
                          <input
                            type="text"
                            value={recoveryIdentifier}
                            onChange={(e) => setRecoveryIdentifier(e.target.value)}
                            placeholder="e.g. user@incognito.sec or ShadowNova"
                            className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-black/50 border border-white/10 text-white placeholder-white/20 text-xs outline-none focus:border-cyan-500/60 focus:shadow-[0_0_15px_rgba(0,217,255,0.25)] transition-all"
                            id="input-recovery-identifier"
                          />
                        </div>

                        {recoveryNotice && (
                          <div className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2 ${
                            recoveryNotice.type === 'error'
                              ? 'bg-rose-950/50 border-rose-500/60 text-rose-200'
                              : 'bg-emerald-950/50 border-emerald-500/60 text-emerald-200'
                          }`}>
                            <span className="flex-1">{recoveryNotice.message}</span>
                          </div>
                        )}

                        <div className="pt-2">
                          <button
                            type="submit"
                            disabled={recoveryLoading}
                            className="w-full py-2.5 min-h-[48px] rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 hover:from-blue-500 hover:to-cyan-500 font-bold text-xs sm:text-sm tracking-wide text-white shadow-[0_6px_25px_rgba(0,217,255,0.35)] flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                            id="recovery-submit-btn"
                          >
                            {recoveryLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>DISPATCHING RECOVERY SIGNAL...</span>
                              </>
                            ) : (
                              <>
                                <span>DISPATCH RECOVERY LINK</span>
                                <ArrowRight className="w-4 h-4 text-white" />
                              </>
                            )}
                          </button>
                        </div>

                        <div className="text-center pt-1">
                          <button
                            type="button"
                            onClick={() => { setAuthTab('login'); setRecoveryNotice(null); }}
                            className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-widest cursor-pointer bg-transparent border-none outline-none"
                          >
                            ← Return to Login
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2 sm:space-y-2.5">

                      {/* FIELDS CONTAINER */}
                      <div className="space-y-2 sm:space-y-2.5">

                        {/* SIGN UP: Unique Username with AI Generator Integration & Random Button merged into input */}
                        {authTab === 'signup' && (
                          <div className="space-y-1 text-left">
                            <label className="block text-[9.5px] sm:text-[10px] uppercase tracking-widest text-cyan-300/90 font-bold flex items-center gap-1">
                              <AtSign className="w-3 h-3 text-cyan-400" />
                              <span>UNIQUE HANDLE (PUBLIC)</span>
                            </label>

                            <div className="relative flex items-center">
                              <input
                                type="text"
                                value={signupUsername}
                                onChange={(e) => setSignupUsername(e.target.value)}
                                placeholder="e.g. ShadowFox"
                                className={`w-full pl-3.5 pr-20 py-2 min-h-[44px] rounded-xl bg-black/50 border text-white placeholder-white/20 text-xs outline-none focus:shadow-[0_0_15px_rgba(0,217,255,0.25)] transition-all ${
                                  signupUsernameStatus === 'available' ? 'border-emerald-500/50 focus:border-emerald-500' :
                                  signupUsernameStatus === 'taken' || signupUsernameStatus === 'invalid' ? 'border-rose-500/50 focus:border-rose-500' : 'border-white/10 focus:border-cyan-500/60'
                                }`}
                              />
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                {checkingUsername && <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />}
                                {!checkingUsername && signupUsernameStatus === 'available' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                                <AIUsernameGenerator
                                  compactIconsOnly
                                  currentUsername={signupUsername}
                                  onSelectUsername={setSignupUsername}
                                  existingUsernames={accounts.map(acc => acc.username)}
                                />
                              </div>
                            </div>

                            {/* Username Validation Feedbacks */}
                            <AnimatePresence mode="wait">
                              {signupUsernameStatus === 'available' && (
                                <motion.p 
                                  initial={{ opacity: 0, y: -2 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="text-[9.5px] text-emerald-400 font-semibold flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" /> Handle @{signupUsername} available!
                                </motion.p>
                              )}
                              {signupUsernameStatus === 'taken' && (
                                <motion.div 
                                  initial={{ opacity: 0, y: -2 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="space-y-1"
                                >
                                  <p className="text-[9.5px] text-rose-400 font-semibold flex items-center gap-1">
                                    <ShieldAlert className="w-3 h-3" /> {signupUsernameError}
                                  </p>
                                  {signupUsernameSuggestions.length > 0 && (
                                    <div className="p-1.5 rounded-xl bg-black/30 border border-white/5">
                                      <span className="text-[9px] text-white/40 uppercase font-bold block mb-1">Suggestions:</span>
                                      <div className="flex flex-wrap gap-1">
                                        {signupUsernameSuggestions.map((sug, idx) => (
                                          <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setSignupUsername(sug)}
                                            className="px-2 py-0.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 rounded-lg text-[9.5px] font-medium transition-colors cursor-pointer"
                                          >
                                            @{sug}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}

                        {/* EMAIL / MOBILE INPUT WITH COMPACT SELECTOR TOGGLE */}
                        <div className="space-y-1 text-left">
                          <div className="flex items-center justify-between">
                            <label className="block text-[9.5px] sm:text-[10px] uppercase tracking-widest text-cyan-300/90 font-bold flex items-center gap-1">
                              {(authTab === 'login' ? loginMode === 'email' : signupMode === 'email') ? (
                                <>
                                  <Mail className="w-3 h-3 text-cyan-400" />
                                  <span>{authTab === 'login' ? 'EMAIL OR HANDLE' : 'EMAIL ADDRESS'}</span>
                                </>
                              ) : (
                                <>
                                  <Smartphone className="w-3 h-3 text-cyan-400" />
                                  <span>MOBILE NUMBER</span>
                                </>
                              )}
                            </label>

                            {/* Compact Email vs Phone mode toggle */}
                            <div className="flex items-center gap-0.5 bg-black/40 border border-white/10 rounded-lg p-0.5 text-[9px] sm:text-[10px]">
                              <button
                                type="button"
                                onClick={() => {
                                  if (authTab === 'login') setLoginMode('email');
                                  else setSignupMode('email');
                                }}
                                className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                                  (authTab === 'login' ? loginMode === 'email' : signupMode === 'email')
                                    ? 'bg-blue-600/40 text-cyan-200 border border-cyan-500/30'
                                    : 'text-white/40 hover:text-white'
                                }`}
                              >
                                Email
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (authTab === 'login') setLoginMode('phone');
                                  else setSignupMode('phone');
                                }}
                                className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                                  (authTab === 'login' ? loginMode === 'phone' : signupMode === 'phone')
                                    ? 'bg-blue-600/40 text-cyan-200 border border-cyan-500/30'
                                    : 'text-white/40 hover:text-white'
                                }`}
                              >
                                Phone
                              </button>
                            </div>
                          </div>

                          {((authTab === 'login' && loginMode === 'email') || (authTab === 'signup' && signupMode === 'email')) ? (
                            <input
                              type={authTab === 'login' ? "text" : "email"}
                              value={authTab === 'login' ? loginEmail : signupEmail}
                              onChange={(e) => {
                                if (authTab === 'login') setLoginEmail(e.target.value);
                                else setSignupEmail(e.target.value);
                              }}
                              placeholder={authTab === 'login' ? "Email or @handle" : "secure@incognito.io"}
                              className="w-full px-3.5 py-2 min-h-[44px] rounded-xl bg-black/50 border border-white/10 text-white placeholder-white/20 text-xs outline-none focus:border-cyan-500/60 focus:shadow-[0_0_15px_rgba(0,217,255,0.25)] transition-all"
                            />
                          ) : (
                            <div className="flex gap-2">
                              <div className="relative" ref={authTab === 'login' ? loginDropdownRef : signupDropdownRef}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (authTab === 'login') setIsLoginCountryOpen(!isLoginCountryOpen);
                                    else setIsSignupCountryOpen(!isSignupCountryOpen);
                                  }}
                                  className="px-2.5 py-2 min-h-[44px] rounded-xl bg-black/50 border border-white/10 text-white text-xs outline-none flex items-center justify-between gap-1 hover:border-cyan-500/50 min-w-[85px] h-full cursor-pointer"
                                >
                                  <span className="flex items-center gap-1">
                                    <span>{authTab === 'login' ? loginCountryCode.flag : signupCountryCode.flag}</span>
                                    <span className="font-bold">{authTab === 'login' ? loginCountryCode.code : signupCountryCode.code}</span>
                                  </span>
                                  <ChevronDown className="w-3 h-3 text-white/50" />
                                </button>

                                <AnimatePresence>
                                  {((authTab === 'login' && isLoginCountryOpen) || (authTab === 'signup' && isSignupCountryOpen)) && (
                                    <motion.div
                                      initial={{ opacity: 0, y: 5 }}
                                      animate={{ opacity: 1, y: 2 }}
                                      exit={{ opacity: 0, y: 5 }}
                                      className="absolute left-0 mt-1 w-56 max-h-48 overflow-y-auto bg-[#080d1a] border border-cyan-500/30 rounded-2xl py-1 shadow-2xl z-30"
                                    >
                                      {COUNTRY_CODES.map((country, idx) => (
                                        <button
                                          key={idx}
                                          type="button"
                                          onClick={() => {
                                            if (authTab === 'login') {
                                              setLoginCountryCode(country);
                                              setIsLoginCountryOpen(false);
                                            } else {
                                              setSignupCountryCode(country);
                                              setIsSignupCountryOpen(false);
                                            }
                                          }}
                                          className="w-full px-3 py-2 text-xs text-left text-white/80 hover:bg-cyan-600/20 flex items-center gap-2 transition-colors cursor-pointer"
                                        >
                                          <span>{country.flag}</span>
                                          <span className="font-bold w-10 text-cyan-300">{country.code}</span>
                                          <span className="truncate text-white/50">{country.name}</span>
                                        </button>
                                      ))}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>

                              <input
                                type="tel"
                                value={authTab === 'login' ? loginPhone : signupPhone}
                                onChange={(e) => {
                                  if (authTab === 'login') setLoginPhone(e.target.value);
                                  else setSignupPhone(e.target.value);
                                }}
                                placeholder="7700900077"
                                className="flex-1 px-3.5 py-2 min-h-[44px] rounded-xl bg-black/50 border border-white/10 text-white placeholder-white/20 text-xs outline-none focus:border-cyan-500/60 focus:shadow-[0_0_15px_rgba(0,217,255,0.25)] transition-all"
                              />
                            </div>
                          )}
                        </div>

                        {/* PASSWORD FIELD */}
                        <div className="space-y-1 text-left">
                          <div className="flex justify-between items-center">
                            <label className="block text-[9.5px] sm:text-[10px] uppercase tracking-widest text-cyan-300/90 font-bold flex items-center gap-1">
                              <Lock className="w-3 h-3 text-cyan-400" />
                              <span>PASSWORD</span>
                            </label>
                          </div>
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={authTab === 'login' ? loginPassword : signupPassword}
                              onChange={(e) => {
                                if (authTab === 'login') setLoginPassword(e.target.value);
                                else setSignupPassword(e.target.value);
                              }}
                              placeholder="••••••••"
                              className="w-full px-3.5 pr-10 py-2 min-h-[44px] rounded-xl bg-black/50 border border-white/10 text-white placeholder-white/20 text-xs outline-none focus:border-cyan-500/60 focus:shadow-[0_0_15px_rgba(0,217,255,0.25)] transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* CONFIRM PASSWORD (SIGN UP ONLY - HIDDEN UNTIL USER STARTS TYPING A PASSWORD) */}
                        <AnimatePresence>
                          {authTab === 'signup' && signupPassword.length > 0 && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="space-y-1 text-left overflow-hidden pt-0.5"
                            >
                              <label className="block text-[9.5px] sm:text-[10px] uppercase tracking-widest text-cyan-300/90 font-bold flex items-center gap-1">
                                <Lock className="w-3 h-3 text-cyan-400" />
                                <span>CONFIRM PASSWORD</span>
                              </label>
                              <div className="relative">
                                <input
                                  type={showConfirmPassword ? 'text' : 'password'}
                                  value={signupConfirmPassword}
                                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                                  placeholder="••••••••"
                                  className="w-full px-3.5 pr-10 py-2 min-h-[44px] rounded-xl bg-black/50 border border-white/10 text-white placeholder-white/20 text-xs outline-none focus:border-cyan-500/60 focus:shadow-[0_0_15px_rgba(0,217,255,0.25)] transition-all"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer"
                                >
                                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                      </div>

                      {/* FORGOT PASSWORD OPTION IN SINGLE LINE JUST ABOVE CHECKBOX */}
                      {authTab === 'login' && (
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => { setAuthTab('recover'); setRecoveryNotice(null); }}
                            className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 hover:underline transition-all cursor-pointer bg-transparent border-none outline-none"
                            id="btn-forgot-password-single-line"
                          >
                            Forgot password?
                          </button>
                        </div>
                      )}

                      {/* REMEMBER ME OR AGREE TO TERMS */}
                      <div className="pt-0.5">
                        {authTab === 'login' ? (
                          <label className="flex items-center space-x-2 cursor-pointer group select-none text-left">
                            <input
                              type="checkbox"
                              checked={rememberMe}
                              onChange={() => setRememberMe(!rememberMe)}
                              className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 accent-cyan-500 cursor-pointer"
                            />
                            <span className="text-[11px] sm:text-xs text-white/60 group-hover:text-white transition-colors">
                              Remember session credentials
                            </span>
                          </label>
                        ) : (
                          <label className="flex items-start gap-2 cursor-pointer group text-left">
                            <input
                              type="checkbox"
                              checked={agreeToTerms}
                              onChange={() => setAgreeToTerms(!agreeToTerms)}
                              className="w-3.5 h-3.5 rounded mt-0.5 border-white/20 bg-white/5 accent-cyan-500 cursor-pointer"
                            />
                            <span className="text-[10px] sm:text-[11px] text-white/70 leading-tight group-hover:text-white transition-colors select-none">
                              I accept the <span className="text-cyan-300 font-bold hover:underline">Privacy Charter</span> and verify handle.
                            </span>
                          </label>
                        )}
                      </div>
                    </div>

                    {/* SUBMIT BUTTONS & SOCIALS */}
                    <div className="mt-3 space-y-2.5">
                      {/* Primary CTA Button */}
                      <button
                        type="submit"
                        className="w-full py-2.5 min-h-[48px] rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 hover:from-blue-500 hover:to-cyan-500 font-bold text-xs sm:text-sm tracking-wide text-white shadow-[0_6px_25px_rgba(0,217,255,0.35)] flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                        id="auth-submit-btn"
                      >
                        <span>{authTab === 'login' ? 'Authenticate & Enter' : 'Forge Cryptographic Persona'}</span>
                        <ArrowRight className="w-4 h-4 text-white" />
                      </button>

                      {/* CLERK SSO INTEGRATION SECTION */}
                      <div className="pt-1">
                        <div className="relative flex py-2 items-center">
                          <div className="flex-grow border-t border-white/10"></div>
                          <span className="flex-shrink mx-3 text-[9.5px] uppercase font-mono tracking-widest text-white/40">OR ENTER WITH</span>
                          <div className="flex-grow border-t border-white/10"></div>
                        </div>

                        {isClerkConfigured ? (
                          <ClerkAuthBridge
                            activeMode={authTab === 'signup' ? 'signup' : 'login'}
                            triggerToast={triggerToast}
                            onSyncSuccess={(syncedUser, redirectTo) => {
                              setCurrentUser(syncedUser);
                              setIsAuthenticated(true);
                              localStorage.setItem('incognito_current_user', JSON.stringify(syncedUser));
                              if (redirectTo === '/admin') {
                                setSidebarTab('admin');
                                window.location.hash = '#/admin';
                              } else {
                                setSidebarTab('home');
                                window.location.hash = '#/home';
                              }
                            }}
                          />
                        ) : (
                          <div className="space-y-1.5">
                            <button
                              type="button"
                              onClick={() => setIsClerkModalOpen(true)}
                              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600/30 via-indigo-600/30 to-cyan-600/30 hover:from-purple-600/50 hover:via-indigo-600/50 hover:to-cyan-600/50 border border-purple-500/40 hover:border-cyan-400/60 text-white font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:shadow-[0_0_25px_rgba(0,217,255,0.35)] cursor-pointer group"
                              id="btn-clerk-sso-cta"
                            >
                              <div className="p-1 rounded-lg bg-purple-500/30 border border-purple-400/40 text-purple-300 group-hover:scale-105 transition-transform">
                                <KeyRound className="w-3.5 h-3.5 text-purple-300" />
                              </div>
                              <span>{authTab === 'signup' ? 'Sign Up with Clerk SSO' : 'Continue with Clerk (SSO / Passkey)'}</span>
                              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                            </button>
                            <div className="flex items-center justify-center gap-1 text-[10px] text-purple-300/70">
                              <span>Enterprise Clerk Auth Ready</span>
                              <span>•</span>
                              <button
                                type="button"
                                onClick={() => setIsClerkModalOpen(true)}
                                className="text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                              >
                                View Keys Setup
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Bottom Status Badges */}
                      <div className="pt-2 border-t border-white/5 flex items-center justify-center gap-2 text-[10px] text-white/50 font-medium">
                        <span>✓ Anonymous</span>
                        <span>•</span>
                        <span>✓ End-to-End Encrypted</span>
                        <span>•</span>
                        <span>✓ Zero Tracking</span>
                      </div>
                    </div>
                  </>
                )}
              </motion.form>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
          </motion.div>
        ) : (
          
          /* ========================================================= */
          /* LOGGED IN WORKSPACE: TWO-COLUMN LAYOUT (SIDEBAR + FEED)   */
          /* ========================================================= */
          <motion.div
            key="authenticated-dashboard"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4 }}
            className="w-full h-screen flex z-10 overflow-hidden relative"
            id="auth-success-portal"
          >
            {/* DESKTOP FIXED LEFT SIDEBAR (22% WIDTH) */}
            <div className="hidden lg:block w-[22%] h-full flex-shrink-0 border-r border-cyan-500/15 bg-[#050811]/80 backdrop-blur-2xl z-30 relative">
              <LeftSidebar
                activeTab={sidebarTab}
                setActiveTab={setSidebarTab}
                currentUser={currentUser!}
                onLogout={handleLogout}
                isAnonymousMode={isAnonymousMode}
                setIsAnonymousMode={setIsAnonymousMode}
                onOpenSettings={() => setSidebarTab('settings')}
              />
            </div>

            {/* MOBILE DRAWER LEFT SIDEBAR OVERLAY */}
            <AnimatePresence>
              {isMobileMenuOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-40"
                  />
                  <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '-100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="lg:hidden fixed left-0 top-0 bottom-0 w-80 bg-[#050811] border-r border-cyan-500/20 z-50 overflow-hidden shadow-2xl"
                  >
                    <div className="p-2 flex justify-end">
                      <button 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="p-2 rounded-xl text-white/50 hover:text-white"
                      >
                        <CloseIcon className="w-5 h-5" />
                      </button>
                    </div>
                    <LeftSidebar
                      activeTab={sidebarTab}
                      setActiveTab={(tab) => {
                        setSidebarTab(tab);
                        setIsMobileMenuOpen(false);
                      }}
                      currentUser={currentUser!}
                      onLogout={handleLogout}
                      isAnonymousMode={isAnonymousMode}
                      setIsAnonymousMode={setIsAnonymousMode}
                      onOpenSettings={() => {
                        setSidebarTab('settings');
                        setIsMobileMenuOpen(false);
                      }}
                    />
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* MAIN FEED COLUMN (78% WIDTH DESKTOP, 100% MOBILE) */}
            <div className="flex-1 w-full lg:w-[78%] h-full flex flex-col overflow-hidden relative">
              
              {/* STICKY TOP BAR */}
              <TopBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onOpenCreatePost={() => {
                  setSidebarTab('home');
                  // scroll to top or focus card
                  const quickPost = document.getElementById('quick-post-card');
                  if (quickPost) quickPost.scrollIntoView({ behavior: 'smooth' });
                }}
                currentUser={currentUser!}
                onLogout={handleLogout}
                onOpenSettings={() => setSidebarTab('settings')}
                onNavigateTab={setSidebarTab}
                isClerkConfigured={isClerkConfigured}
                onOpenClerkSetup={() => setIsClerkModalOpen(true)}
              />

              {/* SCROLLABLE MAIN CONTENT AREA */}
              <main className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-8 py-4 sm:py-6 max-w-5xl w-full mx-auto pb-36 lg:pb-12 custom-scrollbar">
                <AnimatePresence mode="wait">
                  {sidebarTab === 'home' ? (
                    <motion.div
                      key="home-feed"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                    >
                      <PublicFeed 
                        currentUser={currentUser!}
                        posts={posts}
                        setPosts={setPosts}
                        onDeletePost={handleDeletePost}
                        onTriggerToast={triggerToast}
                        searchQuery={searchQuery}
                        isAnonymousMode={isAnonymousMode}
                        onViewUserProfile={(username) => setViewingProfileUsername(username)}
                      />
                    </motion.div>
                  ) : sidebarTab === 'communities' ? (
                    <motion.div
                      key="communities-view"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                    >
                      <CommunitiesView
                        currentUser={currentUser!}
                        onTriggerToast={triggerToast}
                        onSelectUser={(username) => setViewingProfileUsername(username)}
                      />
                    </motion.div>
                  ) : sidebarTab === 'leaderboard' ? (
                    <motion.div
                      key="leaderboard-view"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                    >
                      <LeaderboardView 
                        currentUser={currentUser!} 
                        onViewUserProfile={(username) => setViewingProfileUsername(username)}
                      />
                    </motion.div>
                  ) : sidebarTab === 'messages' ? (
                    <motion.div
                      key="messages-view"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                    >
                      <MessagesView 
                        currentUser={currentUser!} 
                        onViewUserProfile={(username) => setViewingProfileUsername(username)}
                      />
                    </motion.div>
                  ) : sidebarTab === 'profile' ? (
                    <motion.div
                      key="profile-view"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                    >
                      <ProfileView
                        currentUser={currentUser!}
                        userPosts={posts.filter(p => p.username === currentUser!.username)}
                        onUpvote={(id) => {
                          setPosts(prev => prev.map(p => p.id === id ? { ...p, upvotes: p.isUpvoted ? p.upvotes - 1 : p.upvotes + 1, isUpvoted: !p.isUpvoted } : p));
                        }}
                        onSave={(id) => {
                          setPosts(prev => prev.map(p => p.id === id ? { ...p, isSaved: !p.isSaved } : p));
                          triggerToast('Post bookmark state updated', 'info');
                        }}
                        onAddComment={(id, content) => {
                          setPosts(prev => prev.map(p => p.id === id ? { ...p, comments: [...p.comments, { id: `c_${Date.now()}`, username: currentUser!.username, content, timestamp: 'Just now' }] } : p));
                          triggerToast('Comment added', 'success');
                        }}
                        onReportPost={() => triggerToast('Report received', 'info')}
                        onDeletePost={handleDeletePost}
                        onVotePoll={handleVotePoll}
                        onTriggerToast={triggerToast}
                        onOpenSettings={() => setSidebarTab('settings')}
                      />
                    </motion.div>
                  ) : sidebarTab === 'admin' && currentUser?.email?.toLowerCase() === 'kavyanagpal0005@gmail.com' ? (
                    <motion.div
                      key="admin-view"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                    >
                      <AdminGovernancePanel
                        currentUser={currentUser!}
                        accounts={accounts}
                        setAccounts={setAccounts}
                        posts={posts}
                        setPosts={setPosts}
                        onReturnHome={() => {
                          setSidebarTab('home');
                          window.location.hash = '#/home';
                        }}
                        onTriggerToast={triggerToast}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="settings-view"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                    >
                      {/* Security Vault & Handle Customization */}
                      <div className="space-y-4">
                        <div className="flex bg-black/40 p-1 rounded-2xl border border-white/10 max-w-sm mx-auto">
                          <button
                            onClick={() => setDashboardTab('security')}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              dashboardTab === 'security' ? 'bg-cyan-600 text-white shadow-md' : 'text-white/40 hover:text-white'
                            }`}
                          >
                            Security Vault
                          </button>
                          <button
                            onClick={() => setDashboardTab('username')}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              dashboardTab === 'username' ? 'bg-cyan-600 text-white shadow-md' : 'text-white/40 hover:text-white'
                            }`}
                          >
                            Change Handle
                          </button>
                        </div>

                        {dashboardTab === 'security' ? (
                          <SecurityCenter 
                            currentUser={currentUser!}
                            setCurrentUser={setCurrentUser}
                            onTriggerToast={triggerToast}
                            onRequestUsernameChange={() => setDashboardTab('username')}
                          />
                        ) : (
                          <UsernameChangePage
                            currentUser={currentUser!}
                            setCurrentUser={setCurrentUser}
                            accounts={accounts}
                            setAccounts={setAccounts}
                            posts={posts}
                            setPosts={setPosts}
                            onTriggerToast={triggerToast}
                            onNavigateTab={(tab) => {
                              if (tab === 'feed') setSidebarTab('home');
                              else setDashboardTab(tab);
                            }}
                          />
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </main>

              {/* MOBILE BOTTOM NAVIGATION (VISIBLE ONLY ON SMALL SCREENS) */}
              <div className="lg:hidden fixed bottom-0 left-0 right-0 h-[calc(4rem+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)] bg-[#050811]/95 border-t border-cyan-500/20 backdrop-blur-2xl grid grid-cols-4 items-center px-2 z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.8)]" id="mobile-bottom-nav">
                <button
                  onClick={() => setSidebarTab('home')}
                  className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[10px] font-bold cursor-pointer transition-colors ${
                    sidebarTab === 'home' ? 'text-cyan-300' : 'text-white/40 hover:text-white/70'
                  }`}
                  id="mobile-nav-home"
                >
                  <Home className="w-5 h-5 mb-0.5" />
                  <span>Home</span>
                </button>

                <button
                  onClick={() => setSidebarTab('leaderboard')}
                  className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[10px] font-bold cursor-pointer transition-colors ${
                    sidebarTab === 'leaderboard' ? 'text-cyan-300' : 'text-white/40 hover:text-white/70'
                  }`}
                  id="mobile-nav-leaderboard"
                >
                  <Trophy className="w-5 h-5 mb-0.5" />
                  <span>Leaderboard</span>
                </button>

                <button
                  onClick={() => setSidebarTab('messages')}
                  className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[10px] font-bold cursor-pointer transition-colors ${
                    sidebarTab === 'messages' ? 'text-cyan-300' : 'text-white/40 hover:text-white/70'
                  }`}
                  id="mobile-nav-messages"
                >
                  <MessageSquare className="w-5 h-5 mb-0.5" />
                  <span>Messages</span>
                </button>

                <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[10px] font-bold cursor-pointer text-white/40 hover:text-white transition-colors"
                  id="mobile-nav-menu"
                >
                  <Menu className="w-5 h-5 mb-0.5" />
                  <span>Menu</span>
                </button>
              </div>

              {/* USER PROFILE MODAL */}
              {currentUser && (
                <UserProfileModal
                  username={viewingProfileUsername}
                  accounts={accounts}
                  posts={posts}
                  currentUser={currentUser}
                  onClose={() => setViewingProfileUsername(null)}
                  onUpvote={(id) => {
                    setPosts(prev => prev.map(p => p.id === id ? { ...p, upvotes: p.isUpvoted ? p.upvotes - 1 : p.upvotes + 1, isUpvoted: !p.isUpvoted } : p));
                  }}
                  onSave={(id) => {
                    setPosts(prev => prev.map(p => p.id === id ? { ...p, isSaved: !p.isSaved } : p));
                    triggerToast('Post bookmark state updated', 'info');
                  }}
                  onAddComment={(id, content) => {
                    setPosts(prev => prev.map(p => p.id === id ? { ...p, comments: [...p.comments, { id: `c_${Date.now()}`, username: currentUser.username, content, timestamp: 'Just now' }] } : p));
                    triggerToast('Comment added', 'success');
                  }}
                  onReportPost={() => triggerToast('Report received', 'info')}
                  onDeletePost={handleDeletePost}
                  onVotePoll={handleVotePoll}
                  onStartDirectMessage={(targetUser) => {
                    setSidebarTab('messages');
                    triggerToast(`Opened encrypted messaging tunnel with @${targetUser}`, 'info');
                  }}
                  onTriggerToast={triggerToast}
                  onUpdateKarma={(targetUser, newKarma) => {
                    setAccounts(prev => prev.map(a => 
                      a.username.toLowerCase() === targetUser.toLowerCase() ? { ...a, karma: newKarma } : a
                    ));
                    fetch(`/api/admin/users/${targetUser}/karma`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'x-user-id': currentUser.id || 'usr_4'
                      },
                      body: JSON.stringify({ karma: newKarma })
                    }).catch(err => console.error('Error syncing karma to server:', err));
                  }}
                />
              )}

              {/* FLOATING ACTION BUTTON FOR POSTING AND DRAFTING */}
              <FloatingPostButton
                currentUser={currentUser!}
                onPostCreated={(newPost) => {
                  const postWithOwnership: Post = {
                    ...newPost,
                    ownerId: currentUser?.id || newPost.ownerId,
                    authorUsername: currentUser?.username || newPost.authorUsername
                  };
                  setPosts(prev => [postWithOwnership, ...prev]);
                  fetch('/api/posts', {
                    method: 'POST',
                    headers: { 
                      'Content-Type': 'application/json',
                      'x-user-id': currentUser?.id || ''
                    },
                    body: JSON.stringify(postWithOwnership)
                  }).catch(err => console.error('Error syncing post to network:', err));
                }}
                onTriggerToast={triggerToast}
                isAnonymousMode={isAnonymousMode}
              />

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </InteractiveAtmosphere>
  );
}
