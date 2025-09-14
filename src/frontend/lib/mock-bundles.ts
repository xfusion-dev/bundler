export interface BundleToken {
  symbol: string;
  name: string;
  allocation: number; // percentage
  logo: string;
}

export interface Bundle {
  id: string;
  name: string;
  description: string;
  category: 'tech' | 'defi' | 'blue-chip' | 'meme' | 'balanced' | 'growth';
  totalValue: number;
  change24h: number;
  volume24h: number;
  tokens: BundleToken[];
  creator: string;
  createdAt: string;
  subscribers: number;
  logo: string;
  color: string;
  risk: 'low' | 'medium' | 'high';
  apy?: number;
}

export const mockBundles: Bundle[] = [
  {
    id: 'tech-giants',
    name: 'Tech Giants',
    description: 'Top technology companies driving innovation and digital transformation',
    category: 'tech',
    totalValue: 12500000,
    change24h: 2.4,
    volume24h: 850000,
    tokens: [
      { symbol: 'AAPLX', name: 'Apple xStock', allocation: 25, logo: 'https://coin-images.coingecko.com/coins/images/55586/large/Ticker_AAPL__Company_Name_Apple_Inc.__size_200x200_2x.png?1746807196' },
      { symbol: 'MSFTX', name: 'Microsoft xStock', allocation: 25, logo: 'https://coin-images.coingecko.com/coins/images/55630/large/Ticker_MSFT__Company_Name_Microsoft_Inc.__size_200x200_2x.png?1746862508' },
      { symbol: 'GOOGLX', name: 'Alphabet xStock', allocation: 20, logo: 'https://coin-images.coingecko.com/coins/images/55610/large/Ticker_GOOG__Company_Name_Alphabet_Inc.__size_200x200_2x.png?1746858803' },
      { symbol: 'NVDAX', name: 'NVIDIA xStock', allocation: 15, logo: 'https://coin-images.coingecko.com/coins/images/55633/large/Ticker_NVDA__Company_Name_NVIDIA_Corp__size_200x200_2x.png?1746862704' },
      { symbol: 'TSLAX', name: 'Tesla xStock', allocation: 15, logo: 'https://coin-images.coingecko.com/coins/images/55638/large/Ticker_TSLA__Company_Name_Tesla_Inc.__size_200x200_2x.png?1746863299' }
    ],
    creator: 'XFusion Team',
    createdAt: '2025-01-15',
    subscribers: 1247,
    logo: '🚀',
    color: '#3b82f6',
    risk: 'medium',
    apy: 8.5
  },
  {
    id: 'defi-kings',
    name: 'DeFi Kings',
    description: 'Leading decentralized finance protocols revolutionizing traditional banking',
    category: 'defi',
    totalValue: 8900000,
    change24h: -1.2,
    volume24h: 650000,
    tokens: [
      { symbol: 'UNI', name: 'Uniswap', allocation: 30, logo: 'https://coin-images.coingecko.com/coins/images/12504/large/uniswap-logo.png?1720676669' },
      { symbol: 'AAVE', name: 'Aave', allocation: 25, logo: 'https://coin-images.coingecko.com/coins/images/12645/large/aave-token-round.png?1720472354' },
      { symbol: 'JUP', name: 'Jupiter', allocation: 20, logo: 'https://coin-images.coingecko.com/coins/images/34188/large/jup.png?1704266489' },
      { symbol: 'CRV', name: 'Curve DAO', allocation: 15, logo: 'https://coin-images.coingecko.com/coins/images/12124/large/Curve.png?1696511967' },
      { symbol: 'JTO', name: 'Jito', allocation: 10, logo: 'https://coin-images.coingecko.com/coins/images/33228/large/jto.png?1701137022' }
    ],
    creator: 'DeFi Maxi',
    createdAt: '2025-01-12',
    subscribers: 892,
    logo: '⚡',
    color: '#10b981',
    risk: 'high',
    apy: 12.3
  },
  {
    id: 'blue-chip-crypto',
    name: 'Blue Chip Crypto',
    description: 'Established cryptocurrencies with strong fundamentals and market presence',
    category: 'blue-chip',
    totalValue: 25600000,
    change24h: 0.8,
    volume24h: 1200000,
    tokens: [
      { symbol: 'BTC', name: 'Bitcoin', allocation: 40, logo: 'https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png?1696501400' },
      { symbol: 'ETH', name: 'Ethereum', allocation: 30, logo: 'https://coin-images.coingecko.com/coins/images/279/large/ethereum.png?1696501628' },
      { symbol: 'SOL', name: 'Solana', allocation: 15, logo: 'https://coin-images.coingecko.com/coins/images/4128/large/solana.png?1718769756' },
      { symbol: 'XRP', name: 'XRP', allocation: 10, logo: 'https://coin-images.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png?1696501442' },
      { symbol: 'BNB', name: 'BNB', allocation: 5, logo: 'https://coin-images.coingecko.com/coins/images/825/large/bnb-icon2_2x.png?1696501970' }
    ],
    creator: 'Crypto OG',
    createdAt: '2025-01-10',
    subscribers: 2156,
    logo: '💎',
    color: '#f59e0b',
    risk: 'low',
    apy: 5.2
  },
  {
    id: 'meme-mania',
    name: 'Meme Mania',
    description: 'Popular meme coins with strong community backing and viral potential',
    category: 'meme',
    totalValue: 3200000,
    change24h: 15.7,
    volume24h: 890000,
    tokens: [
      { symbol: 'DOGE', name: 'Dogecoin', allocation: 35, logo: 'https://coin-images.coingecko.com/coins/images/5/large/dogecoin.png?1696501409' },
      { symbol: 'SHIB', name: 'Shiba Inu', allocation: 25, logo: 'https://coin-images.coingecko.com/coins/images/11939/large/shiba.png?1696511800' },
      { symbol: 'PEPE', name: 'Pepe', allocation: 20, logo: 'https://coin-images.coingecko.com/coins/images/29850/large/pepe-token.jpeg?1696528776' },
      { symbol: 'BONK', name: 'Bonk', allocation: 15, logo: 'https://coin-images.coingecko.com/coins/images/28600/large/bonk.jpg?1696527587' },
      { symbol: 'PENGU', name: 'Pudgy Penguins', allocation: 5, logo: 'https://coin-images.coingecko.com/coins/images/52622/large/PUDGY_PENGUINS_PENGU_PFP.png?1733809110' }
    ],
    creator: 'Meme Lord',
    createdAt: '2025-01-18',
    subscribers: 567,
    logo: '🐸',
    color: '#ef4444',
    risk: 'high',
    apy: 18.9
  },
  {
    id: 'balanced-growth',
    name: 'Balanced Growth',
    description: 'Diversified portfolio balancing stability with growth potential across sectors',
    category: 'balanced',
    totalValue: 18700000,
    change24h: 1.9,
    volume24h: 950000,
    tokens: [
      { symbol: 'BTC', name: 'Bitcoin', allocation: 20, logo: 'https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png?1696501400' },
      { symbol: 'ETH', name: 'Ethereum', allocation: 20, logo: 'https://coin-images.coingecko.com/coins/images/279/large/ethereum.png?1696501628' },
      { symbol: 'AAPLX', name: 'Apple xStock', allocation: 15, logo: 'https://coin-images.coingecko.com/coins/images/55586/large/Ticker_AAPL__Company_Name_Apple_Inc.__size_200x200_2x.png?1746807196' },
      { symbol: 'XAUT', name: 'Tether Gold', allocation: 15, logo: 'https://coin-images.coingecko.com/coins/images/10481/large/Tether_Gold.png?1696510471' },
      { symbol: 'UNI', name: 'Uniswap', allocation: 15, logo: 'https://coin-images.coingecko.com/coins/images/12504/large/uniswap-logo.png?1720676669' },
      { symbol: 'LINK', name: 'Chainlink', allocation: 15, logo: 'https://coin-images.coingecko.com/coins/images/877/large/chainlink-new-logo.png?1696502009' }
    ],
    creator: 'Portfolio Pro',
    createdAt: '2025-01-08',
    subscribers: 1834,
    logo: '⚖️',
    color: '#8b5cf6',
    risk: 'medium',
    apy: 7.1
  },
  {
    id: 'ai-revolution',
    name: 'AI Revolution',
    description: 'Companies and tokens at the forefront of artificial intelligence innovation',
    category: 'growth',
    totalValue: 9800000,
    change24h: 4.2,
    volume24h: 720000,
    tokens: [
      { symbol: 'NVDAX', name: 'NVIDIA xStock', allocation: 30, logo: 'https://coin-images.coingecko.com/coins/images/55633/large/Ticker_NVDA__Company_Name_NVIDIA_Corp__size_200x200_2x.png?1746862704' },
      { symbol: 'MSFTX', name: 'Microsoft xStock', allocation: 25, logo: 'https://coin-images.coingecko.com/coins/images/55630/large/Ticker_MSFT__Company_Name_Microsoft_Inc.__size_200x200_2x.png?1746862508' },
      { symbol: 'FET', name: 'Artificial Superintelligence Alliance', allocation: 20, logo: 'https://coin-images.coingecko.com/coins/images/5681/large/ASI.png?1719827289' },
      { symbol: 'GOOGLX', name: 'Alphabet xStock', allocation: 15, logo: 'https://coin-images.coingecko.com/coins/images/55610/large/Ticker_GOOG__Company_Name_Alphabet_Inc.__size_200x200_2x.png?1746858803' },
      { symbol: 'PLTRX', name: 'Palantir xStock', allocation: 10, logo: 'https://coin-images.coingecko.com/coins/images/55654/large/Ticker_PLTR__Company_Name_SP500__size_200x200_2x.png?1746864347' }
    ],
    creator: 'AI Enthusiast',
    createdAt: '2025-01-16',
    subscribers: 743,
    logo: '🤖',
    color: '#06b6d4',
    risk: 'medium',
    apy: 9.8
  },
  {
    id: 'infrastructure-play',
    name: 'Infrastructure Play',
    description: 'Blockchain infrastructure tokens powering the decentralized web',
    category: 'tech',
    totalValue: 6400000,
    change24h: -0.5,
    volume24h: 480000,
    tokens: [
      { symbol: 'LINK', name: 'Chainlink', allocation: 25, logo: 'https://coin-images.coingecko.com/coins/images/877/large/chainlink-new-logo.png?1696502009' },
      { symbol: 'GRT', name: 'The Graph', allocation: 20, logo: 'https://coin-images.coingecko.com/coins/images/13397/large/Graph_Token.png?1696513159' },
      { symbol: 'ENS', name: 'Ethereum Name Service', allocation: 20, logo: 'https://coin-images.coingecko.com/coins/images/19785/large/ENS.jpg?1727872989' },
      { symbol: 'PYTH', name: 'Pyth Network', allocation: 15, logo: 'https://coin-images.coingecko.com/coins/images/31924/large/pyth.png?1701245725' },
      { symbol: 'W', name: 'Wormhole', allocation: 12, logo: 'https://coin-images.coingecko.com/coins/images/35087/large/womrhole_logo_full_color_rgb_2000px_72ppi_fb766ac85a.png?1708688954' },
      { symbol: 'ZRO', name: 'LayerZero', allocation: 8, logo: 'https://coin-images.coingecko.com/coins/images/28206/large/ftxG9_TJ_400x400.jpeg?1696527208' }
    ],
    creator: 'Infrastructure Dev',
    createdAt: '2025-01-14',
    subscribers: 456,
    logo: '🏗️',
    color: '#6366f1',
    risk: 'medium',
    apy: 6.7
  },
  {
    id: 'financial-titans',
    name: 'Financial Titans',
    description: 'Major financial institutions and fintech companies shaping the future of finance',
    category: 'blue-chip',
    totalValue: 15200000,
    change24h: 1.3,
    volume24h: 1100000,
    tokens: [
      { symbol: 'JPMX', name: 'JPMorgan Chase xStock', allocation: 25, logo: 'https://coin-images.coingecko.com/coins/images/55621/large/Ticker_JPM__Company_Name_JPMorganChase__size_200x200_2x.png?1746861978' },
      { symbol: 'VX', name: 'Visa xStock', allocation: 20, logo: 'https://coin-images.coingecko.com/coins/images/55642/large/Ticker_V__Company_Name_Visa__size_200x200_2x.png?1746863879' },
      { symbol: 'MAX', name: 'Mastercard xStock', allocation: 20, logo: 'https://coin-images.coingecko.com/coins/images/55624/large/Ticker_MA__Company_Name_Mastercard__size_200x200_2x.png?1746862053' },
      { symbol: 'GSX', name: 'Goldman Sachs xStock', allocation: 15, logo: 'https://coin-images.coingecko.com/coins/images/55611/large/Ticker_GS__Company_Name_Goldman_Sachs__size_200x200_2x.png?1746858834' },
      { symbol: 'COINX', name: 'Coinbase xStock', allocation: 12, logo: 'https://coin-images.coingecko.com/coins/images/55602/large/Ticker_COIN__Company_Name_Coinbase__size_200x200_2x.png?1746858187' },
      { symbol: 'HOODX', name: 'Robinhood xStock', allocation: 8, logo: 'https://coin-images.coingecko.com/coins/images/55613/large/Ticker_HOOD__Company_Name_Robinhood__size_200x200_2x.png?1746858880' }
    ],
    creator: 'Finance Expert',
    createdAt: '2025-01-11',
    subscribers: 1023,
    logo: '🏦',
    color: '#059669',
    risk: 'low',
    apy: 4.8
  }
];

// Helper functions
export const getBundlesByCategory = (category: string) => {
  if (category === 'all') return mockBundles;
  return mockBundles.filter(bundle => bundle.category === category);
};

export const getBundleById = (id: string) => {
  return mockBundles.find(bundle => bundle.id === id);
};

export const getBundleCategories = () => {
  const categories = [...new Set(mockBundles.map(bundle => bundle.category))];
  return categories;
}; 