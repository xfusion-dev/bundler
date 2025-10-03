import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { backendService } from '../lib/backend-service';
import { Loader2 } from 'lucide-react';
import BundleRow from '../components/bundle/BundleRow';

interface Bundle {
  id: number;
  name: string;
  description: string;
  tokens: Array<{
    symbol: string;
    name: string;
    allocation: number;
    logo: string;
  }>;
  totalValue: number;
  change24h: number;
  subscribers: number;
  creator: string;
  allocations?: { asset_id: string; percentage: number }[];
  created_at?: number;
  is_active?: boolean;
}

export default function Bundles() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBundles = async () => {
      try {
        setLoading(true);
        setError(null);

        const backendBundles = await backendService.listBundles();

        const transformedBundles: Bundle[] = backendBundles.map(bundle => ({
          id: bundle.id,
          name: bundle.name,
          description: bundle.description || '',
          tokens: bundle.allocations.map(a => ({
            symbol: a.asset_id,
            name: a.asset_id,
            allocation: a.percentage,
            logo: ''
          })),
          totalValue: 0,
          change24h: 0,
          subscribers: 0,
          creator: bundle.creator || '',
          allocations: bundle.allocations,
          created_at: bundle.created_at,
          is_active: bundle.is_active
        }));

        setBundles(transformedBundles);
      } catch (err) {
        console.error('Failed to load bundles:', err);
        setError('Failed to load bundles. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    void loadBundles();
  }, []);

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
          <Link to="/build" className="btn-unique">
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="border border-white/10 rounded-lg overflow-hidden bg-black">
            <div className="flex items-center justify-between py-3 px-6 border-b border-white/10 bg-white/5">
              <div className="text-sm text-gray-400 font-medium">Name</div>
              <div className="flex items-center gap-8">
                <div className="text-sm text-gray-400 font-medium min-w-[120px]">Backing</div>
                <div className="text-sm text-gray-400 font-medium min-w-[120px]">Tags</div>
                <div className="text-sm text-gray-400 font-medium min-w-[140px]">Performance (Last 7 Days)</div>
                <div className="text-sm text-gray-400 font-medium min-w-[120px]">Market Cap</div>
              </div>
            </div>
            {bundles.map((bundle) => (
              <BundleRow key={bundle.id} bundle={bundle} />
            ))}
          </div>
        </motion.div>
      ) : (
        <motion.div
          className="text-center py-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h3 className="heading-medium mb-4">No Bundles Available</h3>
          <p className="text-secondary mb-8">Be the first to create a token bundle!</p>
          <Link to="/build" className="btn-unique">
            CREATE FIRST BUNDLE
          </Link>
        </motion.div>
      )}
    </div>
  );
}