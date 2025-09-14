import { Principal } from '@dfinity/principal';

export interface CompetitionEntry {
  id: string;
  principal: Principal;
  email: string;
  emailVerified: boolean;
  bundleId?: string; // For subscription entries
  entryType: 'subscriber' | 'creator' | 'social_share';
  socialProof?: {
    platform: 'twitter' | 'linkedin' | 'facebook';
    postUrl: string;
    verified: boolean;
  };
  createdAt: Date;
}

export interface BundleSubscription {
  id: string;
  bundleId: string;
  subscriberPrincipal: Principal;
  subscriberEmail: string;
  referralSource?: string; // Track where they came from
  subscribedAt: Date;
}

export interface BundleCreatorStats {
  creatorPrincipal: Principal;
  bundleId: string;
  subscriptions: number;
  socialShares: number;
  totalScore: number; // subscriptions * 10 + socialShares * 5
}

export interface CompetitionConfig {
  isActive: boolean;
  startDate: Date;
  endDate: Date;
  prizes: {
    randomSubscribers: { count: 30; amount: 10 }; // $10 each
    randomSocialShares: { count: 30; amount: 10 }; // $10 each
    topCreators: { first: 500; second: 300; third: 200 }; // $500, $300, $200
  };
}

// Mock competition config
export const competitionConfig: CompetitionConfig = {
  isActive: true,
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-01-31'),
  prizes: {
    randomSubscribers: { count: 30, amount: 10 },
    randomSocialShares: { count: 30, amount: 10 },
    topCreators: { first: 500, second: 300, third: 200 },
  },
};

// Helper functions
export function generateShareUrl(bundleId: string, creatorPrincipal: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/bundle/${bundleId}?ref=${creatorPrincipal}`;
}

export function generateTwitterShareText(bundleName: string, bundleSymbol: string): string {
  return `Just discovered this amazing ${bundleName} (${bundleSymbol}) bundle on @xfusion_finance! 🚀\n\nDiversified crypto portfolios made simple. Check it out and subscribe! 💎\n\n#XFusion #DeFi #ChainKey`;
}

export function generateLinkedInShareText(bundleName: string, bundleSymbol: string): string {
  return `Excited to share this innovative ${bundleName} bundle on XFusion! 🚀\n\nXFusion is revolutionizing portfolio management with Chain-Key token bundling. Their ${bundleSymbol} bundle offers professional-grade diversification in a single token.\n\n#DeFi #Innovation #ChainKey #XFusion`;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function formatPrizeAmount(amount: number): string {
  return `$${amount}`;
}

export function getTimeRemaining(endDate: Date): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const now = new Date().getTime();
  const end = endDate.getTime();
  const timeLeft = Math.max(0, end - now);

  return {
    days: Math.floor(timeLeft / (1000 * 60 * 60 * 24)),
    hours: Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((timeLeft % (1000 * 60)) / 1000),
  };
} 