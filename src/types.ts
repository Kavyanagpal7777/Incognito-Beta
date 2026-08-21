/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CountryCode {
  code: string;
  flag: string;
  name: string;
}

export interface UserAccount {
  id: string;
  username: string; // Public Unique Identity
  realName: string; // Private
  email?: string; // Private
  phone?: string; // Private
  countryCode?: string; // Private
  password?: string; // Private
  clerkId?: string; // Private (stored for Clerk auth)
  googleId?: string; // Private (stored for auth only)
  facebookId?: string; // Private (stored for auth only)
  avatarUrl?: string; // Public Profile Picture
  bio?: string; // Public Optional
  karma: number; // Public Karma / Points
  joinDate: string; // Public Optional Join Date
  badges: string[]; // Public Badges
  loginMethod: 'Email' | 'Mobile' | 'Google' | 'Facebook' | 'Clerk'; // Private
  deviceInfo: string; // Private
  ipAddress: string; // Private
  twoFactorEnabled?: boolean; // Private
  totpSecret?: string; // Private
  autoLogoutTimeout?: number; // Inactivity timeout in minutes (0 = disabled)
  role?: 'owner' | 'super_admin' | 'admin' | 'moderator' | 'user';
  isOgMember?: boolean;
  ogSubscriptionStartDate?: string;
  ogSubscriptionExpiryDate?: string;
  ogMemberExpiresAt?: string;
  acceptedPolicyVersion?: string;
  policyAcceptedAt?: string;
}

export interface PolicyAcceptanceRecord {
  id: string;
  userId?: string;
  username?: string;
  policyVersion: string;
  acceptedTimestamp: string;
  ipAddress: string;
  userAgent: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface PostPoll {
  options: PollOption[];
  totalVotes: number;
  userVotedId?: string;
  votesByUser?: Record<string, string>;
}

export interface Post {
  id: string;
  ownerId?: string;
  authorUsername?: string;
  username: string; // ONLY public username
  userAvatar?: string;
  community: string; // e.g. 'c/Privacy', 'c/Cyberpunk'
  title?: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  timestamp: string;
  upvotes: number;
  comments: Comment[];
  isUpvoted?: boolean;
  isSaved?: boolean;
  isAnonymous?: boolean;
  tags?: string[];
  poll?: PostPoll;
}

export interface Comment {
  id: string;
  username: string; // ONLY public username
  userAvatar?: string;
  content: string;
  timestamp: string;
  upvotes?: number;
  isUpvoted?: boolean;
}

export interface LeaderboardUser {
  rank: number;
  previousRank?: number;
  rankChange?: number;
  username: string;
  avatarUrl?: string;
  karma: number;
  badges: string[];
  topCommunity: string;
  verified: boolean;
  role?: string;
  isOgMember?: boolean;
  leaderTitle?: string;
}

export interface LeaderboardSnapshot {
  id: string;
  timestamp: string;
  refreshCycle: string;
  topUsers: Array<{
    rank: number;
    username: string;
    karma: number;
    leaderTitle?: string;
  }>;
  totalParticipants: number;
  topGainer?: {
    username: string;
    karmaGain: number;
  };
  triggeredBy?: string;
}

export interface LeaderboardState {
  officialLeaderboard: LeaderboardUser[];
  lastRefreshedAt: string;
  nextRefreshAt: string;
  serverTime: string;
  refreshIntervalHours: number;
  userRankInfo?: {
    currentRank: number;
    previousRank?: number;
    rankChange?: number;
    hasLeaderTitle: boolean;
    leaderTitle?: string;
    notification?: {
      message: string;
      timestamp: string;
      read: boolean;
      oldRank?: number;
      newRank?: number;
      rankChange?: number;
    };
  };
}

export interface DirectMessage {
  id: string;
  senderUsername: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  encryptedKey: string;
}

export interface DirectConversation {
  id: string;
  peerUsername: string;
  peerAvatar?: string;
  lastMessage: string;
  lastTimestamp: string;
  unreadCount: number;
  messages: DirectMessage[];
}

export interface AuditLog {
  id: string;
  staffMemberId: string;
  actorUsername: string;
  staffRole: string;
  userAccountAccessed?: string;
  informationViewed?: string;
  reasonForAccess?: string;
  timestamp: string;
  ipAddress?: string;
  deviceInfo?: string;
  action: string;
  targetResource: string;
  details: string;
}

export interface LegalExportRequest {
  id: string;
  targetUserId: string;
  targetUsername: string;
  exportedBy: string;
  exportedByRole: string;
  reason: string;
  format: 'PDF' | 'CSV' | 'JSON';
  scope: string[];
  timestamp: string;
}

export interface LegalUserData {
  id: string;
  username: string;
  realName: string;
  registeredEmail: string;
  verifiedMobile: string;
  creationDate: string;
  accountStatus: {
    isBanned: boolean;
    isShadowRestricted: boolean;
    karma: number;
    role: string;
    twoFactorEnabled: boolean;
    statusLabel: string;
  };
  loginHistory: Array<{
    id: string;
    timestamp: string;
    ipAddress: string;
    method: string;
    deviceInfo: string;
    outcome: string;
    location: string;
  }>;
  ipAddressHistory: Array<{
    ip: string;
    firstSeen: string;
    lastSeen: string;
    device: string;
  }>;
  deviceFingerprints: Array<{
    fingerprint: string;
    os: string;
    browser: string;
    lastUsed: string;
  }>;
  securityEvents: Array<{
    id: string;
    event: string;
    timestamp: string;
    ip: string;
    status: string;
  }>;
  reportsAgainstAccount: Array<{
    id: string;
    reporter: string;
    reason: string;
    timestamp: string;
    status: string;
    targetType: string;
  }>;
  communitiesJoined: string[];
  publicPosts: Array<{
    id: string;
    title?: string;
    content: string;
    community: string;
    timestamp: string;
    isDeleted?: boolean;
  }>;
  pmAccessGrantedByOwner?: boolean;
  privateMessages?: Array<{
    id: string;
    senderUsername: string;
    recipientUsername: string;
    content: string;
    timestamp: string;
    isReported?: boolean;
    linkedModerationCaseId?: string;
  }>;
}

export interface CommunityRule {
  title: string;
  description: string;
}

export interface CommunityComment {
  id: string;
  content: string;
  authorUsername: string;
  authorAvatar?: string;
  timestamp: string;
  upvotes?: number;
}

export interface CommunityPost {
  id: string;
  communityId: string;
  title: string;
  content: string;
  authorUsername: string;
  authorAvatar?: string;
  isAnonymous?: boolean;
  timestamp: string;
  upvotes: number;
  isUpvoted?: boolean;
  commentCount: number;
  comments?: CommunityComment[];
  tags?: string[];
  isPinned?: boolean;
}

export interface Community {
  id: string;
  name: string;
  handle: string;
  description: string;
  category: string;
  iconUrl?: string;
  bannerUrl?: string;
  creatorUsername: string;
  memberCount: number;
  isJoined?: boolean;
  isPopular?: boolean;
  isTrending?: boolean;
  rules?: CommunityRule[];
  moderatorUsernames?: string[];
  bannedUsernames?: string[];
  createdAt: string;
}

