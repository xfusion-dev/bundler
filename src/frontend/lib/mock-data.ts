// Mock data for XFusion bundles
export interface BundleAsset {
  symbol: string;
  percentage: number;
  color: string;
}

export interface Bundle {
  id: string;
  name: string;
  symbol: string;
  description: string;
  creator: string;
  assets: BundleAsset[];
  price: number;
  change: number;
  holders: number;
  tvl: number;
}

export const mockBundles: Bundle[] = [
  {
    id: 'bundle_defi_001',
    name: 'DeFi Index',
    symbol: 'DEFI',
    description: 'Diversified exposure to top DeFi protocols.',
    creator: 'DeFi_Master',
    assets: [
      { symbol: 'BTC', percentage: 30, color: '#f7931a' },
      { symbol: 'ETH', percentage: 25, color: '#627eea' },
      { symbol: 'SOL', percentage: 20, color: '#9945ff' },
      { symbol: 'AVAX', percentage: 15, color: '#e84142' },
      { symbol: 'DOT', percentage: 10, color: '#e6007a' },
    ],
    price: 245.67,
    change: 5.67,
    holders: 1247,
    tvl: 15.6,
  },
  {
    id: 'bundle_btc_002',
    name: 'Bitcoin Ecosystem',
    symbol: 'BTC+',
    description: 'Pure Bitcoin exposure with additional assets.',
    creator: 'Bitcoin_Maxi',
    assets: [
      { symbol: 'BTC', percentage: 70, color: '#f7931a' },
      { symbol: 'LTC', percentage: 15, color: '#bfbbbb' },
      { symbol: 'BCH', percentage: 10, color: '#8dc351' },
      { symbol: 'DOGE', percentage: 5, color: '#c2a633' },
    ],
    price: 189.45,
    change: 3.21,
    holders: 892,
    tvl: 8.9,
  },
  {
    id: 'bundle_l1_003',
    name: 'Layer 1 Portfolio',
    symbol: 'L1',
    description: 'Balanced exposure to leading blockchain protocols.',
    creator: 'Crypto_Analyst',
    assets: [
      { symbol: 'ETH', percentage: 25, color: '#627eea' },
      { symbol: 'BTC', percentage: 25, color: '#f7931a' },
      { symbol: 'SOL', percentage: 20, color: '#9945ff' },
      { symbol: 'ADA', percentage: 15, color: '#0033ad' },
      { symbol: 'DOT', percentage: 15, color: '#e6007a' },
    ],
    price: 156.78,
    change: -2.34,
    holders: 634,
    tvl: 4.2,
  },
];

// Mock platform statistics
export interface PlatformStats {
  createdBundles: string;
  subscribedUsers: string;
  totalPrizes: string;
}

export const mockPlatformStats: PlatformStats = {
  createdBundles: '127',
  subscribedUsers: '2,341',
  totalPrizes: '$1,600',
}; 