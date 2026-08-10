/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CountryCode, UserAccount, Post, LeaderboardUser, DirectConversation } from '../types';

export const COUNTRY_CODES: CountryCode[] = [
  { code: '+1', flag: '🇺🇸', name: 'United States' },
  { code: '+44', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+49', flag: '🇩🇪', name: 'Germany' },
  { code: '+1', flag: '🇨🇦', name: 'Canada' },
  { code: '+61', flag: '🇦🇺', name: 'Australia' },
  { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+81', flag: '🇯🇵', name: 'Japan' },
  { code: '+65', flag: '🇸🇬', name: 'Singapore' },
];

export const INITIAL_ACCOUNTS: UserAccount[] = [
  {
    id: 'usr_1',
    username: 'ShadowNova',
    realName: 'Alexander Mercer',
    email: 'shadownova@gmail.com',
    phone: '7700900077',
    countryCode: '+1',
    avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80',
    bio: 'Decentralized protocol enthusiast. Cryptographic privacy isn\'t an option, it\'s a fundamental human right.',
    karma: 12480,
    joinDate: 'Jan 2024',
    badges: ['Founding Member', 'Privacy Architect'],
    loginMethod: 'Email',
    deviceInfo: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    ipAddress: '192.168.1.1',
    role: 'user'
  },
  {
    id: 'usr_2',
    username: 'CryptoKnight',
    realName: 'Elena Rostova',
    email: 'crypto@incognito.sec',
    phone: '9876543210',
    countryCode: '+91',
    avatarUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=150&q=80',
    bio: 'Building the untraceable web. Zero-Knowledge proofs are pure mathematical magic.',
    karma: 8920,
    joinDate: 'Mar 2024',
    badges: ['ZK Proof Master', 'Security Auditor'],
    loginMethod: 'Mobile',
    deviceInfo: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X)',
    ipAddress: '103.241.12.89',
    role: 'user'
  },
  {
    id: 'usr_3',
    username: 'CipherVapor',
    realName: 'Marcus Vance',
    email: 'node@incognito.sec',
    phone: '7700900099',
    countryCode: '+44',
    avatarUrl: 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?auto=format&fit=crop&w=150&q=80',
    bio: 'Operating distributed relay nodes across 6 continents. Zero logs.',
    karma: 6450,
    joinDate: 'Jun 2024',
    badges: ['Relay Node Host', 'Core Contributor'],
    loginMethod: 'Email',
    deviceInfo: 'Mozilla/5.0 (X11; Linux x86_64)',
    ipAddress: '82.165.19.23',
    role: 'user'
  },
  {
    id: 'usr_4',
    username: 'VoidCipher',
    realName: 'Kavya Nagpal',
    email: 'kavyanagpal0005@gmail.com',
    phone: '8899001122',
    countryCode: '+91',
    avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80',
    bio: 'Incognito Creator & Lead System Architect.',
    karma: 15820,
    joinDate: 'Jul 2026',
    badges: ['Incognito Creator', 'System Lead'],
    loginMethod: 'Google',
    deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    ipAddress: '172.56.21.144',
    role: 'super_admin'
  }
];

export const INITIAL_POSTS: Post[] = [
  {
    id: 'post_1',
    username: 'ShadowNova',
    userAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80',
    community: '💬 Confessions',
    title: "Confession: I've been deploying to production on Friday afternoons for 2 years without telling my lead",
    content: "I know it violates every engineering rule, but our CI/CD pipeline is so reliable that zero downtime updates go live in 15 seconds. Secretly watching live traffic metrics spike over the weekend is my biggest thrill.",
    imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1000&q=80',
    timestamp: '2 hours ago',
    upvotes: 2450,
    isUpvoted: true,
    isSaved: true,
    tags: ['Confessions', 'DevLife', 'CI/CD'],
    comments: [
      {
        id: 'comment_1_1',
        username: 'CryptoKnight',
        userAvatar: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=150&q=80',
        content: 'Absolute chaos energy! But if tests are green, Friday deploys are valid.',
        timestamp: '1 hour ago',
        upvotes: 84,
        isUpvoted: false
      },
      {
        id: 'comment_1_2',
        username: 'CipherVapor',
        userAvatar: 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?auto=format&fit=crop&w=150&q=80',
        content: 'Your lead definitely knows and is quietly impressed by your confidence.',
        timestamp: '45 mins ago',
        upvotes: 32,
        isUpvoted: true
      }
    ]
  },
  {
    id: 'post_2',
    username: 'AetherNode',
    userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    community: '😂 Funny',
    title: "My code worked on the first try today and now I'm terrified",
    content: "No syntax errors, no missing semicolons, no undefined variables, no broken hooks. Something is deeply wrong. The software is planning something sinister.",
    imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1000&q=80',
    timestamp: '4 hours ago',
    upvotes: 1890,
    isUpvoted: false,
    isSaved: false,
    tags: ['Funny', 'Humor', 'Programming'],
    comments: [
      {
        id: 'comment_2_1',
        username: 'ShadowNova',
        userAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80',
        content: 'Check `git status` right now. You might be editing the wrong file!',
        timestamp: '3 hours ago',
        upvotes: 49
      }
    ]
  },
  {
    id: 'post_3',
    username: 'GhostProtocol',
    userAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
    community: '🎮 Gaming',
    title: 'POLL: Which gaming era had the best anonymous voice chat lobbies?',
    content: 'Before skill-based matchmaking algorithms and behavioral telemetry, multiplayer voice lobbies were pure unfiltered energy. Which era was peak gaming?',
    timestamp: '6 hours ago',
    upvotes: 1420,
    isUpvoted: false,
    isSaved: false,
    tags: ['Gaming', 'Multiplayer', 'Poll'],
    poll: {
      totalVotes: 842,
      userVotedId: 'opt_1',
      options: [
        { id: 'opt_1', text: 'Halo 3 & Modern Warfare 2 (2007-2009)', votes: 480 },
        { id: 'opt_2', text: 'Counter-Strike 1.6 & Source (2003-2006)', votes: 260 },
        { id: 'opt_3', text: 'Early Discord & TeamSpeak Era (2015-2018)', votes: 82 },
        { id: 'opt_4', text: 'Current Encrypted Spatial Voice Lobbies', votes: 20 }
      ]
    },
    comments: []
  },
  {
    id: 'post_4',
    username: 'NeonOracle',
    userAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
    community: '🤣 Memes',
    title: 'Senior Dev explaining legacy code vs Junior Dev trying to refactor it',
    content: "Senior: 'Don't touch line 42, it holds the entire universe together.'\nJunior: *Deletes line 42*\nJunior: 'Why is the coffee machine now spewing raw HTML?'",
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=80',
    timestamp: '8 hours ago',
    upvotes: 3120,
    isUpvoted: true,
    isSaved: true,
    tags: ['Memes', 'DevHumor', 'LegacyCode'],
    comments: [
      {
        id: 'comment_4_1',
        username: 'VoidCipher',
        userAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80',
        content: 'Line 42 is load-bearing load balancer logic, classic!',
        timestamp: '7 hours ago',
        upvotes: 142
      }
    ]
  },
  {
    id: 'post_5',
    username: 'CipherVapor',
    userAvatar: 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?auto=format&fit=crop&w=150&q=80',
    community: '💻 Technology',
    title: 'Why Zero-Knowledge Identity Isolation is the Future of Social Media',
    content: 'The INCOGNITO protocol proves that we can have a highly interactive, authenticated social platform without exposing any real identity. Your email, phone, and IP remain strictly locked inside an offline hardware vault, while the public network only ever sees cryptographic personas.',
    timestamp: '10 hours ago',
    upvotes: 2150,
    isUpvoted: false,
    isSaved: true,
    tags: ['Technology', 'ZeroKnowledge', 'Privacy'],
    comments: []
  }
];

export const INITIAL_LEADERBOARD: LeaderboardUser[] = [
  {
    rank: 1,
    username: 'VoidCipher',
    avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80',
    karma: 15820,
    badges: ['Incognito Creator', 'System Architect'],
    topCommunity: '💻 Technology',
    verified: true
  },
  {
    rank: 2,
    username: 'ShadowNova',
    avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80',
    karma: 12480,
    badges: ['Founding Member', 'Privacy Architect'],
    topCommunity: '💬 Confessions',
    verified: true
  },
  {
    rank: 3,
    username: 'CryptoKnight',
    avatarUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=150&q=80',
    karma: 8920,
    badges: ['ZK Proof Master', 'Security Auditor'],
    topCommunity: '🎮 Gaming',
    verified: true
  },
  {
    rank: 4,
    username: 'CipherVapor',
    avatarUrl: 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?auto=format&fit=crop&w=150&q=80',
    karma: 6450,
    badges: ['Relay Node Host'],
    topCommunity: '😂 Funny',
    verified: true
  },
  {
    rank: 5,
    username: 'NeonOracle',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
    karma: 5120,
    badges: ['Meme Master', 'Deep Writer'],
    topCommunity: '🤣 Memes',
    verified: false
  },
  {
    rank: 6,
    username: 'GhostProtocol',
    avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
    karma: 4390,
    badges: ['Poll Creator'],
    topCommunity: '🎮 Gaming',
    verified: false
  }
];

export const INITIAL_CONVERSATIONS: DirectConversation[] = [
  {
    id: 'conv_1',
    peerUsername: 'CryptoKnight',
    peerAvatar: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=150&q=80',
    lastMessage: 'The ZK-snark proof generation time dropped under 100ms. Check the repository!',
    lastTimestamp: '10 mins ago',
    unreadCount: 1,
    messages: [
      {
        id: 'm1',
        senderUsername: 'CryptoKnight',
        content: 'Hey @ShadowNova, did you inspect the new zero-knowledge circuit audit report?',
        timestamp: '25 mins ago',
        isRead: true,
        encryptedKey: '0x8f3a9...e1'
      },
      {
        id: 'm2',
        senderUsername: 'ShadowNova',
        content: 'Yes! The constraint count was optimized by 30%. Incredible work.',
        timestamp: '18 mins ago',
        isRead: true,
        encryptedKey: '0x3c2a1...f0'
      },
      {
        id: 'm3',
        senderUsername: 'CryptoKnight',
        content: 'The ZK-snark proof generation time dropped under 100ms. Check the repository!',
        timestamp: '10 mins ago',
        isRead: false,
        encryptedKey: '0x99a1b...e7'
      }
    ]
  },
  {
    id: 'conv_2',
    peerUsername: 'CipherVapor',
    peerAvatar: 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?auto=format&fit=crop&w=150&q=80',
    lastMessage: 'All relay nodes in Frankfurt and Tokyo are operating at 100% health.',
    lastTimestamp: '2 hours ago',
    unreadCount: 0,
    messages: [
      {
        id: 'm1',
        senderUsername: 'CipherVapor',
        content: 'All relay nodes in Frankfurt and Tokyo are operating at 100% health.',
        timestamp: '2 hours ago',
        isRead: true,
        encryptedKey: '0x77b4a...91'
      }
    ]
  }
];

export const COMMUNITIES = [
  { id: 'Funny', name: '😂 Funny', icon: 'Laugh', count: '18.4k' },
  { id: 'Memes', name: '🤣 Memes', icon: 'Smile', count: '24.1k' },
  { id: 'Confessions', name: '💬 Confessions', icon: 'MessageCircle', count: '12.8k' },
  { id: 'Gaming', name: '🎮 Gaming', icon: 'Gamepad2', count: '15.6k' },
  { id: 'Technology', name: '💻 Technology', icon: 'Laptop', count: '21.3k' },
  { id: 'Trending', name: '🔥 Trending', icon: 'Flame', count: '35.9k' }
];

export function generateUsernameSuggestions(username: string): string[] {
  const clean = username.replace(/[^a-zA-Z0-9_.]/g, '') || 'ShadowNova';
  return [
    `${clean}_01`,
    `${clean}2026`,
    `${clean}.`,
    `${clean}_Nova`
  ];
}
