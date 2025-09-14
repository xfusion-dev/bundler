import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { backendService } from '../lib/backend';
import BundleCard from '../components/bundle/BundleCard';
import { Bundle } from '../lib/mock-bundles';

export default function Bundles() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBundles = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [backendBundles, allAssets] = await Promise.all([
          backendService.getPublishedBundles(),
          backendService.getActiveAssets()
        ]);
        
        // Create asset lookup map
        const assetMap = new Map(allAssets.map(asset => [asset.id, asset]));
        
        // Transform backend bundles to frontend format
        const transformedBundles: Bundle[] = backendBundles.map(bundle => {
          // Calculate real bundle price from asset prices and allocations
          const calculatedPrice = bundle.assets.reduce((total, asset) => {
            const assetDetails = assetMap.get(asset.asset_id);
            const assetPrice = assetDetails?.current_price || 0;
            const allocation = asset.allocation_percentage / 100; // Convert percentage to decimal
            return total + (assetPrice * allocation);
          }, 0);

          return {
            id: bundle.id,
            name: bundle.name,
            description: bundle.description,
            category: 'balanced' as const,
            totalValue: calculatedPrice, // Use calculated price instead of backend total_value_usd
            change24h: bundle.performance_24h,
            volume24h: 0, // Not available from backend
            tokens: bundle.assets.map(asset => {
              const assetDetails = assetMap.get(asset.asset_id);
              return {
                symbol: assetDetails?.symbol || asset.asset_id,
                name: assetDetails?.name || asset.asset_id,
                allocation: asset.allocation_percentage,
                logo: assetDetails?.logo_url || ''
              };
            }),
            creator: bundle.creator,
            createdAt: new Date(Number(bundle.created_at) / 1000000).toISOString().split('T')[0],
            subscribers: bundle.subscribers,
            logo: '📦',
            color: bundle.color || '#6366f1',
            risk: 'medium' as const,
            apy: Math.random() * 10 + 5 // Mock APY for now
          };
        });
        
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
            <span className="text-tertiary text-4xl">⏳</span>
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
      {/* Header */}
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

      {/* Bundles Grid */}
      {bundles.length > 0 ? (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          {bundles.map((bundle, index) => (
            <BundleCard key={bundle.id} bundle={bundle} index={index} />
          ))}
        </motion.div>
      ) : (
        <motion.div 
          className="text-center py-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <div className="w-24 h-24 bg-elevated border border-primary flex items-center justify-center mx-auto mb-6">
            <span className="text-tertiary text-4xl">📦</span>
          </div>
          <h3 className="heading-medium mb-4">No Bundles Found</h3>
          <p className="text-unique max-w-md mx-auto mb-8">
            No bundles are currently available. Be the first to create a token bundle for the community!
          </p>
          <Link to="/build" className="btn-unique px-6 py-3">
            CREATE FIRST BUNDLE
          </Link>
        </motion.div>
      )}
    </div>
  );
} 