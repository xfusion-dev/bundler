import { Principal } from '@dfinity/principal';

// ============================================
// MOCK QUOTES
// ============================================

export const mockQuoteResponses = {
  buyQuote: (bundleId: number, ckusdcAmount: bigint) => {
    const feeRate = 0.003; // 0.3%
    const fee = Number(ckusdcAmount) * feeRate;
    const amountAfterFee = Number(ckusdcAmount) - fee;

    // Mock NAV rates for different bundles
    const navRates: Record<number, number> = {
      1: 1.25e8,  // DeFi bundle - $1.25 per NAV
      2: 2.10e8,  // Tech bundle - $2.10 per NAV
      3: 0.98e8,  // Stable bundle - $0.98 per NAV
      4: 3.45e8,  // Commodity bundle - $3.45 per NAV
      5: 1.75e8,  // Balanced bundle - $1.75 per NAV
    };

    const navRate = navRates[bundleId] || 1e8;
    const navTokens = Math.floor((amountAfterFee * 1e8) / navRate);

    return {
      request_id: BigInt(Date.now()),
      resolver: Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai'),
      bundle_id: BigInt(bundleId),
      operation: 'buy' as const,
      ckusdc_amount: ckusdcAmount,
      nav_tokens: BigInt(navTokens),
      fees: BigInt(Math.floor(fee)),
      estimated_nav: BigInt(navRate),
      assigned_at: BigInt(Date.now()),
      valid_until: BigInt(Date.now() + 60000),
    };
  },

  sellQuote: (bundleId: number, navTokenAmount: bigint) => {
    const navRates: Record<number, number> = {
      1: 1.25e8,
      2: 2.10e8,
      3: 0.98e8,
      4: 3.45e8,
      5: 1.75e8,
    };

    const navRate = navRates[bundleId] || 1e8;
    const ckusdcAmount = Math.floor((Number(navTokenAmount) * navRate) / 1e8);
    const fee = ckusdcAmount * 0.003;

    return {
      request_id: BigInt(Date.now()),
      resolver: Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai'),
      bundle_id: BigInt(bundleId),
      operation: 'sell' as const,
      ckusdc_amount: BigInt(ckusdcAmount - Math.floor(fee)),
      nav_tokens: navTokenAmount,
      fees: BigInt(Math.floor(fee)),
      estimated_nav: BigInt(navRate),
      assigned_at: BigInt(Date.now()),
      valid_until: BigInt(Date.now() + 60000),
    };
  }
};

// ============================================
// MOCK NAV HISTORY
// ============================================

export const generateMockNavHistory = (bundleId: number, period: '24h' | '7d' | '30d' | '1y') => {
  const now = Date.now();
  const baseNav = {
    1: 125000000,  // $1.25
    2: 210000000,  // $2.10
    3: 98000000,   // $0.98
    4: 345000000,  // $3.45
    5: 175000000,  // $1.75
  }[bundleId] || 100000000;

  const intervals = {
    '24h': { points: 24, ms: 3600000 },     // 1 hour intervals
    '7d': { points: 28, ms: 21600000 },     // 6 hour intervals
    '30d': { points: 30, ms: 86400000 },    // 1 day intervals
    '1y': { points: 52, ms: 604800000 },    // 1 week intervals
  }[period];

  const history = [];
  for (let i = intervals.points; i >= 0; i--) {
    const timestamp = now - (i * intervals.ms);
    // Add some realistic volatility
    const volatility = (Math.sin(i * 0.5) * 0.1 + Math.random() * 0.05);
    const nav = Math.floor(baseNav * (1 + volatility));

    history.push({
      timestamp: new Date(timestamp).toISOString(),
      nav_per_token: nav,
      total_nav_usd: nav * 1000000, // Assume 1M tokens total
      total_tokens: 1000000,
      bundle_id: bundleId,
    });
  }

  return history;
};

// ============================================
// MOCK USER PORTFOLIO
// ============================================

