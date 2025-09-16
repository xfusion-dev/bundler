import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Plus, Minus, Package, AlertCircle, Loader2, Shuffle, Eye } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { backendService } from '../lib/backend-service';

interface Asset {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  is_active: boolean;
}

interface BundleAllocation {
  asset: Asset;
  percentage: number;
}

export default function BundleBuilder() {
  const { isAuthenticated, login, loading } = useAuth();
  const navigate = useNavigate();

  const [bundleName, setBundleName] = useState('');
  const [bundleDescription, setBundleDescription] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<BundleAllocation[]>([]);
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      setAssetsLoading(true);
      const assets = await backendService.listAssets();
      setAvailableAssets(assets);
    } catch (err) {
      setError('Failed to load assets');
      console.error('Error loading assets:', err);
    } finally {
      setAssetsLoading(false);
    }
  };

  const addAsset = (asset: Asset) => {
    if (selectedAssets.find(a => a.asset.id === asset.id)) return;
    if (selectedAssets.length >= 10) {
      setError('Maximum 10 assets per bundle');
      return;
    }

    const newAllocation = { asset, percentage: 0 };
    setSelectedAssets([...selectedAssets, newAllocation]);
  };

  const removeAsset = (assetId: string) => {
    setSelectedAssets(selectedAssets.filter(a => a.asset.id !== assetId));
  };

  const updatePercentage = (assetId: string, percentage: number) => {
    if (percentage < 0 || percentage > 100) return;

    setSelectedAssets(selectedAssets.map(a =>
      a.asset.id === assetId ? { ...a, percentage } : a
    ));
  };

  const getTotalPercentage = () => {
    return selectedAssets.reduce((sum, a) => sum + a.percentage, 0);
  };

  const autoBalance = () => {
    if (selectedAssets.length === 0) return;

    const equalPercentage = Math.floor(100 / selectedAssets.length);
    const remainder = 100 - (equalPercentage * selectedAssets.length);

    setSelectedAssets(selectedAssets.map((a, index) => ({
      ...a,
      percentage: equalPercentage + (index === 0 ? remainder : 0)
    })));
  };

  const randomizeAllocations = () => {
    if (selectedAssets.length === 0) return;

    let remaining = 100;
    const randomAllocations = selectedAssets.map((a, index) => {
      if (index === selectedAssets.length - 1) {
        return { ...a, percentage: remaining };
      }
      const max = Math.min(remaining - (selectedAssets.length - index - 1), 50);
      const percentage = Math.floor(Math.random() * max) + 1;
      remaining -= percentage;
      return { ...a, percentage };
    });

    setSelectedAssets(randomAllocations);
  };

  const handleCreateBundle = async () => {
    if (!isAuthenticated) {
      await login();
      return;
    }

    const total = getTotalPercentage();
    if (total !== 100) {
      setError('Total allocation must equal 100%');
      return;
    }

    if (!bundleName.trim()) {
      setError('Bundle name is required');
      return;
    }

    if (selectedAssets.length < 2) {
      setError('A bundle must contain at least 2 assets');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const allocations = selectedAssets.map(a => ({
        asset_id: a.asset.id,
        percentage: a.percentage
      }));

      await backendService.createBundle(
        bundleName,
        bundleDescription || null,
        allocations
      );

      navigate('/bundles');
    } catch (err: any) {
      console.error('Bundle creation error:', err);
      setError(err.message || 'Failed to create bundle');
    } finally {
      setCreating(false);
    }
  };

  const filteredAssets = availableAssets.filter(asset => {
    if (!searchQuery) return true;
    return asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           asset.symbol.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const totalPercentage = getTotalPercentage();
  const isValid = totalPercentage === 100 && bundleName.trim() && selectedAssets.length >= 2;

  if (!isAuthenticated && !loading) {
    return (
      <div className="px-6 py-12 max-w-7xl mx-auto">
        <div className="text-center py-20">
          <Package className="w-16 h-16 text-accent mx-auto mb-6" />
          <h2 className="heading-medium mb-4">Login Required</h2>
          <p className="text-secondary mb-8">You need to be logged in to create a bundle</p>
          <button onClick={login} className="btn-unique px-6 py-3">
            LOGIN WITH INTERNET IDENTITY
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-12 max-w-7xl mx-auto">
      <motion.div
        className="mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="heading-large mb-4">Bundle Builder</h1>
        <p className="text-unique max-w-5xl">
          Create your own custom token bundle with up to 10 assets. Set your allocations
          and manage your portfolio as a single tradeable token.
        </p>
      </motion.div>

      <motion.div
        className="max-w-4xl mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <div className="card-unique p-8 space-y-8">
          <div className="space-y-4">
            <h2 className="heading-medium">Bundle Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-secondary text-sm block mb-2">Bundle Name *</label>
                <input
                  type="text"
                  value={bundleName}
                  onChange={(e) => setBundleName(e.target.value)}
                  placeholder="e.g., DeFi Leaders"
                  className="w-full px-4 py-3 bg-elevated border border-primary text-primary placeholder-tertiary focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="text-secondary text-sm block mb-2">Description (Optional)</label>
                <input
                  type="text"
                  value={bundleDescription}
                  onChange={(e) => setBundleDescription(e.target.value)}
                  placeholder="Brief strategy description"
                  className="w-full px-4 py-3 bg-elevated border border-primary text-primary placeholder-tertiary focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="heading-medium">Select Assets</h2>
              <span className="text-secondary text-sm">{selectedAssets.length}/10 selected</span>
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assets..."
              className="w-full px-4 py-3 bg-elevated border border-primary text-primary placeholder-tertiary focus:outline-none focus:border-accent transition-colors"
            />

            {assetsLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
                <p className="text-secondary">Loading assets...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto p-4 bg-elevated border border-primary">
                {filteredAssets.map((asset) => {
                  const isSelected = selectedAssets.find(a => a.asset.id === asset.id);
                  return (
                    <button
                      key={asset.id}
                      onClick={() => !isSelected && addAsset(asset)}
                      disabled={!!isSelected}
                      className={`p-3 border transition-all ${
                        isSelected
                          ? 'bg-accent/20 border-accent cursor-not-allowed opacity-60'
                          : 'bg-background border-primary hover:border-accent hover:bg-accent/10'
                      }`}
                    >
                      <div className="font-bold text-primary text-sm">{asset.symbol}</div>
                      <div className="text-tertiary text-xs truncate">{asset.name}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="heading-medium">Set Allocations</h2>
              <div className="flex gap-2">
                <button
                  onClick={autoBalance}
                  disabled={selectedAssets.length === 0}
                  className="text-accent text-sm hover:text-accent/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <Shuffle className="w-4 h-4" />
                  Auto-balance
                </button>
                <button
                  onClick={randomizeAllocations}
                  disabled={selectedAssets.length === 0}
                  className="text-accent text-sm hover:text-accent/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <Shuffle className="w-4 h-4" />
                  Randomize
                </button>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  disabled={selectedAssets.length === 0}
                  className="text-accent text-sm hover:text-accent/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
              </div>
            </div>

            {selectedAssets.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-primary">
                <Package className="w-12 h-12 text-tertiary mx-auto mb-4" />
                <p className="text-secondary">No assets selected</p>
                <p className="text-tertiary text-sm mt-2">Select assets from above to build your bundle</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedAssets.map((allocation) => (
                  <div key={allocation.asset.id} className="flex items-center gap-4 p-4 bg-elevated border border-primary">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary">{allocation.asset.symbol}</span>
                        <span className="text-secondary text-sm">{allocation.asset.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updatePercentage(allocation.asset.id, Math.max(0, allocation.percentage - 5))}
                        className="w-8 h-8 bg-background border border-primary text-primary hover:border-accent transition-colors flex items-center justify-center"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        value={allocation.percentage}
                        onChange={(e) => updatePercentage(allocation.asset.id, parseFloat(e.target.value) || 0)}
                        min="0"
                        max="100"
                        className="w-20 px-2 py-1 bg-background border border-primary text-primary text-center focus:outline-none focus:border-accent"
                      />
                      <span className="text-secondary">%</span>
                      <button
                        onClick={() => updatePercentage(allocation.asset.id, Math.min(100, allocation.percentage + 5))}
                        className="w-8 h-8 bg-background border border-primary text-primary hover:border-accent transition-colors flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeAsset(allocation.asset.id)}
                        className="text-tertiary hover:text-red-400 transition-colors ml-2"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <div className={`p-4 border-2 ${
                  totalPercentage === 100 ? 'bg-green-500/10 border-green-500/30' :
                  totalPercentage > 100 ? 'bg-red-500/10 border-red-500/30' :
                  'bg-yellow-500/10 border-yellow-500/30'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className="text-primary font-bold">Total Allocation</span>
                    <span className={`text-2xl font-bold ${
                      totalPercentage === 100 ? 'text-green-400' :
                      totalPercentage > 100 ? 'text-red-400' :
                      'text-yellow-400'
                    }`}>
                      {totalPercentage}%
                    </span>
                  </div>
                  {totalPercentage !== 100 && (
                    <p className="text-sm mt-2 text-secondary">
                      {totalPercentage > 100
                        ? `Remove ${totalPercentage - 100}% allocation`
                        : `Add ${100 - totalPercentage}% more allocation`}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {showPreview && selectedAssets.length > 0 && totalPercentage === 100 && (
            <div className="p-6 bg-elevated border border-primary">
              <h3 className="text-primary font-bold mb-4">Bundle Preview</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {selectedAssets.map((allocation) => (
                  <div key={allocation.asset.id} className="text-center">
                    <div className="text-3xl font-bold text-accent">{allocation.percentage}%</div>
                    <div className="text-primary font-medium">{allocation.asset.symbol}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-400">{error}</span>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => navigate('/bundles')}
              className="flex-1 px-6 py-3 bg-elevated border border-primary text-primary hover:border-accent transition-colors"
            >
              CANCEL
            </button>
            <button
              onClick={handleCreateBundle}
              disabled={!isValid || creating}
              className="flex-1 btn-unique py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  CREATING...
                </>
              ) : (
                'CREATE BUNDLE'
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}