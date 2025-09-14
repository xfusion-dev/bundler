export interface Asset {
  id: string;
  symbol: string;
  name: string;
  color: string;
  price: number; // Current price in USD
  marketCap: number;
  volume24h: number;
  change24h: number;
  logo?: string;
}

export const availableAssets: Asset[] = [
  {
    id: 'bitcoin',
    symbol: 'BTC',
    name: 'Bitcoin',
    color: '#f7931a',
    price: 45000,
    marketCap: 880000000000,
    volume24h: 25000000000,
    change24h: 2.34,
  },
  {
    id: 'ethereum',
    symbol: 'ETH',
    name: 'Ethereum',
    color: '#627eea',
    price: 3000,
    marketCap: 360000000000,
    volume24h: 15000000000,
    change24h: 1.87,
  },
  {
    id: 'bnb',
    symbol: 'BNB',
    name: 'BNB',
    color: '#f3ba2f',
    price: 320,
    marketCap: 48000000000,
    volume24h: 1200000000,
    change24h: -0.45,
  },
  {
    id: 'solana',
    symbol: 'SOL',
    name: 'Solana',
    color: '#9945ff',
    price: 100,
    marketCap: 45000000000,
    volume24h: 2800000000,
    change24h: 4.12,
  },
  {
    id: 'ripple',
    symbol: 'XRP',
    name: 'Ripple',
    color: '#23292f',
    price: 0.65,
    marketCap: 36000000000,
    volume24h: 1800000000,
    change24h: -1.23,
  },
  {
    id: 'stellar',
    symbol: 'XLM',
    name: 'Stellar',
    color: '#7d00ff',
    price: 0.12,
    marketCap: 3500000000,
    volume24h: 180000000,
    change24h: 0.89,
  },
  {
    id: 'sui',
    symbol: 'SUI',
    name: 'Sui',
    color: '#6fbcf0',
    price: 4.25,
    marketCap: 12000000000,
    volume24h: 850000000,
    change24h: 6.78,
  },
  {
    id: 'hedera',
    symbol: 'HBAR',
    name: 'Hedera',
    color: '#000000',
    price: 0.28,
    marketCap: 10000000000,
    volume24h: 120000000,
    change24h: 2.15,
  },
  {
    id: 'near',
    symbol: 'NEAR',
    name: 'Near Protocol',
    color: '#00ec97',
    price: 5.80,
    marketCap: 6500000000,
    volume24h: 320000000,
    change24h: 3.45,
  },
  {
    id: 'icp',
    symbol: 'ICP',
    name: 'Internet Computer',
    color: '#29abe2',
    price: 12.50,
    marketCap: 5800000000,
    volume24h: 95000000,
    change24h: -0.67,
  },
];

// Helper functions
export function getAssetById(id: string): Asset | undefined {
  return availableAssets.find(asset => asset.id === id);
}

export function getAssetBySymbol(symbol: string): Asset | undefined {
  return availableAssets.find(asset => asset.symbol === symbol);
}

export function formatMarketCap(marketCap: number): string {
  if (marketCap >= 1000000000000) {
    return `$${(marketCap / 1000000000000).toFixed(1)}T`;
  } else if (marketCap >= 1000000000) {
    return `$${(marketCap / 1000000000).toFixed(1)}B`;
  } else if (marketCap >= 1000000) {
    return `$${(marketCap / 1000000).toFixed(1)}M`;
  }
  return `$${marketCap.toLocaleString()}`;
}

export function formatVolume(volume: number): string {
  if (volume >= 1000000000) {
    return `$${(volume / 1000000000).toFixed(1)}B`;
  } else if (volume >= 1000000) {
    return `$${(volume / 1000000).toFixed(1)}M`;
  }
  return `$${volume.toLocaleString()}`;
} 