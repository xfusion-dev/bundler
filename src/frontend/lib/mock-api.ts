// Mock API service for token data
import tokensData from './final-tokens.json';

export interface Token {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h?: number;
  marketCap: number;
  description: string;
  color: string;
  logo: string;
  category: string;
}

// Color mapping for different tokens/categories
const getTokenColor = (symbol: string, category: string): string => {
  const colorMap: Record<string, string> = {
    // Classics
    'BTC': '#f7931a',
    'ETH': '#627eea',
    'SOL': '#9945ff',
    'XRP': '#23292f',
    'BNB': '#f3ba2f',
    'XLM': '#7b8ab8',
    'LTC': '#bfbbbb',
    'BCH': '#8dc351',
    'DOT': '#e6007a',
    'AVAX': '#e84142',
    'ATOM': '#2e3148',
    'NEAR': '#00c08b',
    'HBAR': '#00295c',
    'TON': '#0088cc',
    'APT': '#00d4aa',
    'ICP': '#29abe2',
    'ARB': '#28a0f0',
    'INJ': '#00d2ff',
    'OP': '#ff0420',
    'MATIC': '#8247e5',
    
    // DeFi
    'UNI': '#ff007a',
    'AAVE': '#b6509e',
    'JUP': '#c7931e',
    'CRV': '#40649a',
    'CAKE': '#d1884f',
    'RAY': '#c200fb',
    'JTO': '#7c3aed',
    
    // Infrastructure
    'LINK': '#375bd2',
    'FET': '#02d9f7',
    'TIA': '#7c2ae8',
    'GRT': '#6f4cff',
    'ENS': '#5298ff',
    'PYTH': '#7c65c1',
    'W': '#615ccd',
    'ZRO': '#3b82f6',
    'UMA': '#ff6b6b',
    
    // Meme
    'DOGE': '#c2a633',
    'SHIB': '#ffa409',
    'PEPE': '#00b894',
    'PENGU': '#74c0fc',
    'TRUMP': '#dc2626',
    'BONK': '#f59e0b',
    'PUMP': '#8b5cf6',
    
    // RWA/Stocks - use gold/business colors
    'XAUT': '#ffd700',
    'TSLAX': '#cc0000', // Tesla red
  };
  
  // Return specific color if found, otherwise default by category
  if (colorMap[symbol]) {
    return colorMap[symbol];
  }
  
  // Category defaults
  switch (category.toLowerCase()) {
    case 'classics': return '#3b82f6';
    case 'defi': return '#10b981';
    case 'rwa / stocks': return '#f59e0b';
    case 'infrastructure': return '#8b5cf6';
    case 'meme': return '#ef4444';
    default: return '#6b7280';
  }
};