export const mockUserPortfolio = {
  nav_tokens: [
    {
      bundle_id: 1,
      bundle_name: 'DeFi Titans',
      amount: BigInt(5000e8), // 5000 NAV tokens
      current_value: BigInt(6250e6), // $6,250 (5000 * $1.25)
      pnl: BigInt(250e6), // $250 profit
      pnl_percentage: 4.17,
      last_updated: BigInt(Date.now()),
    },
    {
      bundle_id: 2,
      bundle_name: 'Tech Giants',
      amount: BigInt(2000e8), // 2000 NAV tokens
      current_value: BigInt(4200e6), // $4,200 (2000 * $2.10)
      pnl: BigInt(-300e6), // $300 loss
      pnl_percentage: -6.67,
      last_updated: BigInt(Date.now()),
    },
    {
      bundle_id: 3,
      bundle_name: 'Stable Haven',
      amount: BigInt(10000e8), // 10000 NAV tokens
      current_value: BigInt(9800e6), // $9,800
      pnl: BigInt(-200e6), // $200 loss
      pnl_percentage: -2.0,
      last_updated: BigInt(Date.now()),
    },
  ],

  total_value: BigInt(20250e6), // $20,250 total
  total_pnl: BigInt(-250e6), // $250 loss overall
  total_pnl_percentage: -1.22,

  recent_transactions: [
    {
      id: BigInt(1001),
      bundle_id: 1,
      bundle_name: 'DeFi Titans',
      operation: 'buy' as const,
      nav_tokens: BigInt(1000e8),
      ckusdc_amount: BigInt(1200e6),
      status: 'completed' as const,
      timestamp: BigInt(Date.now() - 3600000),
    },
    {
      id: BigInt(1002),
      bundle_id: 2,
      bundle_name: 'Tech Giants',
      operation: 'sell' as const,
      nav_tokens: BigInt(500e8),
      ckusdc_amount: BigInt(1050e6),
      status: 'completed' as const,
      timestamp: BigInt(Date.now() - 7200000),
    },
    {
      id: BigInt(1003),
      bundle_id: 3,
      bundle_name: 'Stable Haven',
      operation: 'buy' as const,
      nav_tokens: BigInt(5000e8),
      ckusdc_amount: BigInt(5000e6),
      status: 'completed' as const,
      timestamp: BigInt(Date.now() - 86400000),
    },
  ],
};

// ============================================
// MOCK ASSETS WITH PRICES
// ============================================

export const mockAssetsWithPrices = [
  {
    id: 'ckBTC',
    symbol: 'ckBTC',
    name: 'Chain Key Bitcoin',
    category: 'Cryptocurrency',
    decimals: 8,
    current_price: BigInt(45000e6), // $45,000
    price_24h_change: 2.5,
    volume_24h: BigInt(1500000e6),
    market_cap: BigInt(900000000e6),
    logo_url: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
    is_active: true,
    ledger_canister: 'mxzaz-hqaaa-aaaar-qaada-cai',
  },
  {
    id: 'ckETH',
    symbol: 'ckETH',
    name: 'Chain Key Ethereum',
    category: 'Cryptocurrency',
    decimals: 18,
    current_price: BigInt(2500e6), // $2,500
    price_24h_change: 3.2,
    volume_24h: BigInt(800000e6),
    market_cap: BigInt(300000000e6),
    logo_url: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
    is_active: true,
    ledger_canister: 'ss2fx-dyaaa-aaaar-qacoq-cai',
  },
  {
    id: 'ckUSDC',
    symbol: 'ckUSDC',
    name: 'Chain Key USDC',
    category: 'Stablecoin',
    decimals: 6,
    current_price: BigInt(1e6), // $1.00
    price_24h_change: 0.01,
    volume_24h: BigInt(50000000e6),
    market_cap: BigInt(1000000000e6),
    logo_url: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
    is_active: true,
    ledger_canister: 'xevnm-gaaaa-aaaar-qafnq-cai',
  },
  {
    id: 'ICP',
    symbol: 'ICP',
    name: 'Internet Computer',
    category: 'Cryptocurrency',
    decimals: 8,
    current_price: BigInt(12e6), // $12.00
    price_24h_change: -1.8,
    volume_24h: BigInt(25000000e6),
    market_cap: BigInt(5500000000e6),
    logo_url: 'https://cryptologos.cc/logos/internet-computer-icp-logo.png',
    is_active: true,
    ledger_canister: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
  },
  {
    id: 'ckUSDT',
    symbol: 'ckUSDT',
    name: 'Chain Key Tether',
    category: 'Stablecoin',
    decimals: 6,
    current_price: BigInt(1e6), // $1.00
    price_24h_change: -0.02,
    volume_24h: BigInt(75000000e6),
    market_cap: BigInt(1500000000e6),
    logo_url: 'https://cryptologos.cc/logos/tether-usdt-logo.png',
    is_active: true,
    ledger_canister: 'cngnf-vqaaa-aaaar-qag4q-cai',
  },
];

