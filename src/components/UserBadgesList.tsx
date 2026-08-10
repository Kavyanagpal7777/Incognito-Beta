/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { getOrderedBadges, BadgeInfo } from '../lib/userBadges';

interface UserBadgesListProps {
  role?: string;
  karma?: number;
  leaderboardRank?: number;
  isOgMember?: boolean;
  ogSubscriptionExpiryDate?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  maxVisible?: number;
  className?: string;
}

export const UserBadgesList: React.FC<UserBadgesListProps> = ({
  role,
  karma = 0,
  leaderboardRank,
  isOgMember,
  ogSubscriptionExpiryDate,
  size = 'sm',
  maxVisible = 4,
  className = ''
}) => {
  const badges = getOrderedBadges({
    role,
    karma,
    leaderboardRank,
    isOgMember,
    ogSubscriptionExpiryDate
  });

  if (badges.length === 0) return null;

  const visibleBadges = badges.slice(0, maxVisible);

  const sizeClasses = {
    xs: 'px-1.5 py-0.2 text-[9px] gap-1',
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-xs sm:text-sm gap-2 font-bold'
  }[size];

  const iconSizes = {
    xs: 'text-[10px]',
    sm: 'text-[11px]',
    md: 'text-xs',
    lg: 'text-sm'
  }[size];

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {visibleBadges.map((badge: BadgeInfo) => (
        <span
          key={badge.id}
          title={`${badge.label}: ${badge.description}`}
          className={`inline-flex items-center rounded-full font-bold border transition-all cursor-default select-none ${badge.colorClass} ${sizeClasses}`}
        >
          <span className={iconSizes}>{badge.icon}</span>
          <span>{badge.label}</span>
        </span>
      ))}
    </div>
  );
};

export default UserBadgesList;
