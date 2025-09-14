import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
import { TrendingUp, TrendingDown, BarChart3, PieChart, Trophy } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { backendService } from '../lib/backend';
import SubscribeModal from '../components/competition/SubscribeModal';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';



export default function BundleDetails() {
  const { id } = useParams<{ id: string }>();
  const [bundle, setBundle] = useState<any>(null);
  const [bundleAssets, setBundleAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'composition' | 'statistics'>('composition');
  const [selectedPeriod, setSelectedPeriod] = useState<'1D' | '7D' | '30D' | '90D' | '1Y'>('1D');
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const { isAuthenticated, login } = useAuth();

  useEffect(() => {
    const loadBundleDetails = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const [bundleData, allAssets] = await Promise.all([
          backendService.getBundle(id),
          backendService.getActiveAssets()
        ]);
        
        // Create asset lookup map
        const assetMap = new Map(allAssets.map(asset => [asset.id, asset]));
        
        // Calculate real bundle price from asset prices and allocations
        const calculatedPrice = bundleData.assets.reduce((total: number, asset: any) => {
          const assetDetails = assetMap.get(asset.asset_id);
          const assetPrice = assetDetails?.current_price || 0;
          const allocation = asset.allocation_percentage / 100; // Convert percentage to decimal
          return total + (assetPrice * allocation);
        }, 0);

        // Transform bundle assets to include asset details and real values
        const transformedAssets = bundleData.assets.map((bundleAsset: any) => {
          const assetDetails = assetMap.get(bundleAsset.asset_id);
          const assetPrice = assetDetails?.current_price || 0;
          const allocation = bundleAsset.allocation_percentage / 100;
          return {
            symbol: assetDetails?.symbol || bundleAsset.asset_id,
            name: assetDetails?.name || bundleAsset.asset_id,
            percentage: bundleAsset.allocation_percentage,
            amount: 0, // Will calculate based on bundle value
            value: assetPrice * allocation, // Real value based on current asset price
            color: getAssetColor(assetDetails?.symbol || bundleAsset.asset_id),
            logo: assetDetails?.logo_url || ''
          };
        });
        
        // Update bundle data with calculated price
        setBundle({ ...bundleData, calculated_price: calculatedPrice });
        setBundleAssets(transformedAssets);
      } catch (err) {
        console.error('Failed to load bundle details:', err);
        setError('Failed to load bundle details');
      } finally {
        setLoading(false);
      }
    };
    
    loadBundleDetails();
  }, [id]);

  // Helper function to get asset colors
  function getAssetColor(symbol: string) {
    const tokenColors: Record<string, string> = {
      'BTC': '#f7931a',
      'ETH': '#627eea', 
      'SOL': '#9945ff',
      'AAVE': '#b6509e',
      'UNI': '#ff007a',
      'LINK': '#2a5ada',
      'DOGE': '#c2a633',
      'ADA': '#0033ad',
      'DOT': '#e6007a',
      'AVAX': '#e84142',
      'MATIC': '#8247e5',
      'ATOM': '#2e3148',
    };
    return tokenColors[symbol] || '#6366f1';
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-primary">Loading bundle details...</div>
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <div className="text-red-400">{error || 'Bundle not found'}</div>
        <Link to="/bundles" className="btn-outline-unique">
          Back to Bundles
        </Link>
      </div>
    );
  }

  // Use real bundle data with fallbacks for display
  const bundleDetails = {
    id: bundle.id,
    name: bundle.name,
    symbol: bundle.name.replace(/\s+/g, '').substring(0, 4).toUpperCase(),
    description: bundle.description,
    creator: bundle.creator,
    createdAt: new Date(Number(bundle.created_at) / 1000000).toISOString().split('T')[0],
    price: bundle.calculated_price || bundle.total_value_usd || 0,
    change24h: bundle.performance_24h || 0,
    volume24h: 0, // Not available yet
    marketCap: bundle.total_value_usd * 1000 || 0, // Estimate 
    holders: bundle.subscribers || 0,
    totalSupply: 1000000, // Placeholder
    assets: bundleAssets,
    performance: {
      '1D': bundle.performance_24h || 0,
      '7D': bundle.performance_24h * 3 || 0, // Placeholder multipliers
      '30D': bundle.performance_24h * 8 || 0,
      '90D': bundle.performance_24h * 15 || 0,
      '1Y': bundle.performance_24h * 50 || 0,
    },
    priceHistory: (() => {
      // Generate price history based on calculated price
      const basePrice = bundle.calculated_price || bundle.total_value_usd || 100;
      const endPrice = basePrice * (1 + (bundle.performance_24h || 0) / 100);
      const points = 24;
      const data = [];
      
      for (let i = 0; i <= points; i++) {
        const progress = i / points;
        const variance = (Math.random() - 0.5) * 0.1 * basePrice;
        const price = basePrice + (endPrice - basePrice) * progress + variance;
        data.push({
          time: `${Math.floor(i)}:00`,
          price: Math.max(0, price)
        });
      }
      
      data[data.length - 1].price = endPrice;
      return data;
    })(),
  };

  const isPositive = bundleDetails.change24h >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="px-6 py-8">
      {/* Bundle Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-elevated border border-primary flex items-center justify-center">
            <span className="text-primary font-bold text-lg text-data">
              {bundleDetails.symbol}
            </span>
          </div>
          <div>
            <h1 className="heading-large">{bundleDetails.name}</h1>
            <p className="text-tertiary">Bundle Token • Created {bundleDetails.createdAt}</p>
          </div>
        </div>
        
        <p className="text-body max-w-3xl">
          {bundleDetails.description}
        </p>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="asymmetric-grid gap-8">
          {/* Left Column - Main Content */}
          <div className="space-y-8">
            {/* Price & Performance */}
            <div className="card-unique p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="text-3xl font-bold text-primary text-data mb-2">
                    ${bundleDetails.price.toFixed(2)}
                  </div>
                  <div className={`flex items-center gap-2 text-sm font-semibold ${
                    isPositive ? 'text-green-400' : 'text-red-400'
                  }`}>
                    <TrendIcon className="w-4 h-4" />
                    {isPositive ? '+' : ''}{bundleDetails.change24h.toFixed(2)}% (24h)
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {Object.keys(bundleDetails.performance).map((period) => (
                    <button
                      key={period}
                      onClick={() => setSelectedPeriod(period as any)}
                      className={`px-3 py-1 text-xs font-mono transition-colors ${
                        selectedPeriod === period
                          ? 'bg-accent text-primary'
                          : 'text-tertiary hover:text-primary'
                      }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Chart */}
              <div className="h-64 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bundleDetails.priceHistory}>
                    <XAxis 
                      dataKey="time" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#8b949e' }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#8b949e' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="price" 
                      stroke="#ffffff" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
                
                {/* Chart Overlay */}
                <div className="absolute inset-0 bg-surface/60 backdrop-blur-sm flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-primary font-medium mb-1">Chart data will be available soon</div>
                    <div className="text-tertiary text-sm">Live data coming after launch</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="card-unique">
              <div className="border-b border-primary">
                <div className="flex">
                  {                  [
                    { key: 'composition', label: 'Composition', icon: PieChart },
                    { key: 'statistics', label: 'Statistics', icon: BarChart3 },
                  ].map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key as any)}
                      className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                        activeTab === key
                          ? 'text-primary border-b border-accent'
                          : 'text-tertiary hover:text-primary'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6">
                {activeTab === 'statistics' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="heading-medium mb-3">About This Bundle</h3>
                      <p className="text-body">{bundleDetails.description}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <div className="text-ghost text-xs mb-2 font-mono">SUBSCRIBERS</div>
                        <div className="text-xl font-bold text-primary text-data">
                          {bundleDetails.holders.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-ghost text-xs mb-2 font-mono">COMPETITION RANK</div>
                        <div className="text-xl font-bold text-primary text-data">
                          #3
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'composition' && (
                  <div className="space-y-6">
                    <h3 className="heading-medium mb-4">Asset Allocation</h3>
                    {bundleDetails.assets.map((asset, idx) => (
                      <div key={asset.symbol} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-sm" 
                              style={{ backgroundColor: asset.color }}
                            />
                            <div>
                              <span className="text-primary font-medium">{asset.name}</span>
                              <span className="text-tertiary text-sm ml-2 font-mono">{asset.symbol}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-primary font-bold text-data">{asset.percentage}%</div>
                            <div className="text-tertiary text-sm">${(asset.value / 1000).toFixed(1)}K</div>
                          </div>
                        </div>
                        <div className="w-full h-1 bg-border-primary relative">
                          <motion.div
                            className="absolute top-0 left-0 h-full rounded-sm"
                            style={{ backgroundColor: asset.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${asset.percentage}%` }}
                            transition={{ duration: 1, delay: idx * 0.1 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}


              </div>
            </div>
          </div>

          {/* Right Column - Subscribe Panel */}
          <div className="space-y-6">

            {/* Subscribe Panel */}
            <div className="card-unique p-6">
              <h3 className="heading-medium mb-6">Subscribe to {bundleDetails.symbol}</h3>
              
              <div className="space-y-4">
                <div className="bg-elevated border border-primary p-4 rounded">
                  <div className="text-primary text-sm font-medium mb-2 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-accent" />
                    Competition Entry
                  </div>
                  <p className="text-secondary text-xs">
                    Subscribe to enter the launch competition and win up to $500!
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-accent mb-1">🏆</div>
                    <div className="text-primary font-semibold">Win Prizes</div>
                    <div className="text-tertiary text-sm">Join the competition</div>
                  </div>
                </div>
                
                <button 
                  onClick={() => setShowSubscribeModal(true)}
                  className="btn-unique w-full py-3 flex items-center justify-center gap-2"
                >
                  <Trophy className="w-4 h-4" />
                  SUBSCRIBE & ENTER
                </button>
                
                <div className="text-center">
                  <div className="text-xs text-tertiary">
                    Requires Internet Identity login
                  </div>
                </div>
              </div>
            </div>

            {/* Creator Info */}
            <div className="card-unique p-6">
              <h3 className="heading-medium mb-4">Creator</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-elevated border border-primary rounded flex items-center justify-center">
                    <span className="text-primary font-bold text-xs">
                      {bundleDetails.creator.slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <div className="text-primary font-medium">{bundleDetails.creator}</div>
                    <div className="text-tertiary text-sm">Bundle Creator</div>
                  </div>
                </div>
                

              </div>
            </div>
          </div>
                </div>
      </div>

      {/* Subscribe Modal */}
      <SubscribeModal
        isOpen={showSubscribeModal}
        onClose={() => setShowSubscribeModal(false)}
        bundle={{
          id: bundleDetails.id,
          name: bundleDetails.name,
          symbol: bundleDetails.symbol,
          description: bundleDetails.description,
          creator: bundleDetails.creator,
          assets: bundleDetails.assets.map(asset => ({
            symbol: asset.symbol,
            percentage: asset.percentage,
            color: asset.color
          })),
          price: bundleDetails.price,
          change: bundleDetails.change24h,
          holders: bundleDetails.holders,
          tvl: bundleDetails.marketCap / 1000000
        }}
        isAuthenticated={isAuthenticated}
        onLogin={() => { void login(); }}
      />
    </div>
  );
} 