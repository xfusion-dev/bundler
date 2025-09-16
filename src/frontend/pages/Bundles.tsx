import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { backendService } from '../lib/backend-service';
import { Package, TrendingUp, Users, Clock, Loader2 } from 'lucide-react';

interface Bundle {
  id: number;
  name: string;
  description?: string;
  allocations: { asset_id: string; percentage: number }[];
  created_at?: number;
  creator?: string;
  is_active?: boolean;
}

export default function Bundles() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadBundles = async () => {
      try {
        setLoading(true);
        setError(null);

        const backendBundles = await backendService.listBundles();
        setBundles(backendBundles);
      } catch (err) {
        console.error('Failed to load bundles:', err);
        setError('Failed to load bundles. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    void loadBundles();
  }, []);

  const handleBundleClick = (bundleId: number) => {
    navigate(`/bundle/${bundleId}`);
  };

  const getAllocationString = (allocations: { asset_id: string; percentage: number }[]) => {
    return allocations.map(a => `${a.percentage}% ${a.asset_id}`).join(' • ');
  };

  if (loading) {
    return (
      <div className="px-6 py-12 max-w-7xl mx-auto">
        <div className="text-center py-20">
          <div className="w-24 h-24 bg-elevated border border-primary flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
          <h3 className="heading-medium mb-4">Loading Bundles...</h3>
          <p className="text-secondary">Fetching the latest token bundles from the community.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-12 max-w-7xl mx-auto">
        <div className="text-center py-20">
          <div className="w-24 h-24 bg-elevated border border-primary flex items-center justify-center mx-auto mb-6">
            <span className="text-tertiary text-4xl">❌</span>
          </div>
          <h3 className="heading-medium mb-4">Error Loading Bundles</h3>
          <p className="text-secondary mb-8">{error}</p>
          <button
            onClick={() => {
              window.location.reload();
            }}
            className="btn-unique px-6 py-3"
          >
            RETRY
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
        <div className="flex items-center justify-between mb-4">
          <h1 className="heading-large">Community Token Bundles</h1>
          <Link to="/build" className="btn-unique px-6 py-3">
            CREATE BUNDLE
          </Link>
        </div>
        <p className="text-unique max-w-5xl">
          Explore token bundles curated by the community. When you invest in a bundle,
          you own 100% of the underlying Chain-Key assets with full custody and control.
          No middlemen, no synthetic tokens—just direct ownership.
        </p>
      </motion.div>

      {bundles.length > 0 ? (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {bundles.map((bundle, index) => (
            <motion.div
              key={bundle.id}
              className="card-unique p-6 hover:border-accent transition-all cursor-pointer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleBundleClick(bundle.id)}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-unique flex items-center justify-center">
                  <Package className="w-6 h-6 text-background" />
                </div>
                <div className="flex-1">
                  <h3 className="text-primary font-bold text-lg">{bundle.name}</h3>
                  {bundle.description && (
                    <p className="text-secondary text-sm truncate">{bundle.description}</p>
                  )}
                </div>
              </div>

              <div className="mb-4 p-3 bg-elevated border border-primary rounded">
                <p className="text-sm text-secondary">
                  {getAllocationString(bundle.allocations)}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-secondary text-sm flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    Performance
                  </span>
                  <span className="text-green-400 font-medium">+12.5%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-secondary text-sm flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    Holders
                  </span>
                  <span className="text-primary">{Math.floor(Math.random() * 100)}</span>
                </div>
                {bundle.created_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-secondary text-sm flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Created
                    </span>
                    <span className="text-primary text-sm">
                      {new Date(Number(bundle.created_at) / 1000000).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-primary">
                <button
                  onClick={() => handleBundleClick(bundle.id)}
                  className="w-full text-accent text-sm font-medium hover:text-accent/80 transition-colors"
                >
                  View Details →
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
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="w-24 h-24 bg-elevated border border-primary flex items-center justify-center mx-auto mb-6">
            <Package className="w-8 h-8 text-tertiary" />
          </div>
          <h3 className="heading-medium mb-4">No Bundles Available</h3>
          <p className="text-secondary mb-8">Be the first to create a token bundle!</p>
          <Link to="/build" className="btn-unique px-6 py-3">
            CREATE FIRST BUNDLE
          </Link>
        </motion.div>
      )}
    </div>
  );
}