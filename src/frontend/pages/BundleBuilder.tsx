/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Minus, Eye, Shuffle, RotateCcw, Search, Bitcoin, Coins, Building, DollarSign, Smile, Grid3X3 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { backendService, type Category, type CreateBundlePayload } from '../lib/backend';

// Transform backend data to match original Asset interface
interface Asset {
  id: string;
  symbol: string;
  name: string;
  color: string;
  price: number;
  marketCap: number;
  category_id: string;
  logo?: string;
}

interface BundleAllocation {
  asset: Asset;
  percentage: number;
}

export default function BundleBuilder() {
  const { isAuthenticated, login, loading } = useAuth();
  const [bundleName, setBundleName] = useState('');
  const [bundleSymbol, setBundleSymbol] = useState('');
  const [bundleDescription, setBundleDescription] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<BundleAllocation[]>([]);
  const [totalPercentage, setTotalPercentage] = useState(0);
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const navigate = useNavigate();

  // Load assets and categories from backend
  useEffect(() => {
    const loadData = async () => {
      try {
        setAssetsLoading(true);
        setError(null);
        
        const [backendAssets, backendCategories] = await Promise.all([
          backendService.getActiveAssets(),
          backendService.getActiveCategories()
        ]);
        
        // Transform backend assets to match original Asset interface
        const assets: Asset[] = backendAssets.map(asset => ({
          id: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          color: getCategoryColor(asset.category_id, backendCategories),
          price: asset.current_price,
          marketCap: asset.current_price * 1000000, // Rough estimate
          category_id: asset.category_id,
          logo: asset.logo_url || undefined,
        }));
        
        setAvailableAssets(assets);
        setCategories(backendCategories);
      } catch (error) {
        console.error('Failed to load data:', error);
        setError('Failed to load assets and categories. Please try again.');
      } finally {
        setAssetsLoading(false);
      }
    };
    
    void loadData();
  }, []);

  // Helper function to get category color
  const getCategoryColor = (categoryId: string, categories: Category[]): string => {
    const category = categories.find(c => c.id === categoryId);
    return category?.color || '#6366f1';
  };

  // Calculate total percentage whenever allocations change
  useEffect(() => {
    const total = selectedAssets.reduce((sum, allocation) => sum + allocation.percentage, 0);
    setTotalPercentage(total);
  }, [selectedAssets]);

  // Auth check
  if (loading) {
    return (
      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-elevated border border-primary flex items-center justify-center mx-auto mb-6">
              <span className="text-tertiary text-4xl">⏳</span>
            </div>
            <h3 className="heading-medium mb-4">Loading...</h3>
            <p className="text-secondary">Checking authentication status...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-elevated border border-primary flex items-center justify-center mx-auto mb-6">
              <span className="text-tertiary text-4xl">🔐</span>
            </div>
            <h3 className="heading-medium mb-4">Authentication Required</h3>
            <p className="text-secondary mb-8 max-w-md mx-auto">
              You need to be logged in to create bundles. Please authenticate with Internet Identity to continue.
            </p>
            <button 
              onClick={() => void login()}
              className="btn-unique px-8 py-3"
            >
              LOGIN WITH INTERNET IDENTITY
            </button>
          </div>
        </div>
      </div>
    );
  }

  const addAsset = (asset: Asset) => {
    if (selectedAssets.find(a => a.asset.id === asset.id)) return;
    
    const remainingPercentage = Math.max(0, 100 - totalPercentage);
    const suggestedPercentage = Math.min(remainingPercentage, 20); // Default to 20% or remaining
    
    setSelectedAssets([...selectedAssets, { asset, percentage: suggestedPercentage }]);
  };

  const removeAsset = (assetId: string) => {
    setSelectedAssets(selectedAssets.filter(a => a.asset.id !== assetId));
  };

  const updatePercentage = (assetId: string, percentage: number) => {
    setSelectedAssets(selectedAssets.map(allocation => 
      allocation.asset.id === assetId 
        ? { ...allocation, percentage: Math.max(0, Math.min(100, percentage)) }
        : allocation
    ));
  };

  const distributeEvenly = () => {
    if (selectedAssets.length === 0) return;
    const evenPercentage = Math.floor(100 / selectedAssets.length);
    const remainder = 100 - (evenPercentage * selectedAssets.length);
    
    setSelectedAssets(selectedAssets.map((allocation, index) => ({
      ...allocation,
      percentage: index === 0 ? evenPercentage + remainder : evenPercentage
    })));
  };

  const resetAllocations = () => {
    setSelectedAssets([]);
    setBundleName('');
    setBundleSymbol('');
    setBundleDescription('');
    setError(null);
    setSuccess(null);
  };

  const handleCreateBundle = async () => {
    try {
      setCreating(true);
      setError(null);
      setSuccess(null);

      // Prepare the bundle payload
      const payload: CreateBundlePayload = {
        name: bundleName,
        description: bundleDescription,
        category: 'Classics', // Default category
        assets: selectedAssets.map(allocation => ({
          asset_id: allocation.asset.id,
          allocation_percentage: allocation.percentage
        })),
        tags: [bundleSymbol],
        color: '#6366f1'
      };

      // Debug: Log the payload to see what we're sending
      console.log('Bundle creation payload:', payload);
      console.log('Selected assets:', selectedAssets.map(a => ({ id: a.asset.id, symbol: a.asset.symbol })));

      const bundle = await backendService.createBundle(payload);
      
      setSuccess(`Bundle "${bundle.name}" created successfully!`);
      
      // Reset form after successful creation
      setTimeout(() => {
        resetAllocations();
        navigate(`/bundle/${bundle.id}`);
      }, 2000); 
        
      } catch (error) {
      console.error('Failed to create bundle:', error);
      setError(error instanceof Error ? error.message : 'Failed to create bundle. Please try again.');
    } finally {
      setCreating(false);
    }
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

  // Get available categories from the loaded assets
  const categoryOptions = [
    { id: 'all', name: 'All Assets', icon: Grid3X3 },
    ...categories.map(category => ({
      id: category.name,
      name: category.name,
      icon: getCategoryIcon(category.name)
    }))
  ];
  
  // Debug: Let's see what categories and assets we have
  console.log('Categories:', categories.map(c => ({ id: c.id, name: c.name })));
  console.log('Assets with categories:', availableAssets.slice(0, 3).map(a => ({ 
    symbol: a.symbol, 
    category_id: a.category_id,
    category_name: categories.find(c => c.id === a.category_id)?.name 
  })));
  console.log('Selected category:', selectedCategory);
  
  // Filter assets based on search query and category, then exclude already selected ones
  const getFilteredAssets = () => {
    let filtered = availableAssets;
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(asset => {
        // Find the category for this asset
        const assetCategory = categories.find(c => c.id === asset.category_id);
        return assetCategory?.name === selectedCategory;
      });
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(asset => 
        asset.name.toLowerCase().includes(query) ||
        asset.symbol.toLowerCase().includes(query)
      );
    }
    
    // Exclude already selected assets
    return filtered.filter(asset => !selectedAssets.find(a => a.asset.id === asset.id));
  };

  const availableAssetsToAdd = getFilteredAssets();

  const isValid = totalPercentage === 100 && bundleName && bundleSymbol && selectedAssets.length >= 2;

  return (
    <div className="px-6 py-8">
      {/* Page Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <h1 className="heading-large mb-4">Build Your Index</h1>
        <p className="text-body max-w-3xl">
          Create a custom token bundle with your preferred asset allocation. 
          Select tokens, set percentages, and launch your own tradeable index.
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="card-unique p-4 border-red-400/20 bg-red-400/5">
            <div className="text-red-400">{error}</div>
          </div>
        </div>
      )}

      {success && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="card-unique p-4 border-green-400/20 bg-green-400/5">
            <div className="text-green-400">{success}</div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="asymmetric-grid gap-8">
          {/* Left Column - Builder Interface */}
          <div className="space-y-8">
            {/* Bundle Configuration */}
            <div className="card-unique p-6">
              <h2 className="heading-medium mb-6">Bundle Configuration</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-secondary text-sm mb-2">Bundle Name</label>
                  <input
                    type="text"
                    value={bundleName}
                    onChange={(e) => { setBundleName(e.target.value); }}
                    placeholder="e.g., My DeFi Portfolio"
                    className="w-full bg-elevated border border-primary p-3 text-primary rounded focus:border-accent focus:outline-none"
                    disabled={creating}
                  />
                </div>
                
                <div>
                  <label className="block text-secondary text-sm mb-2">Symbol</label>
                  <input
                    type="text"
                    value={bundleSymbol}
                    onChange={(e) => { setBundleSymbol(e.target.value.toUpperCase()); }}
                    placeholder="e.g., MYDEFI"
                    maxLength={8}
                    className="w-full bg-elevated border border-primary p-3 text-primary text-data rounded focus:border-accent focus:outline-none"
                    disabled={creating}
                  />
                </div>
                
                <div>
                  <label className="block text-secondary text-sm mb-2">Description</label>
                  <textarea
                    value={bundleDescription}
                    onChange={(e) => { setBundleDescription(e.target.value); }}
                    placeholder="Describe your bundle strategy..."
                    rows={3}
                    className="w-full bg-elevated border border-primary p-3 text-primary rounded focus:border-accent focus:outline-none resize-none"
                    disabled={creating}
                  />
                </div>
              </div>
            </div>

            {/* Asset Selection */}
            <div className="card-unique p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="heading-medium">Select Assets</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={distributeEvenly}
                    disabled={selectedAssets.length === 0 || creating}
                    className="btn-outline-unique p-2 disabled:opacity-50"
                    title="Distribute Evenly"
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={resetAllocations}
                    disabled={selectedAssets.length === 0 || creating}
                    className="btn-outline-unique p-2 disabled:opacity-50"
                    title="Reset All"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Asset Search and Filters */}
              <div className="mb-4 space-y-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-tertiary" />
                  <input
                    type="text"
                    placeholder="Search assets..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); }}
                    className="w-full pl-10 pr-4 py-2 bg-elevated border border-primary text-primary placeholder-tertiary focus:outline-none focus:border-accent transition-colors"
                    disabled={creating}
                  />
                </div>
                
                {/* Category Filters */}
                <div className="flex flex-wrap gap-2">
                  {categoryOptions.map((category) => {
                    const IconComponent = category.icon;
                    const isActive = selectedCategory === category.id;
                    
                    return (
                      <button
                        key={category.id}
                        onClick={() => { setSelectedCategory(category.id); }}
                        className={`flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors uppercase whitespace-nowrap ${
                          isActive
                            ? 'bg-accent text-background'
                            : 'bg-elevated border border-primary text-tertiary hover:text-primary hover:border-accent'
                        }`}
                        disabled={creating}
                      >
                        <IconComponent className="w-4 h-4" />
                        {category.name === 'All Assets' ? 'ALL' : category.name.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
                
                {/* Results Count */}
                <div className="text-xs text-tertiary">
                  {assetsLoading ? 'Loading...' : `${availableAssetsToAdd.length} assets available`}
                </div>
              </div>

              {/* Available Assets Grid - Scrollable */}
              <div className="max-h-96 overflow-y-auto mb-6">
                {assetsLoading ? (
                  <div className="text-center py-8 text-tertiary">
                    Loading assets...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {availableAssetsToAdd.map((asset) => (
                      <motion.button
                        key={asset.id}
                        onClick={() => { addAsset(asset); }}
                        className="card-unique p-4 hover:border-accent transition-all"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={creating}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded flex items-center justify-center overflow-hidden bg-background">
                            {asset.logo ? (
                              <img
                                src={asset.logo}
                                alt={asset.symbol}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `<div class="w-full h-full flex items-center justify-center" style="background-color: ${asset.color}"><span class="text-white font-bold text-xs">${asset.symbol.slice(0, 2)}</span></div>`;
                                  }
                                }}
                              />
                            ) : (
                              <div 
                                className="w-full h-full flex items-center justify-center"
                                style={{ backgroundColor: asset.color }}
                              >
                                <span className="text-white font-bold text-xs">
                                  {asset.symbol.slice(0, 2)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="text-left">
                            <div className="text-primary font-medium text-sm">{asset.symbol}</div>
                            <div className="text-tertiary text-xs">{asset.name}</div>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
                
                {!assetsLoading && availableAssetsToAdd.length === 0 && (
                  <div className="text-center py-8 text-tertiary">
                    {searchQuery ? 'No assets found matching your search' : 'No available assets'}
                  </div>
                )}
              </div>

              {/* Selected Assets with Allocation */}
              {selectedAssets.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="heading-small">Asset Allocation</h3>
                    <div className={`text-sm font-mono ${
                      totalPercentage === 100 ? 'text-green-400' : 
                      totalPercentage > 100 ? 'text-red-400' : 'text-tertiary'
                    }`}>
                      {totalPercentage.toFixed(1)}%
                    </div>
                  </div>

                  {selectedAssets.map((allocation) => (
                    <div key={allocation.asset.id} className="bg-elevated border border-primary p-4 rounded">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded flex items-center justify-center overflow-hidden bg-background">
                            {allocation.asset.logo ? (
                              <img
                                src={allocation.asset.logo}
                                alt={allocation.asset.symbol}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `<div class="w-full h-full flex items-center justify-center" style="background-color: ${allocation.asset.color}"><span class="text-white font-bold text-xs">${allocation.asset.symbol.slice(0, 2)}</span></div>`;
                                  }
                                }}
                              />
                            ) : (
                              <div 
                                className="w-full h-full flex items-center justify-center"
                                style={{ backgroundColor: allocation.asset.color }}
                              >
                                <span className="text-white font-bold text-xs">
                                  {allocation.asset.symbol.slice(0, 2)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="text-primary font-medium">{allocation.asset.symbol}</span>
                            <span className="text-tertiary text-sm ml-2">{allocation.asset.name}</span>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => { removeAsset(allocation.asset.id); }}
                          className="text-tertiary hover:text-red-400 transition-colors"
                          disabled={creating}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Percentage Slider */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-secondary text-sm">Allocation</label>
                          <input
                            type="number"
                            value={allocation.percentage}
                            onChange={(e) => { updatePercentage(allocation.asset.id, parseFloat(e.target.value) || 0); }}
                            min="0"
                            max="100"
                            step="0.1"
                            className="w-20 bg-accent border border-primary p-1 text-primary text-data text-center rounded text-sm"
                            disabled={creating}
                          />
                        </div>
                        
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="0.1"
                          value={allocation.percentage}
                          onChange={(e) => { updatePercentage(allocation.asset.id, parseFloat(e.target.value)); }}
                          className="w-full"
                          style={{
                            background: `linear-gradient(to right, ${allocation.asset.color} 0%, ${allocation.asset.color} ${allocation.percentage}%, var(--border-primary) ${allocation.percentage}%, var(--border-primary) 100%)`
                          }}
                          disabled={creating}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Preview & Actions */}
          <div className="space-y-6">
            {/* Bundle Preview */}
            <div className="card-unique p-6">
              <div className="flex items-center gap-2 mb-6">
                <Eye className="w-4 h-4 text-tertiary" />
                <h3 className="heading-medium">Preview</h3>
              </div>

              {bundleName || bundleSymbol ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-elevated border border-primary flex items-center justify-center">
                      <span className="text-primary font-bold text-sm text-data">
                        {bundleSymbol || '???'}
                      </span>
                    </div>
                    <div>
                      <h4 className="heading-medium">{bundleName || 'Unnamed Bundle'}</h4>
                      <p className="text-quaternary text-sm">Bundle Token</p>
                    </div>
                  </div>

                  {bundleDescription && (
                    <p className="text-body text-sm">{bundleDescription}</p>
                  )}

                  {/* Allocation Preview */}
                  {selectedAssets.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-secondary text-sm font-medium">Asset Allocation</div>
                      
                      {/* Allocation Bar */}
                      <div className="w-full h-2 bg-border-primary rounded overflow-hidden">
                        <div className="h-full flex">
                          {selectedAssets.map((allocation) => (
                            <div
                              key={allocation.asset.id}
                              className="h-full"
                              style={{
                                backgroundColor: allocation.asset.color,
                                width: `${allocation.percentage}%`
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Asset List */}
                      <div className="space-y-2">
                        {selectedAssets.map((allocation) => (
                          <div key={allocation.asset.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded" 
                                style={{ backgroundColor: allocation.asset.color }}
                              />
                              <span className="text-secondary font-mono">{allocation.asset.symbol}</span>
                            </div>
                            <span className="text-tertiary font-mono">{allocation.percentage.toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-tertiary">
                  <p>Configure your bundle to see preview</p>
                </div>
              )}
            </div>

            {/* Bundle Stats */}
            <div className="card-unique p-6">
              <h3 className="heading-medium mb-4">Bundle Statistics</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-secondary">Total Assets</span>
                  <span className="text-primary text-data">{selectedAssets.length}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-secondary">Allocation</span>
                  <span className={`text-data font-semibold ${
                    totalPercentage === 100 ? 'text-green-400' : 
                    totalPercentage > 100 ? 'text-red-400' : 'text-tertiary'
                  }`}>
                    {totalPercentage.toFixed(1)}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-secondary">Estimated Value</span>
                  <span className="text-primary text-data">
                    ${selectedAssets.reduce((sum, allocation) => 
                      sum + (allocation.asset.price * allocation.percentage / 100), 0
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button 
                disabled={!isValid || creating}
                onClick={() => void handleCreateBundle()}
                className={`btn-unique w-full py-3 ${
                  !isValid || creating ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {creating ? 'CREATING...' : 'CREATE BUNDLE'}
              </button>
            </div>

            {/* Validation Messages */}
            {!isValid && (
              <div className="card-unique p-4 border-red-400/20 bg-red-400/5">
                <div className="text-red-400 text-sm space-y-1">
                  {!bundleName && <div>• Bundle name is required</div>}
                  {!bundleSymbol && <div>• Bundle symbol is required</div>}
                  {selectedAssets.length < 2 && <div>• Select at least 2 assets</div>}
                  {totalPercentage !== 100 && <div>• Allocation must equal 100%</div>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 