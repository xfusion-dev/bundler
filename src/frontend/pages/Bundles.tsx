import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { backendService } from '../lib/backend-service';
import { Loader2, Search } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredBundles = bundles.filter(bundle => {
    const description = Array.isArray(bundle.description) ? bundle.description[0] : bundle.description;
    return bundle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (description && description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      bundle.tokens.some(token => token.symbol.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="px-6 py-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Loading Bundles...</h3>
              <p className="text-gray-400">Fetching the latest token bundles from the community.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black">
        <div className="px-6 py-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">❌</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Error Loading Bundles</h3>
              <p className="text-gray-400 mb-8">{error}</p>
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-start justify-between mb-12">
              <div className="flex-1">
                <h1 className="text-6xl font-bold text-white mb-4">Discover Bundles</h1>
                <p className="text-gray-400 text-lg max-w-2xl">
                  Explore curated token portfolios. Each bundle represents real asset ownership—no synthetics, no derivatives.
                </p>
              </div>
              <Link to="/build" className="btn-unique px-8 py-4 text-lg flex-shrink-0">
                Create Bundle
              </Link>
            </div>

            <div className="relative mb-8">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, description, or token..."
                className="w-full bg-white/5 border border-white/10 pl-14 pr-6 py-4 text-white placeholder:text-gray-500 focus:border-white/30 focus:outline-none transition-colors"
              />
            </div>
          </motion.div>

          {filteredBundles.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-3"
            >
              {filteredBundles.map((bundle) => (
                <BundleRow key={bundle.id} bundle={bundle} />
              ))}
            </motion.div>
          ) : searchQuery ? (
            <motion.div
              className="border border-white/10 bg-white/5 p-20 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="w-20 h-20 bg-white/10 flex items-center justify-center mx-auto mb-6">
                <Search className="w-8 h-8 text-gray-500" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-4">No bundles found</h3>
              <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
                No bundles match your search. Try different keywords or create your own bundle.
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="btn-outline-unique px-6 py-3"
              >
                Clear Search
              </button>
            </motion.div>
          ) : (
            <motion.div
              className="border border-white/10 bg-white/5 p-20 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="w-20 h-20 bg-white/10 flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">📦</span>
              </div>
              <h3 className="text-3xl font-bold text-white mb-4">No Bundles Yet</h3>
              <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
                Be the first to create a token bundle and start building your portfolio strategy!
              </p>
              <Link to="/build" className="btn-unique px-8 py-4 text-lg">
                Create First Bundle
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}