import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Shield, TrendingUp, Zap, DollarSign } from 'lucide-react';
import { backendService } from '../lib/backend';
import BundleCard from '../components/bundle/BundleCard';
import CompetitionHero from '../components/competition/CompetitionHero';
import assetsImage from '../assets/assets.png';
import { Bundle } from '../lib/mock-bundles';

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
            apy: Math.random() * 10 + 5
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
      <CompetitionHero />

      <section id="features" className="px-6 py-24 bg-gradient-to-b from-space to-space-dark">
        <div className="max-w-7xl mx-auto">
        <h2 className="heading-large mb-20 text-white text-center">
                Why Bundle Tokens?
              </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-unique/10 border border-unique/20 rounded flex items-center justify-center mt-1">
                    <Shield className="w-6 h-6 text-unique" />
                  </div>
                  <div>
                    <h3 className="heading-medium mb-3 text-white">Risk Mitigation</h3>
                    <p className="text-unique">
                      Spread risk across multiple Chain-Key tokens instead of betting on individual assets.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-unique/10 border border-unique/20 rounded flex items-center justify-center mt-1">
                    <TrendingUp className="w-6 h-6 text-unique" />
                  </div>
                  <div>
                    <h3 className="heading-medium mb-3 text-white">Simplified Trading</h3>
                    <p className="text-unique">
                      Buy into curated portfolios with a single transaction. No need to manage individual tokens.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-unique/10 border border-unique/20 rounded flex items-center justify-center mt-1">
                    <Zap className="w-6 h-6 text-unique" />
                  </div>
                  <div>
                    <h3 className="heading-medium mb-3 text-white">Expert Curation</h3>
                    <p className="text-unique">
                      Benefit from community-created bundles by experienced traders and analysts.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-unique/10 border border-unique/20 rounded flex items-center justify-center mt-1">
                    <DollarSign className="w-6 h-6 text-unique" />
                  </div>
                  <div>
                    <h3 className="heading-medium mb-3 text-white">Cost Efficiency</h3>
                    <p className="text-unique">
                      Lower fees compared to buying and managing multiple tokens individually.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="relative z-10">
                <img 
                  src={assetsImage} 
                  alt="XFusion Assets" 
                  className="w-full h-auto rounded-lg shadow-2xl"
                />
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-br from-unique/20 via-transparent to-violet-500/20 rounded-lg transform translate-x-4 translate-y-4 -z-10" />
            </motion.div>
          </div>
        </div>
      </section>

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