/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type StaffRole = 'owner' | 'super_admin' | 'admin' | 'moderator' | 'user' | 'none';

export interface BadgeInfo {
  id: string;
  type: 'staff' | 'leaderboard' | 'rank' | 'og';
  label: string;
  icon: string;
  colorClass: string;
  description: string;
}

/**
 * 1. Staff Role Badge (Manual Assignment Only)
 */
export function getStaffRoleBadge(role?: string): BadgeInfo | null {
  if (!role || role === 'user' || role === 'none') return null;

  switch (role) {
    case 'owner':
      return {
        id: 'role_owner',
        type: 'staff',
        label: 'Owner',
        icon: '👑',
        colorClass: 'bg-amber-500/20 text-amber-300 border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]',
        description: 'Platform Creator & Owner with unrestricted governance.'
      };
    case 'super_admin':
      return {
        id: 'role_super_admin',
        type: 'staff',
        label: 'Super Admin',
        icon: '🛡️',
        colorClass: 'bg-rose-500/20 text-rose-300 border-rose-400/50 shadow-[0_0_12px_rgba(244,63,94,0.3)]',
        description: 'Super Administrator with senior operational privileges.'
      };
    case 'admin':
      return {
        id: 'role_admin',
        type: 'staff',
        label: 'Administrator',
        icon: '⚖️',
        colorClass: 'bg-blue-500/20 text-blue-300 border-blue-400/50 shadow-[0_0_12px_rgba(59,130,246,0.3)]',
        description: 'System Administrator enforcing community standards.'
      };
    case 'moderator':
      return {
        id: 'role_moderator',
        type: 'staff',
        label: 'Moderator',
        icon: '🛠️',
        colorClass: 'bg-blue-500/20 text-cyan-300 border-cyan-400/50 shadow-[0_0_12px_rgba(0,217,255,0.3)]',
        description: 'Community Moderator maintaining order and reviewing reports.'
      };
    default:
      return null;
  }
}

/**
 * 2. Leaderboard Title Badge (Top 100 users by Karma)
 */
export function getLeaderboardTitleBadge(rankNumber?: number): BadgeInfo | null {
  if (!rankNumber || rankNumber < 1 || rankNumber > 100) return null;

  return {
    id: `leader_${rankNumber}`,
    type: 'leaderboard',
    label: `Leader #${rankNumber}`,
    icon: '🏅',
    colorClass: 'bg-gradient-to-r from-amber-500/20 via-yellow-400/30 to-amber-500/20 text-amber-200 border-amber-400/50 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.3)]',
    description: `Ranked #${rankNumber} on the Global Karma Leaderboard.`
  };
}

/**
 * 3. User Rank Badge (Automated Progression by Karma)
 */
export function getUserRankBadge(karma: number = 0): BadgeInfo {
  if (karma >= 5000) {
    return {
      id: 'rank_veteran',
      type: 'rank',
      label: 'Veteran',
      icon: '🏆',
      colorClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50 shadow-[0_0_10px_rgba(16,185,129,0.25)]',
      description: 'Veteran rank awarded for exceptional high-karma community contribution (5,000+ Karma).'
    };
  } else if (karma >= 2000) {
    return {
      id: 'rank_elite',
      type: 'rank',
      label: 'Elite Member',
      icon: '💎',
      colorClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.25)]',
      description: 'Elite rank awarded for distinguished participation (2,000 - 4,999 Karma).'
    };
  } else if (karma >= 500) {
    return {
      id: 'rank_active',
      type: 'rank',
      label: 'Active Member',
      icon: '⭐',
      colorClass: 'bg-amber-500/15 text-orange-300 border-orange-400/40 shadow-[0_0_8px_rgba(249,115,22,0.2)]',
      description: 'Active rank awarded for consistent activity (500 - 1,999 Karma).'
    };
  } else if (karma >= 100) {
    return {
      id: 'rank_member',
      type: 'rank',
      label: 'Member',
      icon: '👤',
      colorClass: 'bg-slate-500/15 text-slate-300 border-slate-400/30',
      description: 'Established community member (100 - 499 Karma).'
    };
  } else {
    return {
      id: 'rank_new',
      type: 'rank',
      label: 'New Member',
      icon: '🆕',
      colorClass: 'bg-slate-400/15 text-slate-200 border-slate-300/30',
      description: 'Newly joined node on Incógnito (0 - 99 Karma).'
    };
  }
}

/**
 * 4. OG Monthly Membership Badge (₹100 INR/month)
 */
export function getOgMembershipBadge(isOgMember?: boolean, expiryDate?: string): BadgeInfo | null {
  if (!isOgMember) return null;

  if (expiryDate) {
    const expiryTime = new Date(expiryDate).getTime();
    if (!isNaN(expiryTime) && expiryTime < Date.now()) {
      return null; // Expired
    }
  }

  return {
    id: 'og_membership',
    type: 'og',
    label: 'OG',
    icon: '👑',
    colorClass: 'bg-gradient-to-r from-blue-600/30 via-amber-500/30 to-cyan-500/30 text-amber-300 border-amber-400/60 shadow-[0_0_14px_rgba(234,179,8,0.35)] animate-pulse',
    description: 'OG Premium Supporter Membership (₹100/mo) - Unlocks exclusive profile cosmetics.'
  };
}

/**
 * Get ordered badges in exact prompt display order:
 * 1. Staff Role
 * 2. Leaderboard Title
 * 3. User Rank
 * 4. OG Membership
 */
export function getOrderedBadges(params: {
  role?: string;
  karma?: number;
  leaderboardRank?: number;
  isOgMember?: boolean;
  ogSubscriptionExpiryDate?: string;
}): BadgeInfo[] {
  const result: BadgeInfo[] = [];

  // 1. Staff Role
  const staffBadge = getStaffRoleBadge(params.role);
  if (staffBadge) result.push(staffBadge);

  // 2. Leaderboard Title
  const leaderBadge = getLeaderboardTitleBadge(params.leaderboardRank);
  if (leaderBadge) result.push(leaderBadge);

  // 3. User Rank
  const rankBadge = getUserRankBadge(params.karma ?? 0);
  result.push(rankBadge);

  // 4. OG Membership
  const ogBadge = getOgMembershipBadge(params.isOgMember, params.ogSubscriptionExpiryDate);
  if (ogBadge) result.push(ogBadge);

  return result;
}
