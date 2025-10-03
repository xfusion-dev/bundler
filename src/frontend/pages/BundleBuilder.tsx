import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Minus, Shuffle, RotateCcw, Search, Bitcoin, Coins, Building, DollarSign, Grid3X3, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../lib/AuthContext';
import { backendService } from '../lib/backend-service';
import SEO from '../components/SEO';

interface AssetMetadata {
  category?: any;
  logo_url?: string;
  website?: string;
  description?: string;
}

interface BackendAsset {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  is_active: boolean;
  standard: any;
  metadata?: AssetMetadata;
  ledger_canister: string;
  oracle_ticker?: string;
  added_at: number;
}

interface Asset {
  id: string;
  symbol: string;
  name: string;
  color: string;
  category: string;
  logo?: string;
}

interface BundleAllocation {
  asset: Asset;
  percentage: number;
}

export default function BundleBuilder() {
  const { isAuthenticated, login, loading } = useAuth();
  const [bundleName, setBundleName] = useState('');
  const [bundleDescription, setBundleDescription] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<BundleAllocation[]>([]);
  const [totalPercentage, setTotalPercentage] = useState(0);
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
  const [backendAssets, setBackendAssets] = useState<BackendAsset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const navigate = useNavigate();

  const getCategoryName = (asset: BackendAsset): string => {
    const category = asset.metadata?.category;
    if (!category) return 'Other';

    if ('Cryptocurrency' in category) return 'Cryptocurrency';
    if ('Stablecoin' in category) return 'Stablecoin';
    if ('CommodityBacked' in category) return 'Commodity';
    if ('Stocks' in category) return 'Stocks';
    return 'Other';
  };

  const getCategoryColor = (categoryName: string): string => {
    switch(categoryName) {
      case 'Cryptocurrency': return '#f59e0b';
      case 'Stablecoin': return '#10b981';
      case 'Commodity': return '#8b5cf6';
      case 'Stocks': return '#ef4444';
      default: return '#6366f1';
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setAssetsLoading(true);
        setError(null);

        const assets = await backendService.listAssets();
        setBackendAssets(assets);

        const transformedAssets: Asset[] = assets
          .filter(asset => asset.is_active)
          .map(asset => {
            const categoryName = getCategoryName(asset);
            return {
              id: asset.id,
              symbol: asset.symbol,
              name: asset.name,
              color: getCategoryColor(categoryName),
              category: categoryName,
              logo: asset.metadata?.logo_url
            };
          });

        setAvailableAssets(transformedAssets);
      } catch (error) {
        console.error('Failed to load data:', error);
        setError('Failed to load assets. Please try again.');
      } finally {
        setAssetsLoading(false);
      }
    };

    void loadData();
  }, []);

  useEffect(() => {
    const total = selectedAssets.reduce((sum, allocation) => sum + allocation.percentage, 0);
    setTotalPercentage(total);
  }, [selectedAssets]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="px-6 py-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">⏳</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Loading...</h3>
              <p className="text-gray-400">Checking authentication status...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black">
        <div className="px-6 py-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">🔐</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Authentication Required</h3>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">
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
      </div>
    );
  }

  const addAsset = (asset: Asset) => {
    if (selectedAssets.find(a => a.asset.id === asset.id)) return;

    const remainingPercentage = Math.max(0, 100 - totalPercentage);
    const suggestedPercentage = Math.min(remainingPercentage, 20);

    setSelectedAssets([...selectedAssets, { asset, percentage: suggestedPercentage }]);
    setIsDrawerOpen(false);
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
    setBundleDescription('');
    setError(null);
    setSuccess(null);
  };

  const handleCreateBundle = async () => {
    try {
      setCreating(true);
      setError(null);
      setSuccess(null);

      const allocations = selectedAssets.map(allocation => ({
        asset_id: allocation.asset.id,
        percentage: allocation.percentage
      }));

      const bundleId = await backendService.createBundle(
        bundleName,
        bundleDescription || null,
        allocations
      );

      setSuccess(`Bundle "${bundleName}" created successfully!`);
      toast.success(`Bundle "${bundleName}" created successfully!`);

      setTimeout(() => {
        resetAllocations();
        navigate(`/bundles/${bundleId}`);
      }, 2000);

    } catch (error) {
      console.error('Failed to create bundle:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create bundle. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const getCategoryIcon = (categoryName: string) => {
    switch(categoryName) {
      case 'Cryptocurrency': return Bitcoin;
      case 'Stablecoin': return DollarSign;
      case 'Commodity': return Building;
      case 'Stocks': return Building;
      default: return Coins;
    }
  };

  const categoryOptions = [
    { id: 'all', name: 'All Assets', icon: Grid3X3 },
    { id: 'Cryptocurrency', name: 'Cryptocurrency', icon: Bitcoin },
    { id: 'Stablecoin', name: 'Stablecoins', icon: DollarSign },
    { id: 'Commodity', name: 'Commodities', icon: Building }
  ];

  const getFilteredAssets = () => {
    let filtered = availableAssets;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(asset => asset.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(asset =>
        asset.name.toLowerCase().includes(query) ||
        asset.symbol.toLowerCase().includes(query)
      );
    }

    return filtered.filter(asset => !selectedAssets.find(a => a.asset.id === asset.id));
  };

  const availableAssetsToAdd = getFilteredAssets();
  const isValid = totalPercentage === 100 && bundleName && selectedAssets.length >= 2;

  return (
    <>
      <SEO
        title="Create Token Bundle | XFusion"
        description="Design your own custom token portfolio with personalized allocations. Earn commission from every trade. Start building your diversified crypto bundle now."
        keywords="create crypto bundle, custom token portfolio, DeFi portfolio builder, crypto index creator"
      />
      <div className="min-h-screen bg-black">
        <div className="px-6 py-16">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16">
              <h1 className="text-6xl font-bold text-white mb-4">Create Bundle</h1>
              <p className="text-gray-400 text-lg">
                Design a custom token portfolio with your own allocations and earn commission from every trade
              </p>
            </div>

            {error && (
              <div className="mb-8 border border-red-400/20 bg-red-400/5 p-4">
                <div className="text-red-400">{error}</div>
              </div>
            )}

            {success && (
              <div className="mb-8 border border-green-400/20 bg-green-400/5 p-4">
                <div className="text-green-400">{success}</div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="border border-white/10 bg-white/5 p-8">
                  <h2 className="text-2xl font-bold text-white mb-6">Bundle Details</h2>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-gray-400 text-sm font-mono uppercase mb-3">Bundle Name</label>
                      <input
                        type="text"
                        value={bundleName}
                        onChange={(e) => { setBundleName(e.target.value); }}
                        placeholder="e.g., DeFi Blue Chips"
                        className="w-full bg-black border border-white/20 p-4 text-white text-lg focus:border-white focus:outline-none transition-colors"
                        disabled={creating}
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm font-mono uppercase mb-3">Description (Optional)</label>
                      <textarea
                        value={bundleDescription}
                        onChange={(e) => { setBundleDescription(e.target.value); }}
                        placeholder="Describe your bundle strategy..."
                        rows={4}
                        className="w-full bg-black border border-white/20 p-4 text-white focus:border-white focus:outline-none resize-none transition-colors"
                        disabled={creating}
                      />
                    </div>
                  </div>
                </div>

                <div className="border border-white/10 bg-white/5 p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">Asset Allocation</h2>
                    <div className="flex gap-3">
                      <button
                        onClick={distributeEvenly}
                        disabled={selectedAssets.length === 0 || creating}
                        className="border border-white/20 px-4 py-2 text-white text-sm hover:bg-white/10 disabled:opacity-30 transition-colors flex items-center gap-2"
                        title="Distribute Evenly"
                      >
                        <Shuffle className="w-4 h-4" />
                        Even
                      </button>
                      <button
                        onClick={resetAllocations}
                        disabled={selectedAssets.length === 0 || creating}
                        className="border border-white/20 px-4 py-2 text-white text-sm hover:bg-white/10 disabled:opacity-30 transition-colors flex items-center gap-2"
                        title="Reset All"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Reset
                      </button>
                    </div>
                  </div>

                  {selectedAssets.length === 0 ? (
                    <div className="border-2 border-dashed border-white/10 p-12 text-center">
                      <Sparkles className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-white text-xl font-bold mb-2">No Assets Selected</h3>
                      <p className="text-gray-400 mb-6">Add assets to start building your bundle</p>
                      <button
                        onClick={() => setIsDrawerOpen(true)}
                        className="btn-unique"
                        disabled={creating}
                      >
                        <Plus className="w-4 h-4 inline mr-2" />
                        Add Assets
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-gray-400 text-sm font-mono uppercase">Total Allocation</span>
                          <span className={`text-2xl font-bold ${
                            totalPercentage === 100 ? 'text-green-400' :
                            totalPercentage > 100 ? 'text-red-400' : 'text-white'
                          }`}>
                            {totalPercentage}%
                          </span>
                        </div>
                        <div className="w-full h-3 bg-white/10 overflow-hidden">
                          <div className="h-full flex">
                            {selectedAssets.map((allocation) => (
                              <div
                                key={allocation.asset.id}
                                className="h-full transition-all"
                                style={{
                                  backgroundColor: allocation.asset.color,
                                  width: `${allocation.percentage}%`
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {selectedAssets.map((allocation) => (
                          <div key={allocation.asset.id} className="border border-white/10 bg-black p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 flex items-center justify-center overflow-hidden bg-white/10">
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
                                          parent.innerHTML = `<div class="w-full h-full flex items-center justify-center" style="background-color: ${allocation.asset.color}"><span class="text-white font-bold">${allocation.asset.symbol.slice(0, 2)}</span></div>`;
                                        }
                                      }}
                                    />
                                  ) : (
                                    <div
                                      className="w-full h-full flex items-center justify-center"
                                      style={{ backgroundColor: allocation.asset.color }}
                                    >
                                      <span className="text-white font-bold">
                                        {allocation.asset.symbol.slice(0, 2)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="text-white font-bold text-lg">{allocation.asset.symbol}</div>
                                  <div className="text-gray-400 text-sm">{allocation.asset.name}</div>
                                </div>
                              </div>

                              <button
                                onClick={() => { removeAsset(allocation.asset.id); }}
                                className="text-gray-500 hover:text-red-400 transition-colors p-2"
                                disabled={creating}
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <label className="text-gray-400 text-sm font-mono uppercase">Allocation</label>
                                <input
                                  type="number"
                                  value={allocation.percentage}
                                  onChange={(e) => { updatePercentage(allocation.asset.id, parseInt(e.target.value) || 0); }}
                                  min="0"
                                  max="100"
                                  step="1"
                                  className="w-24 bg-white/10 border border-white/20 p-2 text-white text-center font-mono focus:border-white focus:outline-none"
                                  disabled={creating}
                                />
                              </div>

                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="1"
                                value={allocation.percentage}
                                onChange={(e) => { updatePercentage(allocation.asset.id, parseInt(e.target.value)); }}
                                className="w-full h-2"
                                style={{
                                  background: `linear-gradient(to right, ${allocation.asset.color} 0%, ${allocation.asset.color} ${allocation.percentage}%, rgba(255,255,255,0.1) ${allocation.percentage}%, rgba(255,255,255,0.1) 100%)`
                                }}
                                disabled={creating}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => setIsDrawerOpen(true)}
                        className="w-full border border-white/20 p-4 text-white hover:bg-white/10 transition-colors mt-4 flex items-center justify-center gap-2"
                        disabled={creating}
                      >
                        <Plus className="w-5 h-5" />
                        Add More Assets
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="border border-white/10 bg-white/5 p-6 sticky top-6">
                  <h3 className="text-xl font-bold text-white mb-6">Summary</h3>

                  <div className="space-y-6">
                    <div>
                      <div className="text-gray-500 text-xs font-mono uppercase mb-2">Bundle Name</div>
                      <div className="text-white font-bold text-lg">
                        {bundleName || <span className="text-gray-600">Not set</span>}
                      </div>
                    </div>

                    <div className="w-full h-px bg-white/10" />

                    <div>
                      <div className="text-gray-500 text-xs font-mono uppercase mb-2">Assets</div>
                      <div className="text-white font-bold text-2xl">{selectedAssets.length}</div>
                    </div>

                    <div>
                      <div className="text-gray-500 text-xs font-mono uppercase mb-2">Allocation</div>
                      <div className={`font-bold text-2xl ${
                        totalPercentage === 100 ? 'text-green-400' :
                        totalPercentage > 100 ? 'text-red-400' : 'text-white'
                      }`}>
                        {totalPercentage}%
                      </div>
                    </div>

                    <div className="w-full h-px bg-white/10" />

                    <button
                      disabled={!isValid || creating}
                      onClick={() => void handleCreateBundle()}
                      className={`btn-unique w-full py-4 text-lg ${
                        !isValid || creating ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {creating ? 'CREATING...' : 'CREATE BUNDLE'}
                    </button>

                    {!isValid && (
                      <div className="border border-red-400/20 bg-red-400/5 p-4">
                        <div className="text-red-400 text-sm space-y-1">
                          {!bundleName && <div>• Bundle name required</div>}
                          {selectedAssets.length < 2 && <div>• Min 2 assets required</div>}
                          {totalPercentage !== 100 && <div>• Allocation must = 100%</div>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black/80 z-40"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-black border-l border-white/10 z-50 overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-3xl font-bold text-white">Select Assets</h2>
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="text-gray-400 hover:text-white transition-colors p-2"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search assets..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); }}
                      className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:border-white focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {categoryOptions.map((category) => {
                      const IconComponent = category.icon;
                      const isActive = selectedCategory === category.id;

                      return (
                        <button
                          key={category.id}
                          onClick={() => { setSelectedCategory(category.id); }}
                          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-white text-black'
                              : 'bg-white/10 border border-white/20 text-white hover:bg-white/20'
                          }`}
                        >
                          <IconComponent className="w-4 h-4" />
                          {category.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                {assetsLoading ? (
                  <div className="text-center py-16 text-gray-400">
                    Loading assets...
                  </div>
                ) : availableAssetsToAdd.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-4xl mb-4">🔍</div>
                    <div className="text-gray-400">
                      {searchQuery ? 'No assets found matching your search' : 'No available assets'}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {availableAssetsToAdd.map((asset) => (
                      <button
                        key={asset.id}
                        onClick={() => { addAsset(asset); }}
                        className="border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 p-6 transition-all text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 flex items-center justify-center overflow-hidden bg-white/10">
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
                                    parent.innerHTML = `<div class="w-full h-full flex items-center justify-center" style="background-color: ${asset.color}"><span class="text-white font-bold">${asset.symbol.slice(0, 2)}</span></div>`;
                                  }
                                }}
                              />
                            ) : (
                              <div
                                className="w-full h-full flex items-center justify-center"
                                style={{ backgroundColor: asset.color }}
                              >
                                <span className="text-white font-bold">
                                  {asset.symbol.slice(0, 2)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="text-white font-bold text-lg">{asset.symbol}</div>
                            <div className="text-gray-400 text-sm">{asset.name}</div>
                          </div>
                          <Plus className="w-5 h-5 text-gray-400" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
