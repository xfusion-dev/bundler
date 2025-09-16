import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Bitcoin, Coins, Building, DollarSign, Smile, Grid3X3, Search, Loader2 } from 'lucide-react';
import { backendService } from '../lib/backend-service';

interface Asset {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  is_active: boolean;
  standard: any;
  metadata?: {
    category?: any;
    logo_url?: string;
    website?: string;
    description?: string;
  };
  ledger_canister: string;
  oracle_ticker?: string;
  added_at: number;
}

export default function Assets() {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const backendAssets = await backendService.listAssets();
        setAssets(backendAssets);
      } catch (err) {
        setError('Failed to load assets');
        console.error('Error loading assets:', err);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const getCategoryIcon = (asset: Asset) => {
    const category = asset.metadata?.category;
    if (!category) return Coins;

    // Check for Rust enum variant properties
    if ('Cryptocurrency' in category) return Bitcoin;
    if ('Stablecoin' in category) return DollarSign;
    if ('CommodityBacked' in category) return Building;
    return Coins;
  };

  const getCategoryName = (asset: Asset): string => {
    const category = asset.metadata?.category;
    if (!category) return 'Other';

    // Check for Rust enum variant properties
    if ('Cryptocurrency' in category) return 'Cryptocurrency';
    if ('Stablecoin' in category) return 'Stablecoin';
    if ('CommodityBacked' in category) return 'Commodity';
    if ('Stocks' in category) return 'Stocks';
    return 'Other';
  };

  const getFilteredAssets = () => {
    let filtered = assets;

    if (activeCategory !== 'all') {
      filtered = filtered.filter(asset => {
        const category = getCategoryName(asset);
        return category.toLowerCase() === activeCategory.toLowerCase();
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(asset =>
        asset.name.toLowerCase().includes(query) ||
        asset.symbol.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const filteredAssets = getFilteredAssets();

  const categoryOptions = [
    { id: 'all', label: 'All Assets', icon: Grid3X3, description: 'All available tokens' },
    { id: 'cryptocurrency', label: 'Cryptocurrency', icon: Bitcoin, description: 'Digital currencies' },
    { id: 'stablecoin', label: 'Stablecoins', icon: DollarSign, description: 'Stable value tokens' },
    { id: 'commodity', label: 'Commodities', icon: Building, description: 'Physical asset backed' }
  ];

  return (
    <div className="px-6 py-12 max-w-7xl mx-auto">
      <motion.div
        className="mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="heading-large mb-4">Available Assets</h1>
        <p className="text-unique max-w-5xl">
          Explore our comprehensive collection of Chain-Key tokens and native ICP assets. Chain-Key tokens are backed by native
          blockchain assets with full custody and control through Internet Computer's chain-key technology.
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
              {filteredAssets.map((asset, index) => {
                const IconComponent = getCategoryIcon(asset);
                const categoryName = getCategoryName(asset);

                return (
                  <motion.div
                    key={asset.id}
                    className="card-unique p-6 hover:border-accent transition-all"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-unique flex items-center justify-center">
                        {asset.metadata?.logo_url ? (
                          <img
                            src={asset.metadata.logo_url}
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
                          <span className="text-background text-lg font-bold">{asset.symbol.slice(0, 2)}</span>
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-primary font-bold text-lg">{asset.symbol}</h3>
                          <span className="text-xs bg-elevated border border-primary px-2 py-1 rounded text-secondary">
                            {categoryName}
                          </span>
                        </div>
                        <p className="text-secondary text-sm truncate">{asset.name}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-secondary text-sm">Standard</span>
                        <span className="text-primary font-medium">
                          {asset.standard?.ICRC2 ? 'ICRC-2' : 'Other'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-secondary text-sm">Status</span>
                        <span className={`font-medium ${asset.is_active ? 'text-green-400' : 'text-red-400'}`}>
                          {asset.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      {asset.oracle_ticker && (
                        <div className="flex items-center justify-between">
                          <span className="text-secondary text-sm">Oracle Ticker</span>
                          <span className="text-primary text-sm font-mono">{asset.oracle_ticker}</span>
                        </div>
                      )}
                    </div>

                    {asset.metadata?.description && (
                      <div className="mt-4 pt-4 border-t border-primary">
                        <p className="text-secondary text-xs line-clamp-2">
                          {asset.metadata.description}
                        </p>
                      </div>
                    )}

                    {asset.metadata?.website && (
                      <div className="mt-4">
                        <a
                          href={asset.metadata.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent text-xs hover:text-accent/80 transition-colors"
                        >
                          Learn more →
                        </a>
                      </div>
                    )}
                  </motion.div>
                );
              })}
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
                  : `No assets found in the selected category.`}
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