import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Bitcoin, Coins, Building, DollarSign, Smile, Grid3X3, Search, Loader2 } from 'lucide-react';
import { backendService, type Category } from '../lib/backend';

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load assets and categories from backend
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [backendAssets, backendCategories] = await Promise.all([
          backendService.getActiveAssets(),
          backendService.getActiveCategories()
        ]);
        
        // Transform backend assets to frontend format
        const transformedAssets: Asset[] = backendAssets.map(asset => ({
          id: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          price: asset.current_price,
          change24h: asset.price_change_24h,
          marketCap: asset.current_price * 1000000, // Rough estimate
          logo: asset.logo_url || '',
          category: getCategoryName(asset.category_id, backendCategories),
          description: asset.description || undefined
        }));
        
        setAssets(transformedAssets);
        setCategories(backendCategories);
      } catch (err) {
        setError('Failed to load assets. Please try again.');
        console.error('Error loading assets:', err);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  // Helper function to get category name
  const getCategoryName = (categoryId: string, categories: Category[]): string => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Other';
  };

  // Get category icon
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

  // Filter assets based on search and category
  const getFilteredAssets = () => {
    let filtered = assets;
    
    // Filter by category
    if (activeCategory !== 'all') {
      const selectedCategory = categories.find(c => c.id === activeCategory);
      if (selectedCategory) {
        filtered = filtered.filter(asset => asset.category === selectedCategory.name);
    }
    }
    
    // Filter by search query
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

  // Asset categories with icons - now using backend categories
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
        {/* Header */}
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
          
      {/* Search Bar */}
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

      {/* Category Filters */}
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

      {/* Assets Count and Status */}
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

        {/* Error State */}
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

      {/* Loading State */}
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

        {/* Assets Grid */}
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
                      {/* Asset Header */}
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
                        
                  {/* Price and Change */}
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

                      {/* Description */}
                  {asset.description && (
                    <div className="mt-4 pt-4 border-t border-primary">
                      <p className="text-secondary text-xs line-clamp-2">
                        {asset.description}
                </p>
              </div>
            )}
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