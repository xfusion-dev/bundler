import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Minus, Shuffle, RotateCcw, Search, Bitcoin, Coins, Building, DollarSign, Grid3X3, Sparkles, Landmark, Droplets, TrendingUp as Percent } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../lib/AuthContext';
import { backendService } from '../lib/backend-service';
import { coordinatorService } from '../src/services/coordinator-service';
import { authService } from '../lib/auth';
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
  token_location: any;
  metadata?: AssetMetadata;
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
  const [bundleSymbol, setBundleSymbol] = useState('');
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
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [usdcAmount, setUsdcAmount] = useState('');
  const [navTokenAmount, setNavTokenAmount] = useState('');
  const [creationStep, setCreationStep] = useState<number>(0);
  const [currentQuote, setCurrentQuote] = useState<any>(null);
  const [quoteExpiresAt, setQuoteExpiresAt] = useState<number>(0);
  const [quoteExpired, setQuoteExpired] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [createdBundleId, setCreatedBundleId] = useState<number | null>(null);

  const navigate = useNavigate();

  const getCategoryName = (asset: BackendAsset): string => {
    const category = asset.metadata?.category;
    if (!category) return 'Other';

    if ('Cryptocurrency' in category) return 'Cryptocurrency';
    if ('RWA' in category) return 'RWA';
    if ('LiquidStaking' in category) return 'Liquid Staking';
    if ('Yield' in category) return 'Yield';
    // Old categories (backwards compatibility)
    if ('Stablecoin' in category) return 'Cryptocurrency';
    if ('CommodityBacked' in category) return 'RWA';
    if ('Stocks' in category) return 'RWA';
    return 'Other';
  };

  const getCategoryColor = (categoryName: string): string => {
    switch(categoryName) {
      case 'Cryptocurrency': return '#f59e0b';
      case 'RWA': return '#8b5cf6';
      case 'Liquid Staking': return '#06b6d4';
      case 'Yield': return '#10b981';
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

  useEffect(() => {
    if (!quoteExpiresAt) return;

    const interval = setInterval(() => {
      const now = Date.now() * 1000000;
      const remaining = Math.max(0, quoteExpiresAt - now);
      setTimeRemaining(remaining);

      if (remaining === 0 && !quoteExpired && currentQuote) {
        setQuoteExpired(true);
        toast('Quote expired, fetching new quote...', { icon: '🔄' });
        void requestNewQuote();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [quoteExpiresAt, quoteExpired, currentQuote]);

  const getTimeRemaining = (ns: number): string => {
    const ms = ns / 1000000;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const initialNavPrice = (() => {
    if (!usdcAmount || !navTokenAmount || parseFloat(usdcAmount) <= 0 || parseFloat(navTokenAmount) <= 0) {
      return 0;
    }
    return parseFloat(usdcAmount) / parseFloat(navTokenAmount);
  })();

  const assetPurchaseBreakdown = (() => {
    if (!usdcAmount || parseFloat(usdcAmount) <= 0) return [];

    const totalUsdc = parseFloat(usdcAmount);
    return selectedAssets.map(allocation => ({
      symbol: allocation.asset.symbol,
      percentage: allocation.percentage,
      usdcAmount: (totalUsdc * allocation.percentage) / 100
    }));
  })();

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="px-6 py-8 md:py-16">
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
        <div className="px-6 py-8 md:py-16">
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
    setBundleSymbol('');
    setBundleDescription('');
    setError(null);
    setSuccess(null);
  };

  const requestNewQuote = async () => {
    setQuoteExpired(false);
    setCurrentQuote(null);
    setQuoteExpiresAt(0);
    setTimeRemaining(0);
  };

  const handleAcceptQuote = async () => {
    if (!currentQuote || !createdBundleId) return;

    const now = Date.now() * 1000000;
    if (now >= quoteExpiresAt) {
      setError('Quote expired. Please get a new quote.');
      setCurrentQuote(null);
      return;
    }

    try {
      setCreating(true);
      setCreationStep(3);

      const assignmentId = await backendService.executeQuote(currentQuote);

      setCreationStep(4);

      await new Promise(resolve => setTimeout(resolve, 2000));

      setSuccess(`Bundle "${bundleName}" created successfully with ${navTokenAmount} NAV tokens!`);
      toast.success(`Bundle "${bundleName}" created successfully!`);

      setTimeout(() => {
        resetAllocations();
        setCreationStep(0);
        setIsCreationModalOpen(false);
        setUsdcAmount('');
        setNavTokenAmount('');
        setCurrentQuote(null);
        setCreatedBundleId(null);
        navigate(`/bundles/${createdBundleId}`);
      }, 2000);

    } catch (error) {
      console.error('Failed to execute quote:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to execute quote. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      setCreationStep(0);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateBundle = async () => {
    if (!usdcAmount || !navTokenAmount || parseFloat(usdcAmount) <= 0 || parseFloat(navTokenAmount) <= 0) {
      toast.error('Please enter valid USDC and NAV token amounts');
      return;
    }

    try {
      setCreating(true);
      setError(null);
      setSuccess(null);
      setCreationStep(1);

      const allocations = selectedAssets.map(allocation => ({
        asset_id: allocation.asset.id,
        percentage: allocation.percentage
      }));

      const bundleId = await backendService.createBundle(
        bundleName,
        bundleSymbol,
        bundleDescription || null,
        allocations
      );

      setCreatedBundleId(bundleId);
      setCreationStep(2);

      const userPrincipal = await authService.getPrincipal();
      const quote = await coordinatorService.getQuote(
        Number(bundleId),
        { InitialBuy: { usd_amount: Math.floor(parseFloat(usdcAmount) * 1e8), nav_tokens: Math.floor(parseFloat(navTokenAmount) * 1e8) } },
        userPrincipal?.toString() || ''
      );

      setCurrentQuote(quote);
      setQuoteExpiresAt(quote.valid_until);
      setQuoteExpired(false);
      setCreationStep(0);
      setCreating(false);

      toast.success('Quote received! Review and accept to complete.');

    } catch (error) {
      console.error('Failed to get quote:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to get quote. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      setCreationStep(0);
      setCreating(false);
    }
  };

  const getCategoryIcon = (categoryName: string) => {
    switch(categoryName) {
      case 'Cryptocurrency': return Bitcoin;
      case 'RWA': return Landmark;
      case 'Liquid Staking': return Droplets;
      case 'Yield': return Percent;
      default: return Coins;
    }
  };

  const categoryOptions = [
    { id: 'all', name: 'All Assets', icon: Grid3X3 },
    { id: 'Cryptocurrency', name: 'Cryptocurrency', icon: Bitcoin },
    { id: 'RWA', name: 'RWA', icon: Landmark },
    { id: 'Yield', name: 'Yield + LST', icon: Percent }
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
  const isValid = totalPercentage === 100 && bundleName && bundleSymbol.length === 4 && selectedAssets.length >= 2;

  return (
    <>
      <SEO
        title="Create Token Bundle | XFusion"
        description="Design your own custom token portfolio with personalized allocations. Earn commission from every trade. Start building your diversified crypto bundle now."
        keywords="create crypto bundle, custom token portfolio, DeFi portfolio builder, crypto index creator"
      />
      <div className="min-h-screen bg-black">
        <div className="px-6 py-8 md:py-16">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8 md:mb-16">
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-3 md:mb-4">Create Bundle</h1>
              <p className="text-gray-400 text-base md:text-lg">
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
              <div className="lg:col-span-2 space-y-6 md:space-y-8">
                <div className="border border-white/10 bg-white/5 p-4 md:p-8">
                  <h2 className="text-2xl font-bold text-white mb-6">Bundle Details</h2>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-2">
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
                        <label className="block text-gray-400 text-sm font-mono uppercase mb-3">
                          Symbol
                        </label>
                        <input
                          type="text"
                          value={bundleSymbol}
                          onChange={(e) => {
                            const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                            if (value.length <= 4) {
                              setBundleSymbol(value);
                            }
                          }}
                          placeholder="DEFI"
                          maxLength={4}
                          className="w-full bg-black border border-white/20 p-4 text-white text-lg focus:border-white focus:outline-none transition-colors uppercase font-mono text-center"
                          disabled={creating}
                        />
                      </div>
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

                <div className="border border-white/10 bg-white/5 p-4 md:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl md:text-2xl font-bold text-white">Asset Allocation</h2>
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
                                <div className="w-10 h-10 flex items-center justify-center overflow-hidden rounded-lg">
                                  {allocation.asset.logo ? (
                                    <img
                                      src={allocation.asset.logo}
                                      alt={allocation.asset.symbol}
                                      className="w-full h-full object-cover rounded-lg"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const parent = target.parentElement;
                                        if (parent) {
                                          parent.innerHTML = `<div class="w-full h-full flex items-center justify-center rounded-lg" style="background-color: ${allocation.asset.color}"><span class="text-white font-bold">${allocation.asset.symbol.slice(0, 2)}</span></div>`;
                                        }
                                      }}
                                    />
                                  ) : (
                                    <div
                                      className="w-full h-full flex items-center justify-center rounded-lg"
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
                <div className="border border-white/10 bg-white/5 p-4 md:p-6 md:sticky md:top-6">
                  <h3 className="text-xl font-bold text-white mb-6">Summary</h3>

                  <div className="space-y-6">
                    <div>
                      <div className="text-gray-500 text-xs font-mono uppercase mb-2">Bundle Name</div>
                      <div className="text-white font-bold text-lg">
                        {bundleName || <span className="text-gray-600">Not set</span>}
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-500 text-xs font-mono uppercase mb-2">Symbol</div>
                      <div className="text-white font-bold text-lg font-mono">
                        {bundleSymbol || <span className="text-gray-600">Not set</span>}
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
                      disabled={!isValid}
                      onClick={() => setIsCreationModalOpen(true)}
                      className={`btn-unique w-full py-4 text-lg ${
                        !isValid ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      CONTINUE
                    </button>

                    {!isValid && (
                      <div className="border border-red-400/20 bg-red-400/5 p-4">
                        <div className="text-red-400 text-sm space-y-1">
                          {!bundleName && <div>• Bundle name required</div>}
                          {bundleSymbol.length !== 4 && <div>• 4-char symbol required</div>}
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
        {isCreationModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !creating && setIsCreationModalOpen(false)}
              className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-black border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6 md:p-8">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Initial Bundle Funding</h2>
                  <p className="text-gray-400 text-sm mb-8">
                    Set the initial price and supply for your NAV token by specifying how much USDC you're contributing and how many tokens to mint.
                  </p>

                  {currentQuote && !creating ? (
                    <div className="space-y-6">
                      <div className="border border-green-400/20 bg-green-400/5 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="text-green-400 font-mono uppercase text-sm">Quote Received</div>
                          <div className="text-white font-mono text-lg">
                            {quoteExpired ? (
                              <span className="text-red-400">EXPIRED</span>
                            ) : (
                              <span>{getTimeRemaining(timeRemaining)}</span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <div className="text-gray-400 text-sm mb-1">You will receive</div>
                            <div className="text-white text-3xl font-bold">
                              {(currentQuote.nav_tokens / 1e8).toLocaleString()} NAV Tokens
                            </div>
                          </div>

                          <div>
                            <div className="text-gray-400 text-sm mb-1">For</div>
                            <div className="text-white text-xl font-bold">
                              ${(currentQuote.ckusdc_amount / 1e8).toLocaleString()} USDC
                            </div>
                          </div>

                          <div className="border-t border-white/10 pt-4">
                            <div className="text-gray-400 text-sm mb-2">Initial Price per NAV Token</div>
                            <div className="text-white text-2xl font-bold">
                              ${((currentQuote.ckusdc_amount / currentQuote.nav_tokens)).toFixed(4)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {quoteExpired ? (
                        <button
                          onClick={() => void handleCreateBundle()}
                          className="w-full btn-unique py-4"
                        >
                          GET NEW QUOTE
                        </button>
                      ) : (
                        <div className="flex gap-4">
                          <button
                            onClick={() => {
                              setCurrentQuote(null);
                              setQuoteExpiresAt(0);
                            }}
                            className="flex-1 border border-white/20 p-4 text-white hover:bg-white/10 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => void handleAcceptQuote()}
                            className="flex-1 btn-unique py-4"
                          >
                            ACCEPT QUOTE
                          </button>
                        </div>
                      )}
                    </div>
                  ) : !creating ? (
                    <div className="space-y-8">
                      <div>
                        <label className="block text-gray-400 text-sm font-mono uppercase mb-3">USDC Amount</label>
                        <input
                          type="number"
                          value={usdcAmount}
                          onChange={(e) => setUsdcAmount(e.target.value)}
                          placeholder="e.g., 10000"
                          min="0"
                          step="0.01"
                          className="w-full bg-white/5 border border-white/20 p-4 text-white text-lg focus:border-white focus:outline-none transition-colors"
                        />
                        <div className="mt-2 text-gray-500 text-sm">
                          Total USDC to spend on initial assets
                        </div>
                      </div>

                      <div>
                        <label className="block text-gray-400 text-sm font-mono uppercase mb-3">NAV Tokens to Mint</label>
                        <input
                          type="number"
                          value={navTokenAmount}
                          onChange={(e) => setNavTokenAmount(e.target.value)}
                          placeholder="e.g., 1000"
                          min="0"
                          step="1"
                          className="w-full bg-white/5 border border-white/20 p-4 text-white text-lg focus:border-white focus:outline-none transition-colors"
                        />
                        <div className="mt-2 text-gray-500 text-sm">
                          Number of NAV tokens you'll receive
                        </div>
                      </div>

                      {initialNavPrice > 0 && (
                        <>
                          <div className="border border-white/20 bg-white/5 p-6">
                            <div className="text-gray-400 text-sm font-mono uppercase mb-3">Initial NAV Token Price</div>
                            <div className="text-white text-4xl font-bold mb-2">
                              ${initialNavPrice.toFixed(4)}
                            </div>
                            <div className="text-gray-500 text-sm">
                              Price per NAV token (${usdcAmount} ÷ {navTokenAmount} tokens)
                            </div>
                          </div>

                          {assetPurchaseBreakdown.length > 0 && (
                            <div className="border border-white/20 bg-white/5 p-6">
                              <div className="text-gray-400 text-sm font-mono uppercase mb-4">Asset Purchase Breakdown</div>
                              <div className="space-y-3">
                                {assetPurchaseBreakdown.map((asset) => (
                                  <div key={asset.symbol} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <span className="text-white font-mono">{asset.symbol}</span>
                                      <span className="text-gray-500 text-sm">{asset.percentage}%</span>
                                    </div>
                                    <div className="text-white font-bold">
                                      ${asset.usdcAmount.toFixed(2)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      <div className="flex gap-4">
                        <button
                          onClick={() => setIsCreationModalOpen(false)}
                          className="flex-1 border border-white/20 p-4 text-white hover:bg-white/10 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => void handleCreateBundle()}
                          disabled={!usdcAmount || !navTokenAmount || parseFloat(usdcAmount) <= 0 || parseFloat(navTokenAmount) <= 0}
                          className={`flex-1 btn-unique py-4 ${
                            (!usdcAmount || !navTokenAmount || parseFloat(usdcAmount) <= 0 || parseFloat(navTokenAmount) <= 0)
                              ? 'opacity-50 cursor-not-allowed'
                              : ''
                          }`}
                        >
                          CREATE BUNDLE
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {[
                        { step: 1, label: 'Creating bundle configuration', desc: 'Saving bundle details and allocations' },
                        { step: 2, label: 'Fetching quote from coordinator', desc: 'Getting signed quote with asset prices' },
                        { step: 3, label: 'Executing quote on-chain', desc: 'Locking USDC and creating assignment' },
                        { step: 4, label: 'Completing transaction', desc: 'Assets deposited, NAV tokens minted' }
                      ].map((item) => (
                        <div key={item.step} className="flex items-start gap-4">
                          <div className={`w-8 h-8 flex items-center justify-center border-2 ${
                            creationStep > item.step ? 'border-green-400 bg-green-400' :
                            creationStep === item.step ? 'border-white bg-white' :
                            'border-white/20 bg-transparent'
                          }`}>
                            {creationStep > item.step ? (
                              <span className="text-black text-sm">✓</span>
                            ) : creationStep === item.step ? (
                              <div className="w-3 h-3 bg-black animate-pulse" />
                            ) : (
                              <span className="text-gray-600 text-sm">{item.step}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className={`font-bold ${
                              creationStep >= item.step ? 'text-white' : 'text-gray-600'
                            }`}>
                              {item.label}
                            </div>
                            <div className="text-gray-500 text-sm">{item.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
              className="fixed right-0 top-0 bottom-0 w-full md:max-w-2xl bg-black md:border-l border-white/10 z-50 overflow-hidden flex flex-col"
            >
              <div className="p-4 md:p-8 border-b border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl md:text-3xl font-bold text-white">Select Assets</h2>
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

              <div className="flex-1 overflow-y-auto p-4 md:p-8">
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
                          <div className="w-12 h-12 flex items-center justify-center overflow-hidden rounded-lg">
                            {asset.logo ? (
                              <img
                                src={asset.logo}
                                alt={asset.symbol}
                                className="w-full h-full object-cover rounded-lg"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `<div class="w-full h-full flex items-center justify-center rounded-lg" style="background-color: ${asset.color}"><span class="text-white font-bold">${asset.symbol.slice(0, 2)}</span></div>`;
                                  }
                                }}
                              />
                            ) : (
                              <div
                                className="w-full h-full flex items-center justify-center rounded-lg"
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
