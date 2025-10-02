import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { backendService } from '../lib/backend';
import BundleCard from '../components/bundle/BundleCard';
import TVLHero from '../components/hero/TVLHero';
import BundlesIntroSection from '../components/hero/BundleDetailsSection';
interface Bundle {
  id: number;
  name: string;
  description: string;
  nav: number;
  tvl: number;
  performance: {
    '24h': number;
    '7d': number;
    '30d': number;
  };
  risk: 'low' | 'medium' | 'high';
  subscribers: number;
  logo: string;
  color: string;
  apy: number;
}

export default function HomePage() {
  const [featuredBundles, setFeaturedBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFeaturedBundles = async () => {
      try {
        setLoading(true);
        
        const [backendBundles, allAssets] = await Promise.all([
          backendService.getFeaturedBundles(),
          backendService.getActiveAssets()
        ]);
        
        const assetMap = new Map(allAssets.map(asset => [asset.id, asset]));
        
        const transformedBundles: Bundle[] = backendBundles.map(bundle => {
          const calculatedPrice = bundle.assets.reduce((total, asset) => {
            const assetDetails = assetMap.get(asset.asset_id);
            const assetPrice = assetDetails?.current_price || 0;
            const allocation = asset.allocation_percentage / 100;
            return total + (assetPrice * allocation);
          }, 0);

          return {
            id: bundle.id,
            name: bundle.name,
            description: bundle.description,
            category: 'balanced' as const,
            totalValue: calculatedPrice,
            change24h: bundle.performance_24h,
            volume24h: 0,
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
            apy: 0
          };
        });
        
        setFeaturedBundles(transformedBundles.slice(0, 3));
      } catch (err) {
        console.error('Failed to load featured bundles:', err);
        setFeaturedBundles([]);
      } finally {
        setLoading(false);
      }
    };
    
    void loadFeaturedBundles();
  }, []);

  return (
    <>
      <TVLHero />

      <BundlesIntroSection />

      <section id="bundles" className="px-6 py-24 bg-space">
        <div className="max-w-7xl mx-auto">
          <div className="asymmetric-grid mb-16">
            <div>
              <h2 className="heading-large mb-6">Featured Bundles</h2>
              <p className="text-unique max-w-lg">
                Popular token bundles created by the community.
              </p>
            </div>
            <div className="flex items-end justify-end">
              <Link to="/bundles" className="btn-outline-unique">View All Bundles</Link>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-surface border border-primary rounded-lg p-6 animate-pulse">
                  <div className="h-4 bg-primary/20 rounded mb-4"></div>
                  <div className="h-3 bg-primary/20 rounded mb-2"></div>
                  <div className="h-3 bg-primary/20 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : featuredBundles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredBundles.map((bundle, index) => (
                <BundleCard key={bundle.id} bundle={bundle} index={index} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-tertiary mb-4">No featured bundles available yet.</p>
              <Link to="/build" className="btn-unique">Create the First Bundle</Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
} 