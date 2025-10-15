import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import BundleRow from '../components/bundle/BundleRow';
import BundleMobileCard from '../components/bundle/BundleMobileCard';
import { BundleCardSkeleton } from '../components/ui/Skeleton';
import SEO from '../components/SEO';
import { useBundlesWithAssets } from '../hooks/useBackendQueries';

interface Bundle {
  id: number;
  name: string;
  symbol?: string;
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

type SortOption = 'name' | 'price' | 'change' | 'holders' | 'marketCap';
type SortDirection = 'asc' | 'desc';

export default function Bundles() {
  const { bundles, isLoading: loading, error } = useBundlesWithAssets();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (column: SortOption) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  const filteredBundles = bundles
    .filter(bundle => {
      const description = Array.isArray(bundle.description) ? bundle.description[0] : bundle.description;
      return bundle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (description && description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        bundle.tokens.some(token => token.symbol.toLowerCase().includes(searchQuery.toLowerCase()));
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'price':
          comparison = a.totalValue - b.totalValue;
          break;
        case 'change':
          comparison = a.change24h - b.change24h;
          break;
        case 'holders':
          comparison = a.subscribers - b.subscribers;
          break;
        case 'marketCap':
          const aMarketCap = (a as any).marketCapValue || 0;
          const bMarketCap = (b as any).marketCapValue || 0;
          comparison = aMarketCap - bMarketCap;
          break;
        default:
          comparison = 0;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="px-6 py-8 md:py-16">
          <div className="max-w-7xl mx-auto">
            <motion.div
              className="mb-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-start justify-between mb-8 md:mb-12">
                <div className="flex-1">
                  <h1 className="text-4xl md:text-6xl font-bold text-white mb-3 md:mb-4">Discover Bundles</h1>
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
                  disabled
                  placeholder="Search by name, description, or token..."
                  className="w-full bg-white/5 border border-white/10 pl-14 pr-6 py-4 text-white placeholder:text-gray-500 focus:border-white/30 focus:outline-none transition-colors"
                />
              </div>
            </motion.div>

            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <BundleCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black">
        <div className="px-6 py-8 md:py-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">❌</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Error Loading Bundles</h3>
              <p className="text-gray-400 mb-8">{error?.message || 'Failed to load bundles. Please try again.'}</p>
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
      <SEO
        title="Discover Token Bundles | XFusion"
        description="Explore curated token portfolios. Each bundle represents real asset ownership—no synthetics, no derivatives. Start building your diversified crypto portfolio today."
        keywords="crypto bundles, token portfolios, DeFi portfolios, diversified crypto, crypto index funds"
      />
      <div className="px-6 py-8 md:py-16">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="mb-6 md:mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-6 md:mb-8">
              <div className="md:hidden mb-4 md:mb-6">
                <h1 className="text-4xl font-bold text-white mb-2 md:mb-3">Discover Bundles</h1>
                <p className="text-gray-400 text-base mb-4">
                  Explore curated token portfolios. Each bundle represents real asset ownership—no synthetics, no derivatives.
                </p>
                <Link to="/build" className="btn-unique w-full py-3 text-center block">
                  Create Bundle
                </Link>
              </div>

              <div className="hidden md:flex items-start justify-between mb-6 md:mb-8">
                <div className="flex-1">
                  <h1 className="text-4xl md:text-6xl font-bold text-white mb-3 md:mb-4">Discover Bundles</h1>
                  <p className="text-gray-400 text-lg max-w-2xl">
                    Explore curated token portfolios. Each bundle represents real asset ownership—no synthetics, no derivatives.
                  </p>
                </div>
                <Link to="/build" className="btn-unique px-8 py-4 text-lg flex-shrink-0">
                  Create Bundle
                </Link>
              </div>

              <div className="flex justify-end">
                <div className="relative w-full md:w-1/3">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, description, or token..."
                    className="w-full bg-white/5 border border-white/10 pl-14 pr-6 py-4 text-white placeholder:text-gray-500 focus:border-white/30 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          <div className="hidden md:block border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between gap-8">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-12" />
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-mono uppercase"
                >
                  Name
                  {sortBy === 'name' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                  ) : (
                    <ArrowUpDown className="w-4 h-4 opacity-50" />
                  )}
                </button>
              </div>
              <div className="flex items-center gap-8">
                <div className="w-48 text-gray-400 text-sm font-mono uppercase text-center">Assets</div>
                <button
                  onClick={() => handleSort('price')}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-mono uppercase min-w-[120px] justify-end"
                >
                  Price
                  {sortBy === 'price' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                  ) : (
                    <ArrowUpDown className="w-4 h-4 opacity-50" />
                  )}
                </button>
                <button
                  onClick={() => handleSort('change')}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-mono uppercase min-w-[100px] justify-end"
                >
                  24h
                  {sortBy === 'change' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                  ) : (
                    <ArrowUpDown className="w-4 h-4 opacity-50" />
                  )}
                </button>
                <button
                  onClick={() => handleSort('holders')}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-mono uppercase min-w-[100px] justify-end"
                >
                  Holders
                  {sortBy === 'holders' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                  ) : (
                    <ArrowUpDown className="w-4 h-4 opacity-50" />
                  )}
                </button>
                <button
                  onClick={() => handleSort('marketCap')}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-mono uppercase min-w-[120px] justify-end"
                >
                  Market Cap
                  {sortBy === 'marketCap' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                  ) : (
                    <ArrowUpDown className="w-4 h-4 opacity-50" />
                  )}
                </button>
                <div className="w-8" />
              </div>
            </div>
          </div>

          {filteredBundles.length > 0 ? (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="hidden md:block"
              >
                {filteredBundles.map((bundle) => (
                  <BundleRow key={bundle.id} bundle={bundle} />
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="md:hidden"
              >
                {filteredBundles.map((bundle, index) => (
                  <div key={bundle.id}>
                    <BundleMobileCard bundle={bundle} />
                    {index < filteredBundles.length - 1 && (
                      <div className="h-px bg-white/10 my-4" />
                    )}
                  </div>
                ))}
              </motion.div>
            </>
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