export const mockBundlesWithFullData = [
  {
    id: 1,
    name: 'DeFi Titans',
    description: 'Top DeFi protocols and governance tokens',
    creator: Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai'),
    created_at: BigInt(Date.now() - 30 * 24 * 3600000),
    is_active: true,
    allocations: [
      { asset_id: 'ckETH', percentage: 30 },
      { asset_id: 'ICP', percentage: 25 },
      { asset_id: 'ckBTC', percentage: 25 },
      { asset_id: 'ckUSDC', percentage: 20 },
    ],
    nav_per_token: BigInt(125000000), // $1.25
    total_nav_usd: BigInt(12500000e6), // $12.5M
    total_tokens: BigInt(10000000e8), // 10M tokens
    holder_count: 342,
    volume_24h: BigInt(850000e6),
    performance: {
      '24h': 2.3,
      '7d': 5.8,
      '30d': 12.4,
      '1y': 45.2,
    },
  },
  {
    id: 2,
    name: 'Tech Giants',
    description: 'Tokenized tech stocks and blockchain infrastructure',
    creator: Principal.fromText('rdmx6-jaaaa-aaaaa-aaadq-cai'),
    created_at: BigInt(Date.now() - 45 * 24 * 3600000),
    is_active: true,
    allocations: [
      { asset_id: 'ckBTC', percentage: 40 },
      { asset_id: 'ckETH', percentage: 35 },
      { asset_id: 'ICP', percentage: 15 },
      { asset_id: 'ckUSDC', percentage: 10 },
    ],
    nav_per_token: BigInt(210000000), // $2.10
    total_nav_usd: BigInt(21000000e6), // $21M
    total_tokens: BigInt(10000000e8), // 10M tokens
    holder_count: 567,
    volume_24h: BigInt(1250000e6),
    performance: {
      '24h': 3.1,
      '7d': 8.2,
      '30d': -5.3,
      '1y': 67.8,
    },
  },
  {
    id: 3,
    name: 'Stable Haven',
    description: 'Conservative portfolio with stablecoins and blue chips',
    creator: Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai'),
    created_at: BigInt(Date.now() - 60 * 24 * 3600000),
    is_active: true,
    allocations: [
      { asset_id: 'ckUSDC', percentage: 50 },
      { asset_id: 'ckUSDT', percentage: 30 },
      { asset_id: 'ckBTC', percentage: 10 },
      { asset_id: 'ckETH', percentage: 10 },
    ],
    nav_per_token: BigInt(98000000), // $0.98
    total_nav_usd: BigInt(9800000e6), // $9.8M
    total_tokens: BigInt(10000000e8), // 10M tokens
    holder_count: 1234,
    volume_24h: BigInt(450000e6),
    performance: {
      '24h': 0.1,
      '7d': 0.3,
      '30d': 0.8,
      '1y': 2.1,
    },
  },
  {
    id: 4,
    name: 'Commodity Backed',
    description: 'Digital commodities and real-world assets',
    creator: Principal.fromText('xkbqi-2qaaa-aaaah-qbpqq-cai'),
    created_at: BigInt(Date.now() - 90 * 24 * 3600000),
    is_active: true,
    allocations: [
      { asset_id: 'ckBTC', percentage: 50 },
      { asset_id: 'ckUSDC', percentage: 25 },
      { asset_id: 'ICP', percentage: 15 },
      { asset_id: 'ckETH', percentage: 10 },
    ],
    nav_per_token: BigInt(345000000), // $3.45
    total_nav_usd: BigInt(34500000e6), // $34.5M
    total_tokens: BigInt(10000000e8), // 10M tokens
    holder_count: 89,
    volume_24h: BigInt(120000e6),
    performance: {
      '24h': 1.2,
      '7d': 3.4,
      '30d': 8.9,
      '1y': 23.5,
    },
  },
  {
    id: 5,
    name: 'Balanced Portfolio',
    description: 'Equal weight diversified crypto index',
    creator: Principal.fromText('suaf3-hqaaa-aaaaf-qaaya-cai'),
    created_at: BigInt(Date.now() - 120 * 24 * 3600000),
    is_active: true,
    allocations: [
      { asset_id: 'ckBTC', percentage: 25 },
      { asset_id: 'ckETH', percentage: 25 },
      { asset_id: 'ICP', percentage: 25 },
      { asset_id: 'ckUSDC', percentage: 25 },
    ],
    nav_per_token: BigInt(175000000), // $1.75
    total_nav_usd: BigInt(17500000e6), // $17.5M
    total_tokens: BigInt(10000000e8), // 10M tokens
    holder_count: 456,
    volume_24h: BigInt(680000e6),
    performance: {
      '24h': 1.8,
      '7d': 4.5,
      '30d': 7.2,
      '1y': 34.6,
    },
  },
];

