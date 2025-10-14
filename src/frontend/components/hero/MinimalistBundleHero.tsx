import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Actor, HttpAgent } from '@dfinity/agent';
import { idlFactory } from '../../../backend/declarations/backend.did.js';
import type { _SERVICE } from '../../../backend/declarations/backend.did';

const BACKEND_CANISTER_ID = 'dk3fi-vyaaa-aaaae-qfycq-cai';
const FEATURED_BUNDLE_IDS = [5, 6, 7];

interface BundleAllocation {
  asset_id: string;
  percentage: number;
  logo?: string;
  symbol?: string;
  name?: string;
}

interface Bundle {
  id: number;
  name: string;
  description: string;
  allocations: BundleAllocation[];
}

export default function MinimalistBundleHero() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredAsset, setHoveredAsset] = useState<string | null>(null);

  useEffect(() => {
    const loadBundles = async () => {
      try {
        const agent = new HttpAgent({ host: 'https://ic0.app' });
        const backend = Actor.createActor<_SERVICE>(idlFactory, {
          agent,
          canisterId: BACKEND_CANISTER_ID,
        });

        // Fetch bundles and assets in parallel
        const [bundleResults, assetInfos] = await Promise.all([
          Promise.all(FEATURED_BUNDLE_IDS.map(id => backend.get_bundle(BigInt(id)))),
          backend.list_assets([{
            payment_tokens_only: [],
            category: [],
            active_only: true,
          }])
        ]);

        console.log('[MinimalistBundleHero] Raw results:', bundleResults);
        console.log('[MinimalistBundleHero] Asset infos:', assetInfos);

        // Create asset map for quick lookup
        const assetMap = new Map(assetInfos.map(asset => [
          asset.id,
          {
            symbol: asset.symbol,
            name: asset.name,
            logo: asset.metadata.logo_url[0] || undefined,
          }
        ]));

        const loadedBundles: Bundle[] = bundleResults
          .filter(result => 'Ok' in result)
          .map((result: any) => {
            const bundle = result.Ok;
            console.log('[MinimalistBundleHero] Bundle:', bundle);
            return {
              id: Number(bundle.id),
              name: bundle.name,
              description: bundle.description[0] || bundle.description || '',
              allocations: (bundle.allocations || []).map((a: any) => {
                const assetInfo = assetMap.get(a.asset_id);
                return {
                  asset_id: a.asset_id,
                  percentage: Number(a.percentage),
                  logo: assetInfo?.logo,
                  symbol: assetInfo?.symbol || a.asset_id,
                  name: assetInfo?.name || a.asset_id,
                };
              }),
            };
          });

        console.log('[MinimalistBundleHero] Loaded bundles:', loadedBundles);
        setBundles(loadedBundles);
      } catch (error) {
        console.error('Failed to load bundles:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadBundles();
  }, []);
  return (
    <section className="relative bg-black overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      <div className="relative z-10 px-6">
        <div className="w-full max-w-7xl mx-auto">
          {/* Minimalist Header - Vertically Centered */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="text-center min-h-[80vh] flex flex-col items-center justify-center py-24"
          >
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-6 tracking-tight leading-none">
              Invest in Bundles,<br />Not Single Tokens
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12">
              Diversified crypto portfolios in one click
            </p>
            <div className="flex gap-4">
              <Link
                to="/bundles"
                className="inline-block bg-white text-black px-8 py-4 text-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Explore All Bundles
              </Link>
              <Link
                to="/build"
                className="inline-block border border-white/20 text-white px-8 py-4 text-lg font-medium hover:bg-white/10 transition-colors"
              >
                Create New Bundle
              </Link>
            </div>
          </motion.div>

          {/* Featured Bundles */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
            className="py-24"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-white">Featured Bundles</h2>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
              </div>
            ) : bundles.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">No featured bundles available</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {bundles.map((bundle, index) => (
                  <motion.div
                    key={bundle.id}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 + index * 0.1, ease: "easeOut" }}
                  >
                    <Link to={`/bundle/${bundle.id}`}>
                      <div className="bg-white/5 border border-white/10 p-6 hover:bg-white/10 hover:border-white/20 transition-all">
                        {/* Bundle Name */}
                        <h3 className="text-xl font-bold text-white mb-2">
                          {bundle.name}
                        </h3>

                        {/* Description */}
                        <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                          {bundle.description}
                        </p>

                        {/* Assets */}
                        <div className="mb-4">
                          <div className="text-xs text-gray-500 mb-2">Assets</div>
                          <div className="flex -space-x-2.5">
                            {bundle.allocations.slice(0, 5).map((asset, idx) => (
                              <div
                                key={asset.asset_id}
                                className="relative"
                                onMouseEnter={() => setHoveredAsset(`${bundle.id}-${asset.asset_id}`)}
                                onMouseLeave={() => setHoveredAsset(null)}
                              >
                                <div
                                  className="w-10 h-10 rounded-full bg-white/10 border-2 border-black flex items-center justify-center hover:border-white/20 transition-colors overflow-hidden cursor-pointer"
                                  style={{ zIndex: bundle.allocations.length - idx }}
                                >
                                  {asset.logo ? (
                                    <img
                                      src={asset.logo}
                                      alt={asset.symbol}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const parent = target.parentElement;
                                        if (parent) {
                                          parent.innerHTML = `<span class="text-xs text-white font-bold">${(asset.symbol || asset.asset_id).slice(0, 2)}</span>`;
                                        }
                                      }}
                                    />
                                  ) : (
                                    <span className="text-xs text-white font-bold">
                                      {(asset.symbol || asset.asset_id).slice(0, 2)}
                                    </span>
                                  )}
                                </div>
                                {hoveredAsset === `${bundle.id}-${asset.asset_id}` && (
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black border border-white/20 whitespace-nowrap z-50 pointer-events-none">
                                    <div className="text-white text-xs font-bold">{asset.symbol || asset.asset_id}</div>
                                    <div className="text-gray-400 text-[10px]">{asset.percentage.toFixed(1)}%</div>
                                  </div>
                                )}
                              </div>
                            ))}
                            {bundle.allocations.length > 5 && (
                              <div
                                className="w-10 h-10 rounded-full bg-white/10 border-2 border-black flex items-center justify-center text-xs text-gray-400"
                                style={{ zIndex: 0 }}
                              >
                                +{bundle.allocations.length - 5}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* CTA */}
                        <div className="flex gap-2 pt-4 border-t border-white/10">
                          <div className="flex-1 bg-white/10 hover:bg-white/20 text-white px-4 py-2 text-sm text-center transition-colors">
                            View
                          </div>
                          <div className="flex-1 bg-white text-black hover:bg-gray-200 px-4 py-2 text-sm font-medium text-center transition-colors">
                            Buy
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
