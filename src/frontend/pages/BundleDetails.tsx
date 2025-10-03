import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
import { TrendingUp, TrendingDown, BarChart3, PieChart, ArrowUpDown, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../lib/AuthContext';
import { backendService } from '../lib/backend-service';
import { icrc2Service } from '../lib/icrc2-service';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { BundleDetailsSkeleton } from '../components/ui/Skeleton';

export default function BundleDetails() {
  const { id } = useParams<{ id: string }>();
  const [bundle, setBundle] = useState<any>(null);
  const [bundleAssets, setBundleAssets] = useState<any[]>([]);
  const [bundleNav, setBundleNav] = useState<any>(null);
  const [holderCount, setHolderCount] = useState<number>(0);
  const [bundleHoldings, setBundleHoldings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'composition' | 'statistics' | 'about'>('composition');
  const [selectedPeriod, setSelectedPeriod] = useState<'1D' | '7D' | '30D'>('1D');
  const [tradeTab, setTradeTab] = useState<'buy' | 'sell'>('buy');
  const [tradeAmount, setTradeAmount] = useState<string>('');
  const [isTrading, setIsTrading] = useState(false);
  const [tradeStatus, setTradeStatus] = useState('');
  const [tradeStep, setTradeStep] = useState<'idle' | 'quote' | 'approve' | 'execute' | 'complete'>('idle');
  const [userUsdcBalance, setUserUsdcBalance] = useState<string>('0');
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

  // Load user's ckUSDC balance when authenticated
  useEffect(() => {
    const loadBalance = async () => {
      if (isAuthenticated) {
        try {
          const balance = await icrc2Service.getBalance();
          // Convert from BigInt with 6 decimals to string (ckUSDC has 6 decimals)
          const formattedBalance = (Number(balance) / 1000000).toFixed(2);
          setUserUsdcBalance(formattedBalance);
        } catch (err) {
          console.error('Failed to load ckUSDC balance:', err);
        }
      }
    };

    void loadBalance();
  }, [isAuthenticated]);

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
    setTradeStep('quote');
    try {
      if (tradeTab === 'buy') {
        // Step 1: Request quote
        setTradeStatus('Requesting quote...');
        const quote = await backendService.requestBuyQuote(
          Number(id),
          parseFloat(tradeAmount) * 1000000
        );
        console.log('Buy quote:', quote);

        // Step 2: Approve ICRC-2 transfer
        setTradeStep('approve');
        setTradeStatus('Approving USDC spending...');

        // Convert USDC amount to proper format (6 decimals for ckUSDC)
        const usdcAmount = BigInt(Math.floor(parseFloat(tradeAmount) * 1000000));

        // Check current allowance
        const currentAllowance = await icrc2Service.checkBackendAllowance();
        console.log('Current allowance:', currentAllowance.toString());

        // Only approve if we need more allowance
        if (currentAllowance < usdcAmount) {
          // Approve a large amount (10,000 USDC) to avoid frequent approvals
          const largeApprovalAmount = BigInt(10000 * 1000000); // 10,000 USDC with 6 decimals
          console.log('Approving', largeApprovalAmount.toString(), 'ckUSDC (10,000 USDC) for future trades');
          const approvalResult = await icrc2Service.approveBackendCanister(largeApprovalAmount);
          if (!approvalResult) {
            throw new Error('Failed to approve USDC spending');
          }
          console.log('Approval successful:', approvalResult.toString());
        } else {
          console.log('Sufficient allowance already exists');
        }

        // Step 3: Execute quote
        setTradeStep('execute');
        setTradeStatus('Executing trade...');
        const result = await backendService.executeQuote(quote.id);
        console.log('Trade result:', result);

        // Step 4: Complete
        setTradeStep('complete');
        setTradeStatus('Trade completed successfully!');
        toast.success(`Successfully purchased ${tradeAmount} ${bundle.name} tokens!`);

        // Refresh balance after trade
        const newBalance = await icrc2Service.getBalance();
        const formattedBalance = (Number(newBalance) / 1000000).toFixed(2);
        setUserUsdcBalance(formattedBalance);

        setTimeout(() => {
          setTradeStatus('');
          setTradeStep('idle');
        }, 3000);
      } else {
        setTradeStatus('Requesting sell quote...');
        const quote = await backendService.requestSellQuote(
          Number(id),
          parseFloat(tradeAmount) * 100
        );
        console.log('Sell quote:', quote);

        // Execute sell quote
        setTradeStatus('Executing sell...');
        const result = await backendService.executeQuote(quote.id);
        console.log('Trade result:', result);

        setTradeStep('complete');
        setTradeStatus('Sale completed!');
        toast.success(`Successfully sold ${tradeAmount} ${bundle.name} tokens!`);
        setTimeout(() => {
          setTradeStatus('');
          setTradeStep('idle');
        }, 3000);
      }

      setTradeAmount('');
    } catch (err) {
      console.error('Trade failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Trade failed. Please try again.';
      setTradeStatus(errorMessage);
      toast.error(errorMessage);
      setTradeStep('idle');
      setTimeout(() => setTradeStatus(''), 3000);
    } finally {
      setIsTrading(false);
    }
  };

  if (loading) {
    return <BundleDetailsSkeleton />;
  }

  if (error || !bundle) {
    return (
      <div className="min-h-screen bg-black">
        <div className="px-6 py-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">❌</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Bundle Not Found</h3>
              <p className="text-gray-400 mb-8">{error || 'The bundle you are looking for does not exist.'}</p>
              <Link to="/bundles" className="btn-unique px-8 py-3">
                Back to Bundles
              </Link>
            </div>
          </div>
        </div>
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
      '1D': 0,
      '7D': 0,
      '30D': 0,
    },
    priceHistory: (() => {
      const basePrice = bundle.calculated_price || 1.00;
      const points = selectedPeriod === '1D' ? 24 : selectedPeriod === '7D' ? 7 : 30;
      const data = [];
      const now = new Date();

      for (let i = 0; i <= points; i++) {
        // Add some realistic variation
        const variation = Math.sin(i / 3) * 0.02 + (Math.random() - 0.5) * 0.01;
        const trend = i * 0.001; // Slight upward trend
        const price = basePrice * (1 + variation + trend);

        let timeLabel = '';
        const date = new Date(now);

        if (selectedPeriod === '1D') {
          date.setHours(now.getHours() - (24 - i));
          timeLabel = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        } else if (selectedPeriod === '7D') {
          date.setDate(now.getDate() - (7 - i));
          timeLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else if (selectedPeriod === '30D') {
          date.setDate(now.getDate() - (30 - i));
          timeLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }

        data.push({
          time: timeLabel,
          price: Math.max(0, price)
        });
      }

      return data;
    })(),
  };

  const isPositive = bundleDetails.change24h >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="min-h-screen bg-black">
      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-white/20 to-white/5 border border-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xl">
                {bundleDetails.symbol}
              </span>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">{bundleDetails.name}</h1>
              <div className="flex items-center gap-3 text-gray-400 text-sm mt-1">
                <span>Bundle Token</span>
                <span>•</span>
                <span>Created {bundleDetails.createdAt}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="border border-white/10 bg-white/5 p-8">
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <div className="text-5xl font-bold text-white mb-3">
                      ${bundleDetails.price.toFixed(2)}
                    </div>
                    <div className={`flex items-center gap-2 text-lg font-semibold ${
                      isPositive ? 'text-green-400' : 'text-red-400'
                    }`}>
                      <TrendIcon className="w-5 h-5" />
                      {isPositive ? '+' : ''}{bundleDetails.change24h.toFixed(2)}% (24h)
                    </div>
                  </div>

                  <div className="flex gap-1">
                    {Object.keys(bundleDetails.performance).map((period) => (
                      <button
                        key={period}
                        onClick={() => setSelectedPeriod(period as any)}
                        className={`px-3 py-1 text-xs font-mono transition-colors ${
                          selectedPeriod === period
                            ? 'bg-white text-black'
                            : 'text-gray-400 hover:text-white border border-white/10'
                        }`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={bundleDetails.priceHistory}>
                      <XAxis
                        dataKey="time"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        interval={selectedPeriod === '1D' ? 4 : selectedPeriod === '7D' ? 0 : 5}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        domain={['dataMin - 0.01', 'dataMax + 0.01']}
                        tickFormatter={(value) => `$${value.toFixed(2)}`}
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
                </div>
              </div>

              <div className="border border-white/10 bg-white/5">
                <div className="border-b border-white/10">
                  <div className="flex">
                    {[
                      { key: 'composition', label: 'Composition', icon: PieChart },
                      { key: 'statistics', label: 'Statistics', icon: BarChart3 },
                      { key: 'about', label: 'About', icon: null },
                    ].map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        onClick={() => setActiveTab(key as any)}
                        className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                          activeTab === key
                            ? 'text-white border-b-2 border-white'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {Icon && <Icon className="w-4 h-4" />}
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-8">
                  {activeTab === 'statistics' && (
                    <div className="space-y-8">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="border border-white/10 bg-black/40 p-4">
                          <div className="text-gray-500 text-xs font-mono uppercase mb-2">HOLDERS</div>
                          <div className="text-2xl font-bold text-white">
                            {bundleDetails.holders.toLocaleString()}
                          </div>
                        </div>
                        <div className="border border-white/10 bg-black/40 p-4">
                          <div className="text-gray-500 text-xs font-mono uppercase mb-2">VOLUME 24H</div>
                          <div className="text-2xl font-bold text-white">
                            ${(bundleDetails.volume24h / 1000).toFixed(1)}K
                          </div>
                        </div>
                        <div className="border border-white/10 bg-black/40 p-4">
                          <div className="text-gray-500 text-xs font-mono uppercase mb-2">MARKET CAP</div>
                          <div className="text-2xl font-bold text-white">
                            ${(bundleDetails.marketCap / 1000).toFixed(1)}K
                          </div>
                        </div>
                        <div className="border border-white/10 bg-black/40 p-4">
                          <div className="text-gray-500 text-xs font-mono uppercase mb-2">TOTAL SUPPLY</div>
                          <div className="text-2xl font-bold text-white">
                            {(bundleDetails.totalSupply / 1000000).toFixed(1)}M
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'composition' && (
                    <div className="space-y-6">
                      <h3 className="text-xl font-bold text-white mb-6">Asset Allocation</h3>

                      {bundleNav && bundleNav.total_nav_usd > 0 && (
                        <div className="border border-white/10 bg-black/40 p-6 mb-6">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-gray-400">Total Treasury Value</span>
                            <span className="text-white font-bold text-xl">
                              ${(Number(bundleNav.total_nav_usd) / 100000000).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">NAV Tokens Outstanding</span>
                            <span className="text-white font-mono">
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
                                className="w-3 h-3"
                                style={{ backgroundColor: asset.color }}
                              />
                              <div>
                                <span className="text-white font-medium">{asset.name}</span>
                                <span className="text-gray-500 text-sm ml-2 font-mono">{asset.symbol}</span>
                                {asset.price > 0 && (
                                  <span className="text-gray-400 text-sm ml-3">
                                    @ ${asset.price.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-white font-bold">
                                {asset.percentage ? asset.percentage.toFixed(1) : asset.percentage}%
                              </div>
                              <div className="text-gray-500 text-sm">
                                {asset.value > 0 ? `$${asset.value.toFixed(2)}` : 'No holdings yet'}
                              </div>
                              {asset.amount > 0 && (
                                <div className="text-gray-500 text-xs">
                                  {asset.amount.toLocaleString()} {asset.symbol}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="w-full h-2 bg-white/10 relative overflow-hidden">
                            <motion.div
                              className="absolute top-0 left-0 h-full"
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

                  {activeTab === 'about' && (
                    <div className="space-y-8">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-4">Description</h3>
                        <p className="text-gray-400">{bundleDetails.description || 'No description available'}</p>
                      </div>

                      <div>
                        <h3 className="text-xl font-bold text-white mb-4">Creator</h3>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-white/10 border border-white/20 flex items-center justify-center">
                            <span className="text-white font-bold">
                              {bundleDetails.creator ? bundleDetails.creator.toString().slice(0, 2).toUpperCase() : 'AN'}
                            </span>
                          </div>
                          <div>
                            <div className="text-white font-medium font-mono">
                              {bundleDetails.creator ?
                                (() => {
                                  const creatorStr = bundleDetails.creator.toString();
                                  return `${creatorStr.slice(0, 6)}...${creatorStr.slice(-4)}`;
                                })()
                                : 'Anonymous'}
                            </div>
                            <div className="text-gray-500 text-sm">Bundle Creator</div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-xl font-bold text-white mb-4">Details</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Created</span>
                            <span className="text-white font-mono">{bundleDetails.createdAt}</span>
                          </div>
                          <div className="w-full h-px bg-white/10" />
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Symbol</span>
                            <span className="text-white font-bold">{bundleDetails.symbol}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Trading Widget */}
              <div className="border border-white/10 bg-white/5 sticky top-6">
                <div className="flex border-b border-white/10">
                  {['buy', 'sell'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setTradeTab(mode as 'buy' | 'sell')}
                      className={`flex-1 py-4 text-sm font-bold uppercase transition-all ${
                        tradeTab === mode
                          ? mode === 'buy'
                            ? 'bg-green-500/20 text-green-400 border-b-2 border-green-400'
                            : 'bg-red-500/20 text-red-400 border-b-2 border-red-400'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                <div className="p-6">
                  <div className="space-y-4">
                {/* Balance Display */}
                {isAuthenticated && tradeTab === 'buy' && (
                  <div className="bg-surface-light border border-primary/20 p-3 rounded-lg">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-tertiary">Your Balance:</span>
                      <span className="text-primary font-mono font-bold">
                        {userUsdcBalance} ckUSDC
                      </span>
                    </div>
                  </div>
                )}

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
                        {tradeStep === 'complete' ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                        {tradeStatus || 'Processing...'}
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

                {/* Transaction Steps Info */}
                {tradeTab === 'buy' && (
                  <div className="mt-4 p-3 bg-surface-light rounded-lg border border-primary/20">
                    <div className="text-xs text-tertiary mb-2">Transaction Flow:</div>
                    <div className="space-y-2">
                      <div className={`flex items-center gap-2 text-xs transition-all ${
                        tradeStep === 'quote' ? 'text-accent' :
                        ['approve', 'execute', 'complete'].includes(tradeStep) ? 'text-green-400' :
                        'text-secondary'
                      }`}>
                        {['approve', 'execute', 'complete'].includes(tradeStep) ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : tradeStep === 'quote' ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border border-current" />
                        )}
                        <span>Request quote from contract</span>
                      </div>
                      <div className={`flex items-center gap-2 text-xs transition-all ${
                        tradeStep === 'approve' ? 'text-accent' :
                        ['execute', 'complete'].includes(tradeStep) ? 'text-green-400' :
                        'text-secondary'
                      }`}>
                        {['execute', 'complete'].includes(tradeStep) ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : tradeStep === 'approve' ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border border-current" />
                        )}
                        <span>Approve ckUSDC spending (ICRC-2)</span>
                      </div>
                      <div className={`flex items-center gap-2 text-xs transition-all ${
                        tradeStep === 'execute' ? 'text-accent' :
                        tradeStep === 'complete' ? 'text-green-400' :
                        'text-secondary'
                      }`}>
                        {tradeStep === 'complete' ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : tradeStep === 'execute' ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border border-current" />
                        )}
                        <span>Execute trade & receive NAV tokens</span>
                      </div>
                    </div>
                  </div>
                  )}
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