// ============================================
// MOCK TRANSACTION STATES
// ============================================

export const mockTransactionFlow = {
  // Simulate transaction state progression
  states: [
    { status: 'pending', message: 'Initializing transaction...', duration: 1000 },
    { status: 'quote_received', message: 'Quote received from resolver', duration: 1500 },
    { status: 'funds_locked', message: 'Locking funds...', duration: 2000 },
    { status: 'in_progress', message: 'Executing trade...', duration: 3000 },
    { status: 'assets_transferred', message: 'Transferring assets...', duration: 2000 },
    { status: 'completed', message: 'Transaction completed!', duration: 0 },
  ],

  // Mock error scenarios
  errors: [
    { code: 'INSUFFICIENT_BALANCE', message: 'Insufficient balance for this trade' },
    { code: 'QUOTE_EXPIRED', message: 'Quote has expired, please request a new one' },
    { code: 'RESOLVER_UNAVAILABLE', message: 'No resolvers available at this time' },
    { code: 'SLIPPAGE_EXCEEDED', message: 'Price moved beyond slippage tolerance' },
  ],
};

// ============================================
// MOCK ORACLE PRICES
// ============================================

export const mockOraclePrices = {
  getPrice: (assetId: string) => {
    const prices: Record<string, bigint> = {
      'ckBTC': BigInt(45000e6),
      'ckETH': BigInt(2500e6),
      'ckUSDC': BigInt(1e6),
      'ckUSDT': BigInt(1e6),
      'ICP': BigInt(12e6),
    };

    return {
      asset_id: assetId,
      price_usd: prices[assetId] || BigInt(0),
      timestamp: BigInt(Date.now()),
      source: 'XFusion Oracle',
      confidence: 99,
    };
  },

  getPriceHistory: (assetId: string, period: string) => {
    const basePrice = mockOraclePrices.getPrice(assetId).price_usd;
    const points = period === '24h' ? 24 : period === '7d' ? 7 : 30;

    return Array.from({ length: points }, (_, i) => {
      const volatility = Math.sin(i * 0.3) * 0.05 + (Math.random() - 0.5) * 0.02;
      return {
        timestamp: BigInt(Date.now() - (points - i) * 3600000),
        price: BigInt(Number(basePrice) * (1 + volatility)),
      };
    });
  },
};

// ============================================
// MOCK USER ALLOWANCES
// ============================================

export const mockAllowances = {
  ckUSDC: BigInt(100000e6), // $100,000 approved
  assets: {
    'ckBTC': BigInt(2e8), // 2 BTC approved
    'ckETH': BigInt(50e18), // 50 ETH approved
    'ICP': BigInt(10000e8), // 10,000 ICP approved
    'ckUSDT': BigInt(50000e6), // $50,000 USDT approved
  },
};

// ============================================
// MOCK RESOLVER DATA
// ============================================

export const mockResolvers = [
  {
    principal: Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai'),
    name: 'Lightning Resolver',
    fee_rate: BigInt(30), // 0.3% (30 basis points)
    is_active: true,
    total_volume: BigInt(5000000e6), // $5M
    successful_trades: 1234,
    failed_trades: 12,
    average_response_time: 850, // ms
    liquidity: {
      'ckUSDC': BigInt(1000000e6), // $1M
      'ckBTC': BigInt(10e8), // 10 BTC
      'ckETH': BigInt(500e18), // 500 ETH
    },
  },
  {
    principal: Principal.fromText('rdmx6-jaaaa-aaaaa-aaadq-cai'),
    name: 'Whale Resolver',
    fee_rate: BigInt(25), // 0.25%
    is_active: true,
    total_volume: BigInt(10000000e6), // $10M
    successful_trades: 3456,
    failed_trades: 23,
    average_response_time: 1200, // ms
    liquidity: {
      'ckUSDC': BigInt(2000000e6), // $2M
      'ckBTC': BigInt(25e8), // 25 BTC
      'ckETH': BigInt(1000e18), // 1000 ETH
    },
  },
];

