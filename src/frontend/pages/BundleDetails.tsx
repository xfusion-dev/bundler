import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { Package, TrendingUp, Users, Calendar, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { backendService } from '../lib/backend-service';
import { TradeModal } from '../components/trading/TradeModal';

interface Bundle {
  id: number;
  name: string;
  description?: string;
  allocations: { asset_id: string; percentage: number }[];
  created_at?: number;
  creator?: string;
  is_active?: boolean;
}

export default function BundleDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tradeModal, setTradeModal] = useState<{
    isOpen: boolean;
    mode: 'buy' | 'sell';
  }>({ isOpen: false, mode: 'buy' });

  useEffect(() => {
    loadBundleDetails();
  }, [id]);

  const loadBundleDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      // Get all bundles and find the one we need
      const bundles = await backendService.listBundles();
      const foundBundle = bundles.find((b: Bundle) => b.id.toString() === id);

      if (foundBundle) {
        setBundle(foundBundle);
      } else {
        setError('Bundle not found');
      }
    } catch (err) {
      console.error('Failed to load bundle:', err);
      setError('Failed to load bundle details');
    } finally {
      setLoading(false);
    }
  };

  const handleTrade = (mode: 'buy' | 'sell') => {
    setTradeModal({ isOpen: true, mode });
  };

  if (loading) {
    return (
      <div className="px-6 py-12 max-w-7xl mx-auto">
        <div className="text-center py-20">
          <Loader2 className="w-12 h-12 animate-spin text-accent mx-auto mb-4" />
          <h3 className="heading-medium mb-2">Loading Bundle...</h3>
          <p className="text-secondary">Fetching bundle details...</p>
        </div>
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className="px-6 py-12 max-w-7xl mx-auto">
        <div className="text-center py-20">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="heading-medium mb-2">Error Loading Bundle</h3>
          <p className="text-secondary mb-6">{error || 'Bundle not found'}</p>
          <button onClick={() => navigate('/bundles')} className="btn-unique px-6 py-3">
            BACK TO BUNDLES
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-12 max-w-7xl mx-auto">
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <button
          onClick={() => navigate('/bundles')}
          className="flex items-center gap-2 text-secondary hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Bundles
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="heading-large mb-2">{bundle.name}</h1>
            {bundle.description && (
              <p className="text-unique">{bundle.description}</p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => handleTrade('buy')}
              className="px-6 py-3 bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors font-bold"
            >
              BUY BUNDLE
            </button>
            <button
              onClick={() => handleTrade('sell')}
              className="px-6 py-3 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors font-bold"
            >
              SELL BUNDLE
            </button>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            className="card-unique p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h2 className="heading-medium mb-4">Bundle Composition</h2>
            <div className="space-y-3">
              {bundle.allocations.map((allocation, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-elevated border border-primary"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-unique flex items-center justify-center">
                      <span className="text-background font-bold text-xs">
                        {allocation.asset_id.slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <div className="font-bold text-primary">{allocation.asset_id}</div>
                      <div className="text-secondary text-sm">Token</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-accent">{allocation.percentage}%</div>
                    <div className="text-secondary text-sm">Allocation</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-elevated border border-primary">
              <div className="flex items-center justify-center h-40">
                <div className="text-center">
                  <Package className="w-12 h-12 text-tertiary mx-auto mb-2" />
                  <p className="text-secondary text-sm">Visual chart coming soon</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="card-unique p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2 className="heading-medium mb-4">Performance</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-elevated border border-primary">
                <div className="text-2xl font-bold text-green-400">+12.5%</div>
                <div className="text-secondary text-sm">24h Change</div>
              </div>
              <div className="text-center p-4 bg-elevated border border-primary">
                <div className="text-2xl font-bold text-green-400">+28.3%</div>
                <div className="text-secondary text-sm">7d Change</div>
              </div>
              <div className="text-center p-4 bg-elevated border border-primary">
                <div className="text-2xl font-bold text-green-400">+45.2%</div>
                <div className="text-secondary text-sm">30d Change</div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-elevated border border-primary">
              <div className="flex items-center justify-center h-48">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 text-tertiary mx-auto mb-2" />
                  <p className="text-secondary text-sm">Price chart coming soon</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="space-y-6">
          <motion.div
            className="card-unique p-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h3 className="font-bold text-primary mb-4">Bundle Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-secondary">Bundle ID</span>
                <span className="text-primary font-mono">#{bundle.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Assets</span>
                <span className="text-primary">{bundle.allocations.length}</span>
              </div>
              {bundle.created_at && (
                <div className="flex justify-between">
                  <span className="text-secondary">Created</span>
                  <span className="text-primary">
                    {new Date(Number(bundle.created_at) / 1000000).toLocaleDateString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-secondary">Status</span>
                <span className="text-green-400">Active</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="card-unique p-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <h3 className="font-bold text-primary mb-4">Statistics</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-secondary flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  Holders
                </span>
                <span className="text-primary font-bold">{Math.floor(Math.random() * 100)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Total Volume</span>
                <span className="text-primary font-bold">$125,432</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Market Cap</span>
                <span className="text-primary font-bold">$1.2M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">NAV/Token</span>
                <span className="text-primary font-bold">$105.23</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="card-unique p-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <h3 className="font-bold text-primary mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => handleTrade('buy')}
                className="w-full py-3 bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors font-medium"
              >
                BUY NAV TOKENS
              </button>
              <button
                onClick={() => handleTrade('sell')}
                className="w-full py-3 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors font-medium"
              >
                SELL NAV TOKENS
              </button>
              <button
                className="w-full py-3 bg-elevated border border-primary text-primary hover:border-accent transition-colors font-medium"
              >
                VIEW HOLDINGS
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {bundle && (
        <TradeModal
          isOpen={tradeModal.isOpen}
          onClose={() => setTradeModal(prev => ({ ...prev, isOpen: false }))}
          bundleId={bundle.id}
          bundleName={bundle.name}
          mode={tradeModal.mode}
        />
      )}
    </div>
  );
}