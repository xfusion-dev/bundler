import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { backendService } from '../lib/backend';
import BundleRow from '../components/bundle/BundleRow';
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

      <section id="bundles" className="px-6 py-24 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Featured Bundles</h2>
              <p className="text-gray-400">
                Popular token bundles created by the community
              </p>
            </div>
            <Link to="/bundles" className="btn-outline-unique">
              View All Bundles
            </Link>
          </div>

          {loading ? (
            <div className="space-y-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-white/5 animate-pulse"></div>
              ))}
            </div>
          ) : featuredBundles.length > 0 ? (
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
              {featuredBundles.map((bundle) => (
                <BundleRow key={bundle.id} bundle={bundle} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">No featured bundles available yet.</p>
              <Link to="/build" className="btn-unique">
                Create the First Bundle
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
} 