// ============================================
// MOCK LEADERBOARD
// ============================================

export const mockLeaderboard = {
  top_bundles: [
    { rank: 1, bundle_id: 2, name: 'Tech Giants', performance_30d: 67.8, holders: 567 },
    { rank: 2, bundle_id: 1, name: 'DeFi Titans', performance_30d: 45.2, holders: 342 },
    { rank: 3, bundle_id: 5, name: 'Balanced Portfolio', performance_30d: 34.6, holders: 456 },
  ],

  top_traders: [
    { rank: 1, principal: 'xkbqi-2qaaa-aaaah-qbpqq-cai', pnl: BigInt(45000e6), trades: 234 },
    { rank: 2, principal: 'rdmx6-jaaaa-aaaaa-aaadq-cai', pnl: BigInt(32000e6), trades: 189 },
    { rank: 3, principal: 'rrkah-fqaaa-aaaaa-aaaaq-cai', pnl: BigInt(28000e6), trades: 156 },
  ],
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export const mockHelpers = {
  // Format numbers for display
  formatCurrency: (amount: bigint, decimals: number = 6): string => {
    const value = Number(amount) / Math.pow(10, decimals);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  },

  // Format percentage
  formatPercentage: (value: number): string => {
    const prefix = value > 0 ? '+' : '';
    return `${prefix}${value.toFixed(2)}%`;
  },

  // Format large numbers
  formatCompact: (value: bigint): string => {
    const num = Number(value) / 1e6;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  },

  // Generate random transaction ID
  generateTxId: (): bigint => BigInt(Date.now() + Math.floor(Math.random() * 1000)),

  // Simulate async delay
  delay: (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms)),

  // Get random element from array
  randomElement: <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)],
};

// ============================================
// MOCK API RESPONSES
// ============================================

export const mockApiResponses = {
  // Simulate backend.request_quote()
  requestQuote: async (params: any) => {
    await mockHelpers.delay(500);
    return { Ok: mockHelpers.generateTxId() };
  },

  // Simulate backend.submit_quote_assignment()
  submitQuoteAssignment: async (quote: any) => {
    await mockHelpers.delay(300);
    return { Ok: null };
  },

  // Simulate backend.execute_quote()
  executeQuote: async (requestId: bigint) => {
    await mockHelpers.delay(1000);
    return { Ok: mockHelpers.generateTxId() };
  },

  // Simulate backend.get_transaction()
  getTransaction: async (txId: bigint) => {
    await mockHelpers.delay(200);
    return {
      Ok: {
        id: txId,
        status: mockHelpers.randomElement(['pending', 'in_progress', 'completed']),
        bundle_id: BigInt(1),
        operation: 'buy' as const,
        ckusdc_amount: BigInt(1000e6),
        nav_tokens: BigInt(800e8),
        created_at: BigInt(Date.now() - 60000),
      },
    };
  },

  // Simulate backend.get_user_nav_tokens()
  getUserNavTokens: async (principal: any) => {
    await mockHelpers.delay(300);
    return mockUserPortfolio.nav_tokens;
  },

  // Simulate backend.calculate_bundle_nav()
  calculateBundleNav: async (bundleId: bigint) => {
    await mockHelpers.delay(400);
    const bundle = mockBundlesWithFullData.find(b => b.id === Number(bundleId));
    return {
      Ok: {
        bundle_id: bundleId,
        nav_per_token: bundle?.nav_per_token || BigInt(1e8),
        total_nav_usd: bundle?.total_nav_usd || BigInt(0),
        total_tokens: bundle?.total_tokens || BigInt(0),
        calculated_at: BigInt(Date.now()),
      },
    };
  },
};

// Export everything as default for easy import
export default {
  quotes: mockQuoteResponses,
  navHistory: generateMockNavHistory,
  portfolio: mockUserPortfolio,
  assets: mockAssetsWithPrices,
  bundles: mockBundlesWithFullData,
  transaction: mockTransactionFlow,
  oracle: mockOraclePrices,
  allowances: mockAllowances,
  resolvers: mockResolvers,
  leaderboard: mockLeaderboard,
  helpers: mockHelpers,
  api: mockApiResponses,
};