// Generate description based on category and name
const getTokenDescription = (name: string, category: string): string => {
  const descriptions: Record<string, string> = {
    // Specific overrides
    'Bitcoin': 'THE cryptocurrency',
    'Ethereum': 'The world computer blockchain',
    'Solana': 'High-performance blockchain',
    'XRP': 'Digital payment protocol',
    'BNB': 'Binance ecosystem token',
    'Stellar': 'Cross-border payments',
    'Litecoin': 'Digital silver to Bitcoin\'s gold',
    'Bitcoin Cash': 'Peer-to-peer electronic cash',
    'Polkadot': 'Multi-chain protocol',
    'Avalanche': 'Scalable blockchain platform',
    'Cosmos Hub': 'Internet of blockchains',
    'NEAR Protocol': 'Developer-friendly blockchain',
    'Hedera': 'Enterprise-grade hashgraph',
    'Toncoin': 'Telegram blockchain network',
    'Aptos': 'Move-based Layer 1',
    'Internet Computer': 'Decentralized cloud computing',
    'Arbitrum': 'Ethereum Layer 2 scaling',
    'Injective': 'Decentralized derivatives',
    'Optimism': 'Ethereum scaling solution',
    'Polygon': 'Ethereum scaling platform',
    
    'Uniswap': 'Leading decentralized exchange',
    'Aave': 'Decentralized lending protocol',
    'Jupiter': 'Solana DEX aggregator',
    'Curve DAO': 'Stablecoin exchange protocol',
    'PancakeSwap': 'BSC decentralized exchange',
    'Raydium': 'Solana automated market maker',
    'Jito': 'Solana liquid staking',
    
    'Chainlink': 'Decentralized oracle network',
    'Artificial Superintelligence Alliance': 'AI blockchain ecosystem',
    'Celestia': 'Modular blockchain network',
    'The Graph': 'Blockchain data indexing',
    'Ethereum Name Service': 'Web3 domain names',
    'Pyth Network': 'High-fidelity price feeds',
    'Wormhole': 'Cross-chain bridge protocol',
    'LayerZero': 'Omnichain interoperability',
    'UMA': 'Decentralized financial contracts',
    
    'Tether Gold': 'Tokenized Gold',
    'Dogecoin': 'The original meme cryptocurrency',
    'Shiba Inu': 'Dogecoin killer meme token',
    'Pepe': 'Internet meme frog token',
    'Pudgy Penguins': 'NFT community token',
    'Official Trump': 'Political meme token',
    'Bonk': 'Solana meme token',
    'Pump': 'Community-driven meme token',
  };
  
  if (descriptions[name]) {
    return descriptions[name];
  }
  
  // xStock tokens
  if (name.includes('xStock')) {
    return `Tokenized ${name.replace(' xStock', '')} stock`;
  }
  
  // Category-based defaults
  switch (category.toLowerCase()) {
    case 'classics': return 'Established cryptocurrency';
    case 'defi': return 'Decentralized finance protocol';
    case 'rwa / stocks': return 'Real world asset token';
    case 'infrastructure': return 'Blockchain infrastructure';
    case 'meme': return 'Community meme token';
    default: return 'Digital asset token';
  }
};

// API token type
interface ApiToken {
  id: string;
  name: string;
  symbol: string;
  logo: string;
  current_price: number | null;
  market_cap: number | null;
  price_change_percentage_24h: number | null;
  token_id: string;
  category: string;
}

// Transform API token to component format
const transformToken = (apiToken: ApiToken): Token => {
  return {
    id: apiToken.symbol.toLowerCase(), // Remove ck prefix
    symbol: apiToken.symbol, // Remove ck prefix
    name: apiToken.name,
    price: apiToken.current_price || 0,
    change24h: apiToken.price_change_percentage_24h || 0,
    volume24h: Math.floor(Math.random() * 1000000000), // Mock volume since not in API
    marketCap: apiToken.market_cap || 0,
    description: getTokenDescription(apiToken.name, apiToken.category),
    color: getTokenColor(apiToken.symbol, apiToken.category),
    logo: apiToken.logo,
    category: apiToken.category.toLowerCase().replace(' / ', '_').replace(' ', '_')
  };
};

// Mock API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock API functions
export const mockApi = {
  async getAllTokens(): Promise<Token[]> {
    await delay(500); // Simulate API delay
    
    return tokensData.tokens
      .filter(token => token.current_price !== null) // Filter out tokens with no price
      .map(transformToken);
  },
  
  async getTokensByCategory(category: string): Promise<Token[]> {
    await delay(300);
    
    const allTokens = await this.getAllTokens();
    
    if (category === 'all') {
      return allTokens;
    }
    
    const categoryMap: Record<string, string> = {
      'classics': 'Classics',
      'defi': 'DeFi', 
      'rwa': 'RWA / Stocks',
      'infrastructure': 'Infrastructure',
      'meme': 'Meme'
    };
    
    const targetCategory = categoryMap[category];
    if (!targetCategory) return [];
    
    return allTokens.filter(token => 
      token.category === targetCategory.toLowerCase().replace(' / ', '_').replace(' ', '_')
    );
  },
  
  async searchTokens(query: string): Promise<Token[]> {
    await delay(200);
    
    const allTokens = await this.getAllTokens();
    const searchTerm = query.toLowerCase();
    
    return allTokens.filter(token =>
      token.name.toLowerCase().includes(searchTerm) ||
      token.symbol.toLowerCase().includes(searchTerm) ||
      token.description.toLowerCase().includes(searchTerm)
    );
  }
}; 