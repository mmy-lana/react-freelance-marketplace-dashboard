import { useMemo } from 'react';
import {
  SELLER_LEVEL_LABELS,
  type SellerLevel,
  type UserProfile,
} from '../types/marketplace';

export type QualificationUnit = 'percent' | 'count' | 'currency';

export interface SellerQualificationRequirement {
  label: string;
  target: number;
  current: number;
  unit: QualificationUnit;
  isMet: boolean;
}

export interface SellerQualificationResult {
  currentLevel: SellerLevel;
  nextLevel: SellerLevel | null;
  requirements: SellerQualificationRequirement[];
  eligibleForPromotion: boolean;
}

interface LevelThreshold {
  earningsCents: number;
  orderCount: number;
  rating: number;
  responseRate: number;
  onTimeDelivery: number;
  orderCompletion: number;
}

const LEVEL_THRESHOLDS: Record<Exclude<SellerLevel, 'new_seller'>, LevelThreshold> = {
  level_one: {
    earningsCents: 40_000,
    orderCount: 10,
    rating: 4.5,
    responseRate: 90,
    onTimeDelivery: 90,
    orderCompletion: 90,
  },
  level_two: {
    earningsCents: 200_000,
    orderCount: 50,
    rating: 4.7,
    responseRate: 90,
    onTimeDelivery: 90,
    orderCompletion: 90,
  },
  top_rated: {
    earningsCents: 1_000_000,
    orderCount: 100,
    rating: 4.8,
    responseRate: 90,
    onTimeDelivery: 90,
    orderCompletion: 90,
  },
};

const NEXT_LEVEL: Record<SellerLevel, SellerLevel | null> = {
  new_seller: 'level_one',
  level_one: 'level_two',
  level_two: 'top_rated',
  top_rated: null,
};

/**
 * Pure seller tier qualification engine.
 *
 * Returns the requirement checklist for the next tier plus an overall
 * promotion verdict. `top_rated` is terminal and yields an empty checklist.
 */
export function evaluateSellerLevel(profile: UserProfile): SellerQualificationResult {
  const current = profile.level;
  const nextLevel = NEXT_LEVEL[current];

  if (nextLevel === null) {
    return {
      currentLevel: 'top_rated',
      nextLevel: null,
      requirements: [],
      eligibleForPromotion: false,
    };
  }

  const threshold = LEVEL_THRESHOLDS[nextLevel as Exclude<SellerLevel, 'new_seller'>];

  const requirements: SellerQualificationRequirement[] = [
    {
      label: 'Completed Orders',
      target: threshold.orderCount,
      current: profile.completedOrdersCount,
      unit: 'count',
      isMet: profile.completedOrdersCount >= threshold.orderCount,
    },
    {
      label: 'Total Earnings',
      target: threshold.earningsCents,
      current: profile.totalEarnedCents,
      unit: 'currency',
      isMet: profile.totalEarnedCents >= threshold.earningsCents,
    },
    {
      label: 'Rating Score',
      target: threshold.rating,
      current: profile.rating,
      unit: 'count',
      isMet: profile.rating >= threshold.rating,
    },
    {
      label: 'Response Rate',
      target: threshold.responseRate,
      current: profile.responseRatePercent,
      unit: 'percent',
      isMet: profile.responseRatePercent >= threshold.responseRate,
    },
    {
      label: 'On-Time Delivery',
      target: threshold.onTimeDelivery,
      current: profile.onTimeDeliveryPercent,
      unit: 'percent',
      isMet: profile.onTimeDeliveryPercent >= threshold.onTimeDelivery,
    },
    {
      label: 'Order Completion',
      target: threshold.orderCompletion,
      current: profile.orderCompletionPercent,
      unit: 'percent',
      isMet: profile.orderCompletionPercent >= threshold.orderCompletion,
    },
  ];

  return {
    currentLevel: current,
    nextLevel,
    requirements,
    eligibleForPromotion: requirements.every((requirement) => requirement.isMet),
  };
}

export interface SellerProgressionView {
  qualification: SellerQualificationResult;
  currentLevelLabel: string;
  nextLevelLabel: string | null;
  /** 0-100, the mean completion ratio across all requirements. */
  overallProgressPercent: number;
  unmetRequirementCount: number;
}

/** Memoized qualification + progress projection for the seller dashboard. */
export function useSellerProgression(profile: UserProfile): SellerProgressionView {
  return useMemo(() => {
    const qualification = evaluateSellerLevel(profile);

    const overallProgressPercent =
      qualification.requirements.length === 0
        ? 100
        : Math.round(
            (qualification.requirements.reduce((sum, requirement) => {
              const ratio = requirement.target === 0 ? 1 : Math.min(requirement.current / requirement.target, 1);
              return sum + ratio;
            }, 0) /
              qualification.requirements.length) *
              100
          );

    return {
      qualification,
      currentLevelLabel: SELLER_LEVEL_LABELS[qualification.currentLevel],
      nextLevelLabel: qualification.nextLevel === null ? null : SELLER_LEVEL_LABELS[qualification.nextLevel],
      overallProgressPercent,
      unmetRequirementCount: qualification.requirements.filter((requirement) => !requirement.isMet).length,
    };
  }, [profile]);
}