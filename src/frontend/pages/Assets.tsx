import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Bitcoin, Coins, Building, DollarSign, Smile, Grid3X3, Search, Loader2 } from 'lucide-react';
import { backendService } from '../lib/backend-service';
import { TradeModal } from '../components/trading/TradeModal';

interface Asset {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number;
  logo: string;
  category: string;
  description?: string;
}

export default function Assets() {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tradeModal, setTradeModal] = useState<{
    isOpen: boolean;
    assetId: string;
    assetName: string;
    mode: 'buy' | 'sell';
  }>({ isOpen: false, assetId: '', assetName: '', mode: 'buy' });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const backendAssets = await backendService.listAssets();
        
        const transformedAssets: Asset[] = backendAssets.map((asset: any) => ({
          id: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          price: 100,
          change24h: Math.random() * 10 - 5,
          marketCap: 1000000,
          logo: asset.metadata?.logo_url || '',
          category: asset.metadata?.category?.Cryptocurrency ? 'Cryptocurrency' : 'Stablecoin',
          description: asset.metadata?.description || undefined
        }));

        setAssets(transformedAssets);
        setCategories([{ id: 'crypto', name: 'Cryptocurrency' }, { id: 'stable', name: 'Stablecoin' }]);
      } catch (err) {
        setError('Failed to load assets. Please try again.');
        console.error('Error loading assets:', err);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const getCategoryName = (categoryId: string, categories: any[]): string => {
    const category = categories.find((c: any) => c.id === categoryId);
    return category?.name || 'Other';
  };

  const getCategoryIcon = (categoryName: string) => {
    const iconMap: Record<string, React.ComponentType> = {
      'Classics': Bitcoin,
      'DeFi': DollarSign,
      'RWA / Stocks': Building,
      'Infrastructure': Coins,
      'Meme': Smile
    };
    return iconMap[categoryName] || Grid3X3;
  };

  const getFilteredAssets = () => {
    let filtered = assets;
    
    if (activeCategory !== 'all') {
      const selectedCategory = categories.find(c => c.id === activeCategory);
      if (selectedCategory) {
        filtered = filtered.filter(asset => asset.category === selectedCategory.name);
    }
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(asset => 
        asset.name.toLowerCase().includes(query) ||
        asset.symbol.toLowerCase().includes(query) ||
        asset.category.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };

  const filteredAssets = getFilteredAssets();

  const categoryOptions = [
    { id: 'all', label: 'All Assets', icon: Grid3X3, description: 'All available tokens' },
    ...categories.map(category => ({
      id: category.id,
      label: category.name,
      icon: getCategoryIcon(category.name),
      description: category.description
    }))
  ];

  return (
    <div className="px-6 py-12 max-w-7xl mx-auto">
        <motion.div
        className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        >
        <h1 className="heading-large mb-4">Chain-Key Assets</h1>
        <p className="text-unique max-w-5xl">
          Explore our comprehensive collection of Chain-Key tokens, including major cryptocurrencies, 
          DeFi protocols, real-world assets, and infrastructure tokens. All assets are backed by native 
          blockchain tokens with full custody and control.
          </p>
      </motion.div>
          
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-tertiary" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-elevated border border-primary text-primary placeholder-tertiary focus:outline-none focus:border-accent transition-colors rounded"
            />
          </div>
        </motion.div>

        <motion.div
        className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        >
        <div className="flex flex-wrap gap-4">
          {categoryOptions.map((category) => {
              const IconComponent = category.icon;
              const isActive = activeCategory === category.id;
              
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                className={`flex items-center gap-3 px-6 py-3 rounded transition-all ${
                    isActive
                    ? 'bg-accent text-background border border-accent'
                    : 'bg-elevated border border-primary text-primary hover:border-accent hover:bg-accent/10'
                  }`}
                >
                <IconComponent className="w-5 h-5" />
                  <div className="text-left">
                  <div className="font-medium">{category.label}</div>
                  <div className={`text-xs ${isActive ? 'text-background/70' : 'text-secondary'}`}>
                    {category.description}
                  </div>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

          <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <div className="flex items-center justify-between">
          <div className="text-secondary">
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading assets...
              </div>
            ) : (
              `${filteredAssets.length} asset${filteredAssets.length !== 1 ? 's' : ''} found`
            )}
          </div>
          
          {searchQuery && !loading && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-accent hover:text-accent/80 text-sm"
            >
              Clear search
            </button>
          )}
        </div>
      </motion.div>

        {error && (
          <motion.div
          className="text-center py-20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="w-24 h-24 bg-elevated border border-primary flex items-center justify-center mx-auto mb-6">
            <span className="text-tertiary text-4xl">❌</span>
          </div>
          <h3 className="heading-medium mb-4">Error Loading Assets</h3>
          <p className="text-secondary mb-8">{error}</p>
              <button
            onClick={() => window.location.reload()}
            className="btn-unique px-6 py-3"
          >
            RETRY
          </button>
        </motion.div>
      )}

      {loading && !error && (
        <motion.div 
          className="text-center py-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="w-24 h-24 bg-elevated border border-primary flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          <h3 className="heading-medium mb-4">Loading Assets...</h3>
          <p className="text-secondary">Fetching the latest Chain-Key tokens...</p>
          </motion.div>
        )}

        {!loading && !error && (
        <>
          {filteredAssets.length > 0 ? (
          <motion.div
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {filteredAssets.map((asset, index) => (
                    <motion.div
                      key={asset.id}
                  className="card-unique p-6 hover:border-accent transition-all cursor-pointer"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                    >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-unique flex items-center justify-center text-background text-lg font-bold">
                            {asset.logo ? (
                              <img 
                                src={asset.logo} 
                          alt={asset.symbol}
                          className="w-full h-full object-cover rounded-full"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                                                     const parent = target.parentElement;
                                   if (parent) {
                              parent.innerHTML = `<span class="text-background text-lg font-bold">${asset.symbol.slice(0, 2)}</span>`;
                                   }
                                }}
                              />
                            ) : (
                        <span>{asset.symbol.slice(0, 2)}</span>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-primary font-bold text-lg">{asset.symbol}</h3>
                        <span className="text-xs bg-elevated border border-primary px-2 py-1 rounded text-secondary">
                          {asset.category}
                                 </span>
                              </div>
                      <p className="text-secondary text-sm truncate">{asset.name}</p>
                          </div>
                        </div>
                        
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-secondary text-sm">Price</span>
                      <span className="text-primary font-bold text-lg">
                        ${asset.price.toLocaleString(undefined, { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: asset.price < 1 ? 6 : 2 
                        })}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-secondary text-sm">24h Change</span>
                      <div className={`flex items-center gap-1 ${
                        asset.change24h >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                        {asset.change24h >= 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        <span className="font-medium">
                          {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-secondary text-sm">Market Cap</span>
                      <span className="text-primary text-sm">
                        ${(asset.marketCap / 1000000).toFixed(2)}M
                      </span>
                        </div>
                      </div>

                  {asset.description && (
                    <div className="mt-4 pt-4 border-t border-primary">
                      <p className="text-secondary text-xs line-clamp-2">
                        {asset.description}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTradeModal({
                          isOpen: true,
                          assetId: asset.id,
                          assetName: asset.symbol,
                          mode: 'buy'
                        });
                      }}
                      className="flex-1 py-2 bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors text-sm font-medium"
                    >
                      BUY
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTradeModal({
                          isOpen: true,
                          assetId: asset.id,
                          assetName: asset.symbol,
                          mode: 'sell'
                        });
                      }}
                      className="flex-1 py-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium"
                    >
                      SELL
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
          <motion.div
              className="text-center py-20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
          >
              <div className="w-24 h-24 bg-elevated border border-primary flex items-center justify-center mx-auto mb-6">
                <Search className="w-8 h-8 text-tertiary" />
              </div>
              <h3 className="heading-medium mb-4">No Assets Found</h3>
              <p className="text-secondary max-w-md mx-auto">
                {searchQuery 
                  ? `No assets found matching "${searchQuery}". Try adjusting your search terms.`
                  : `No assets found in the selected category.`
                }
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-6 btn-unique px-6 py-3"
                >
                  CLEAR SEARCH
                </button>
              )}
          </motion.div>
        )}
        </>
      )}
    </div>
  );
} 