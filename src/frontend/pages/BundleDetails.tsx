import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
import { TrendingUp, TrendingDown, BarChart3, PieChart, ArrowUpDown, Loader2 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { backendService } from '../lib/backend-service';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';

// Helper function to get mock prices for assets
const getMockPrice = (assetId: string): number => {
  const prices: Record<string, number> = {
    'BTC': 65000,
    'ckBTC': 65000,
    'ETH': 3500,
    'ckETH': 3500,
    'USDC': 1,
    'ckUSDC': 1
  };
  return prices[assetId] || 1;
};

export default function BundleDetails() {
  const { id } = useParams<{ id: string }>();
  const [bundle, setBundle] = useState<any>(null);
  const [bundleAssets, setBundleAssets] = useState<any[]>([]);
  const [bundleNav, setBundleNav] = useState<any>(null);
  const [holderCount, setHolderCount] = useState<number>(0);
  const [bundleHoldings, setBundleHoldings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'composition' | 'statistics'>('composition');
  const [selectedPeriod, setSelectedPeriod] = useState<'1D' | '7D' | '30D' | '90D' | '1Y'>('1D');
  const [tradeTab, setTradeTab] = useState<'buy' | 'sell'>('buy');
  const [tradeAmount, setTradeAmount] = useState<string>('');
  const [isTrading, setIsTrading] = useState(false);
  const { isAuthenticated, login } = useAuth();

  useEffect(() => {
    const loadBundleDetails = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

        const bundles = await backendService.listBundles();
        const foundBundle = bundles.find((b: any) => b.id.toString() === id);

        if (!foundBundle) {
          setError('Bundle not found');
          return;
        }

        const allAssets = await backendService.listAssets();
        const assetMap = new Map(allAssets.map((asset: any) => [asset.id, asset]));

        // Get real NAV data from backend
        let navData = null;
        let holders = 0;
        try {
          navData = await backendService.calculateBundleNav(Number(id));
          holders = await backendService.getBundleHolderCount(Number(id));
        } catch (err) {
          console.log('NAV calculation not available yet (no holdings)');
        }

        setBundleNav(navData);
        setHolderCount(holders);
        setBundleHoldings([]); // We'll get holdings from NAV data instead

        // Calculate price per NAV token
        const navPerToken = navData ? Number(navData.nav_per_token) / 100000000 : 1; // Default to $1 if no NAV data

        // Extract oracle prices from NAV data if available
        const assetPrices: Record<string, number> = {};
        if (navData && navData.asset_values) {
          // NAV data includes real oracle prices for each asset
          navData.asset_values.forEach((assetValue: any) => {
            // Calculate price from value and amount
            if (assetValue.amount > 0) {
              const price = Number(assetValue.value_usd) / Number(assetValue.amount);
              assetPrices[assetValue.asset_id] = price;
              console.log(`Oracle price for ${assetValue.asset_id}: $${price.toFixed(2)}`);
            }
          });
        }

        // Transform assets with real or estimated values
        const transformedAssets = navData && navData.asset_values && navData.asset_values.length > 0
          ? navData.asset_values.map((assetValue: any) => {
              const assetDetails = assetMap.get(assetValue.asset_id);
              return {
                symbol: assetDetails?.symbol || assetValue.asset_id,
                name: assetDetails?.name || assetValue.asset_id,
                percentage: assetValue.percentage,
                value: Number(assetValue.value_usd) / 100000000, // Convert from 8 decimals
                amount: Number(assetValue.amount) / 100000000,
                price: assetPrices[assetValue.asset_id] || 0,
                color: getAssetColor(assetDetails?.symbol || assetValue.asset_id),
                logo: assetDetails?.metadata?.logo_url || ''
              };
            })
          : foundBundle.allocations.map((allocation: any) => {
              const assetDetails = assetMap.get(allocation.asset_id);
              return {
                symbol: assetDetails?.symbol || allocation.asset_id,
                name: assetDetails?.name || allocation.asset_id,
                percentage: allocation.percentage,
                value: 0, // No holdings yet
                amount: 0,
                price: 0, // Will show once there are holdings
                color: getAssetColor(assetDetails?.symbol || allocation.asset_id),
                logo: assetDetails?.metadata?.logo_url || ''
              };
            });

        setBundle({
          ...foundBundle,
          calculated_price: navPerToken,
          total_nav_usd: navData ? Number(navData.total_nav_usd) / 100000000 : 0,
          total_tokens: navData ? Number(navData.total_tokens) / 100000000 : 0
        });
        setBundleAssets(transformedAssets);
      } catch (err) {
        console.error('Failed to load bundle details:', err);
        setError('Failed to load bundle details');
      } finally {
        setLoading(false);
      }
    };

    void loadBundleDetails();
  }, [id]);

  function getAssetColor(symbol: string) {
    const tokenColors: Record<string, string> = {
      'BTC': '#f7931a',
      'ckBTC': '#f7931a',
      'ETH': '#627eea',
      'ckETH': '#627eea',
      'USDC': '#2775ca',
      'ckUSDC': '#2775ca',
      'ICP': '#29abe2',
      'GOLD': '#ffd700',
    };
    return tokenColors[symbol] || '#6366f1';
  }

  const handleTrade = async () => {
    if (!tradeAmount || parseFloat(tradeAmount) <= 0) return;

    setIsTrading(true);
    try {
      if (tradeTab === 'buy') {
        const quote = await backendService.requestBuyQuote(
          Number(id),
          parseFloat(tradeAmount) * 1000000
        );
        console.log('Buy quote:', quote);
      } else {
        const quote = await backendService.requestSellQuote(
          Number(id),
          parseFloat(tradeAmount) * 100
        );
        console.log('Sell quote:', quote);
      }

      setTradeAmount('');
    } catch (err) {
      console.error('Trade failed:', err);
    } finally {
      setIsTrading(false);
    }
  };

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

  const bundleDetails = {
    id: bundle.id,
    name: bundle.name,
    symbol: bundle.name.replace(/\s+/g, '').substring(0, 4).toUpperCase(),
    description: bundle.description,
    creator: bundle.creator,
    createdAt: bundle.created_at ? new Date(Number(bundle.created_at) / 1000000).toISOString().split('T')[0] : 'Unknown',
    price: bundle.calculated_price || 1,
    change24h: 0, // No price history yet
    volume24h: 0, // Will be tracked later
    marketCap: bundle.total_nav_usd || 0,
    holders: holderCount,
    totalSupply: bundle.total_tokens || 0,
    assets: bundleAssets,
    performance: {
      '1D': Math.random() * 10 - 5,
      '7D': Math.random() * 20 - 10,
      '30D': Math.random() * 30 - 15,
      '90D': Math.random() * 50 - 25,
      '1Y': Math.random() * 100 - 50,
    },
    priceHistory: (() => {
      const basePrice = bundle.calculated_price || 100;
      const points = 24;
      const data = [];

      for (let i = 0; i <= points; i++) {
        const variance = (Math.random() - 0.5) * 0.1 * basePrice;
        const price = basePrice + variance;
        data.push({
          time: `${Math.floor(i)}:00`,
          price: Math.max(0, price)
        });
      }

      return data;
    })(),
  };

  const isPositive = bundleDetails.change24h >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="px-6 py-8">
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

        {bundleDetails.description && (
          <p className="text-body max-w-3xl">
            {bundleDetails.description}
          </p>
        )}
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="asymmetric-grid gap-8">
          <div className="space-y-8">
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

                <div className="absolute inset-0 bg-surface/60 backdrop-blur-sm flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-primary font-medium mb-1">Chart data will be available soon</div>
                    <div className="text-tertiary text-sm">Live data coming after launch</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-unique">
              <div className="border-b border-primary">
                <div className="flex">
                  {[
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
                      <p className="text-body">{bundleDetails.description || 'No description available'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <div className="text-ghost text-xs mb-2 font-mono">HOLDERS</div>
                        <div className="text-xl font-bold text-primary text-data">
                          {bundleDetails.holders.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-ghost text-xs mb-2 font-mono">VOLUME 24H</div>
                        <div className="text-xl font-bold text-primary text-data">
                          ${(bundleDetails.volume24h / 1000).toFixed(1)}K
                        </div>
                      </div>
                      <div>
                        <div className="text-ghost text-xs mb-2 font-mono">MARKET CAP</div>
                        <div className="text-xl font-bold text-primary text-data">
                          ${(bundleDetails.marketCap / 1000).toFixed(1)}K
                        </div>
                      </div>
                      <div>
                        <div className="text-ghost text-xs mb-2 font-mono">TOTAL SUPPLY</div>
                        <div className="text-xl font-bold text-primary text-data">
                          {(bundleDetails.totalSupply / 1000000).toFixed(1)}M
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'composition' && (
                  <div className="space-y-6">
                    <h3 className="heading-medium mb-4">Asset Allocation</h3>

                    {bundleNav && bundleNav.total_nav_usd > 0 && (
                      <div className="bg-elevated border border-primary p-4 rounded mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-secondary text-sm">Total Treasury Value</span>
                          <span className="text-primary font-bold text-lg">
                            ${(Number(bundleNav.total_nav_usd) / 100000000).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-secondary text-sm">NAV Tokens Outstanding</span>
                          <span className="text-primary font-mono">
                            {(Number(bundleNav.total_tokens) / 100000000).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
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
                              {asset.price > 0 && (
                                <span className="text-accent text-sm ml-3">
                                  @ ${asset.price.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-primary font-bold text-data">
                              {asset.percentage ? asset.percentage.toFixed(1) : asset.percentage}%
                            </div>
                            <div className="text-tertiary text-sm">
                              {asset.value > 0 ? `$${asset.value.toFixed(2)}` : 'No holdings yet'}
                            </div>
                            {asset.amount > 0 && (
                              <div className="text-tertiary text-xs">
                                {asset.amount.toLocaleString()} {asset.symbol}
                              </div>
                            )}
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

          <div className="space-y-6">
            {/* Trading Widget */}
            <div className="card-unique p-6">
              <div className="flex mb-4">
                {['buy', 'sell'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setTradeTab(mode as 'buy' | 'sell')}
                    className={`flex-1 py-3 text-sm font-bold uppercase transition-all ${
                      tradeTab === mode
                        ? mode === 'buy'
                          ? 'bg-green-500/20 text-green-400 border-b-2 border-green-400'
                          : 'bg-red-500/20 text-red-400 border-b-2 border-red-400'
                        : 'text-tertiary hover:text-primary'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-secondary text-sm mb-2">
                    {tradeTab === 'buy' ? 'You Pay (USDC)' : 'You Sell (NAV)'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={tradeAmount}
                      onChange={(e) => setTradeAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-elevated border border-primary p-3 pr-16 text-primary text-lg rounded focus:border-accent focus:outline-none"
                      disabled={isTrading}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary text-sm">
                      {tradeTab === 'buy' ? 'USDC' : 'NAV'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-center py-2">
                  <ArrowUpDown className="w-5 h-5 text-tertiary" />
                </div>

                <div>
                  <label className="block text-secondary text-sm mb-2">
                    {tradeTab === 'buy' ? 'You Receive (NAV)' : 'You Receive (USDC)'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={
                        tradeAmount
                          ? tradeTab === 'buy'
                            ? (parseFloat(tradeAmount) / bundleDetails.price).toFixed(4)
                            : (parseFloat(tradeAmount) * bundleDetails.price).toFixed(2)
                          : ''
                      }
                      readOnly
                      placeholder="0.00"
                      className="w-full bg-surface border border-primary p-3 pr-16 text-primary text-lg rounded cursor-not-allowed"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary text-sm">
                      {tradeTab === 'buy' ? 'NAV' : 'USDC'}
                    </span>
                  </div>
                </div>

                <div className="bg-elevated border border-primary p-3 rounded">
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Price per NAV</span>
                    <span className="text-primary font-mono">${bundleDetails.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-secondary">Slippage</span>
                    <span className="text-primary font-mono">0.5%</span>
                  </div>
                </div>

                {isAuthenticated ? (
                  <button
                    onClick={() => void handleTrade()}
                    disabled={!tradeAmount || parseFloat(tradeAmount) <= 0 || isTrading}
                    className={`w-full py-3 font-bold uppercase transition-all flex items-center justify-center gap-2 ${
                      tradeTab === 'buy'
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50'
                        : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-50'
                    }`}
                  >
                    {isTrading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `${tradeTab === 'buy' ? 'Buy' : 'Sell'} ${bundleDetails.name}`
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => void login()}
                    className="btn-unique w-full py-3"
                  >
                    Connect Wallet
                  </button>
                )}
              </div>
            </div>

            {/* Bundle Metrics */}
            <div className="card-unique p-6">
              <h3 className="heading-medium mb-4">Bundle Metrics</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-secondary text-sm">Total Holders</span>
                  <span className="text-primary font-bold text-data">
                    {holderCount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-secondary text-sm">Treasury Value</span>
                  <span className="text-primary font-bold text-data">
                    ${bundle?.total_nav_usd ? bundle.total_nav_usd.toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-secondary text-sm">NAV Tokens</span>
                  <span className="text-primary font-mono text-data">
                    {bundle?.total_tokens ? bundle.total_tokens.toLocaleString() : '0'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-secondary text-sm">Price per NAV</span>
                  <span className="text-primary font-bold text-data">
                    ${bundle?.calculated_price ? bundle.calculated_price.toFixed(4) : '1.0000'}
                  </span>
                </div>
              </div>
            </div>

            <div className="card-unique p-6">
              <h3 className="heading-medium mb-4">Creator</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-elevated border border-primary rounded flex items-center justify-center">
                    <span className="text-primary font-bold text-xs">
                      {bundleDetails.creator ? bundleDetails.creator.toString().slice(0, 2) : 'AN'}
                    </span>
                  </div>
                  <div>
                    <div className="text-primary font-medium text-xs font-mono">
                      {bundleDetails.creator ?
                        (() => {
                          const creatorStr = bundleDetails.creator.toString();
                          return `${creatorStr.slice(0, 6)}...${creatorStr.slice(-4)}`;
                        })()
                        : 'Anonymous'}
                    </div>
                    <div className="text-tertiary text-sm">Bundle Creator</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}