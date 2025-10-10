import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
import { TrendingUp, TrendingDown, BarChart3, PieChart, ArrowUpDown, CheckCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../lib/AuthContext';
import { backendService } from '../lib/backend-service';
import { icrc2Service } from '../lib/icrc2-service';
import { coordinatorService } from '../src/services/coordinator-service';
import { authService } from '../lib/auth';
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
  const [userNavBalance, setUserNavBalance] = useState<string>('0');
  const [currentQuote, setCurrentQuote] = useState<any>(null);
  const [quoteExpiresAt, setQuoteExpiresAt] = useState<number>(0);
  const [quoteExpired, setQuoteExpired] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [fetchingQuote, setFetchingQuote] = useState<boolean>(false);
  const { isAuthenticated, login } = useAuth();

  useEffect(() => {
    if (!quoteExpiresAt) return;

    const interval = setInterval(() => {
      const now = Date.now() * 1000000;
      const remaining = Math.max(0, quoteExpiresAt - now);
      setTimeRemaining(remaining);

      if (remaining === 0 && !quoteExpired && currentQuote) {
        setQuoteExpired(true);
        toast('Quote expired, please request a new quote', { icon: '⏱️' });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [quoteExpiresAt, quoteExpired, currentQuote]);

  const getTimeRemaining = (ns: number): string => {
    const ms = ns / 1000000;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

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
        let totalTokens = 0;
        try {
          navData = await backendService.calculateBundleNav(Number(id));
          holders = await backendService.getBundleHolderCount(Number(id));
        } catch (err) {
          console.log('NAV calculation not available yet (no holdings)');
        }

        try {
          const actor = await backendService.getActor();
          const result = await actor.get_total_tokens_for_bundle(BigInt(id));
          totalTokens = Number(result) / 100000000;
          console.log('Total tokens for bundle:', totalTokens);
        } catch (err) {
          console.log('Could not fetch total token supply');
        }

        setBundleNav(navData);
        setHolderCount(holders);

        try {
          const holdings = await backendService.getBundleHoldings(Number(id));
          console.log('Bundle holdings:', holdings);
          setBundleHoldings(holdings);
        } catch (err) {
          console.error('Failed to fetch bundle holdings:', err);
          setBundleHoldings([]);
        }

        const navPerToken = navData ? Number(navData.nav_per_token) / 100000000 : 1;

        const assetPrices: Record<string, number> = {};
        if (navData && navData.asset_values) {
          navData.asset_values.forEach((assetValue: any) => {
            if (assetValue.amount > 0) {
              const price = Number(assetValue.value_usd) / Number(assetValue.amount);
              assetPrices[assetValue.asset_id] = price;
              console.log(`Oracle price for ${assetValue.asset_id}: $${price.toFixed(2)}`);
            }
          });
        }

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
                logo: assetDetails?.metadata?.logo_url || '',
                decimals: assetDetails?.decimals || 8
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
                logo: assetDetails?.metadata?.logo_url || '',
                decimals: assetDetails?.decimals || 8
              };
            });

        setBundle({
          ...foundBundle,
          calculated_price: navPerToken,
          total_nav_usd: navData ? Number(navData.total_nav_usd) / 100000000 : 0,
          total_tokens: navData ? Number(navData.total_tokens) / 100000000 : totalTokens
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
          const formattedBalance = (Number(balance) / 1000000).toFixed(2);
          setUserUsdcBalance(formattedBalance);
        } catch (err) {
          console.error('Failed to load ckUSDC balance:', err);
        }
      }
    };

    void loadBalance();
  }, [isAuthenticated]);

  // Load user's NAV token balance for this bundle
  useEffect(() => {
    const loadNavBalance = async () => {
      if (isAuthenticated && id) {
        try {
          const userPrincipal = await authService.getPrincipal();
          if (!userPrincipal) return;

          const agent = await authService.getAgent();
          if (!agent) return;

          const actor = await backendService.getActor();
          const result = await actor.get_user_portfolio(userPrincipal);

          const holding = result.nav_token_holdings.find((h: any) => h.bundle_id.toString() === id);
          if (holding) {
            const formattedBalance = (Number(holding.amount) / 100000000).toFixed(4);
            setUserNavBalance(formattedBalance);
          } else {
            setUserNavBalance('0');
          }
        } catch (err) {
          console.error('Failed to load NAV token balance:', err);
          setUserNavBalance('0');
        }
      }
    };

    void loadNavBalance();
  }, [isAuthenticated, id]);

  useEffect(() => {
    if (!tradeAmount || parseFloat(tradeAmount) <= 0 || !isAuthenticated || !id) {
      setCurrentQuote(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      void fetchQuote();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [tradeAmount, tradeTab, isAuthenticated, id]);

  const fetchQuote = async () => {
    if (!tradeAmount || parseFloat(tradeAmount) <= 0 || !id) return;

    setFetchingQuote(true);
    try {
      const userPrincipal = await authService.getPrincipal();
      if (!userPrincipal) return;

      const operation = tradeTab === 'buy'
        ? { Buy: { ckusdc_amount: Math.floor(parseFloat(tradeAmount) * 1e8) } }
        : { Sell: { nav_tokens: Math.floor(parseFloat(tradeAmount) * 1e8) } };

      const quote = await coordinatorService.getQuote(
        Number(id),
        operation,
        userPrincipal.toString()
      );

      setCurrentQuote(quote);
      setQuoteExpiresAt(quote.valid_until);
      setQuoteExpired(false);
    } catch (err) {
      console.error('Failed to get quote:', err);
      setCurrentQuote(null);
    } finally {
      setFetchingQuote(false);
    }
  };

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

  const handleExecuteTrade = async () => {
    if (!currentQuote) return;

    const now = Date.now() * 1000000;
    if (now >= quoteExpiresAt) {
      setError('Quote expired. Please get a new quote.');
      setCurrentQuote(null);
      toast.error('Quote expired');
      return;
    }

    setIsTrading(true);
    setTradeStep('approve');

    try {
      if (tradeTab === 'buy') {
        setTradeStatus('Approving USDC spending...');

        const usdcAmount = BigInt(currentQuote.ckusdc_amount);
        console.log('Required USDC amount:', usdcAmount.toString());

        const currentAllowance = await icrc2Service.checkBackendAllowance();
        console.log('Current allowance before approval:', currentAllowance.toString());

        if (currentAllowance < usdcAmount) {
          const largeApprovalAmount = BigInt(10000 * 1000000);
          console.log('Approving amount:', largeApprovalAmount.toString());

          const approvalResult = await icrc2Service.approveBackendCanister(largeApprovalAmount);
          console.log('Approval result:', approvalResult?.toString());

          if (!approvalResult) {
            throw new Error('Failed to approve USDC spending');
          }

          console.log('Waiting 2 seconds for approval to settle...');
          await new Promise(resolve => setTimeout(resolve, 2000));

          const verifiedAllowance = await icrc2Service.checkBackendAllowance();
          console.log('Verified allowance after approval:', verifiedAllowance.toString());

          if (verifiedAllowance < usdcAmount) {
            throw new Error(`Allowance verification failed. Expected at least ${usdcAmount}, got ${verifiedAllowance}`);
          }
          console.log('✓ Allowance verified successfully');
        } else {
          console.log('✓ Sufficient allowance already exists');
        }
      }

      setTradeStep('execute');
      setTradeStatus('Executing trade...');

      await backendService.executeQuote(currentQuote);

      setTradeStep('complete');
      setTradeStatus('Trade completed successfully!');
      toast.success(`Trade executed successfully!`);

      if (tradeTab === 'buy') {
        const newBalance = await icrc2Service.getBalance();
        const formattedBalance = (Number(newBalance) / 1000000).toFixed(2);
        setUserUsdcBalance(formattedBalance);
      }

      const userPrincipal = await authService.getPrincipal();
      if (userPrincipal) {
        const actor = await backendService.getActor();
        const result = await actor.get_user_portfolio(userPrincipal);
        const holding = result.nav_token_holdings.find((h: any) => h.bundle_id.toString() === id);
        if (holding) {
          const formattedBalance = (Number(holding.amount) / 100000000).toFixed(4);
          setUserNavBalance(formattedBalance);
        } else {
          setUserNavBalance('0');
        }
      }

      setTimeout(() => {
        setTradeStatus('');
        setTradeStep('idle');
        setCurrentQuote(null);
        setQuoteExpiresAt(0);
        setTradeAmount('');
      }, 2000);
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
        <div className="px-6 py-8 md:py-16">
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
    symbol: (bundle.symbol || bundle.name.replace(/\s+/g, '')).substring(0, 4).toUpperCase(),
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
          <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-white/20 to-white/5 border border-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-base md:text-xl">
                {bundleDetails.symbol}
              </span>
            </div>
            <div>
              <h1 className="text-2xl md:text-4xl font-bold text-white">{bundleDetails.name}</h1>
              <div className="flex items-center gap-2 md:gap-3 text-gray-400 text-xs md:text-sm mt-1">
                <span>Bundle Token</span>
                <span>•</span>
                <span>Created {bundleDetails.createdAt}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            <div className="lg:col-span-2 space-y-6 md:space-y-8">
              <div className="border border-white/10 bg-white/5 p-4 md:p-8">
                <div className="flex items-start justify-between mb-6 md:mb-8">
                  <div>
                    <div className="text-3xl md:text-5xl font-bold text-white mb-2 md:mb-3">
                      ${bundleDetails.price.toFixed(2)}
                    </div>
                    <div className={`flex items-center gap-2 text-base md:text-lg font-semibold ${
                      isPositive ? 'text-green-400' : 'text-red-400'
                    }`}>
                      <TrendIcon className="w-4 h-4 md:w-5 md:h-5" />
                      {isPositive ? '+' : ''}{bundleDetails.change24h.toFixed(2)}% (24h)
                    </div>
                  </div>

                  <div className="flex gap-1">
                    {Object.keys(bundleDetails.performance).map((period) => (
                      <button
                        key={period}
                        onClick={() => setSelectedPeriod(period as any)}
                        className={`px-2 md:px-3 py-1 text-xs font-mono transition-colors ${
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

                <div className="h-48 md:h-64">
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
                <div className="border-b border-white/10 overflow-x-auto">
                  <div className="flex">
                    {[
                      { key: 'composition', label: 'Composition', icon: PieChart },
                      { key: 'statistics', label: 'Statistics', icon: BarChart3 },
                      { key: 'about', label: 'About', icon: null },
                    ].map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        onClick={() => setActiveTab(key as any)}
                        className={`flex items-center gap-2 px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
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

                <div className="p-4 md:p-8">
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
                            {bundleDetails.marketCap > 0 ? `$${(bundleDetails.marketCap / 1000).toFixed(1)}K` : 'N/A'}
                          </div>
                        </div>
                        <div className="border border-white/10 bg-black/40 p-4">
                          <div className="text-gray-500 text-xs font-mono uppercase mb-2">TOTAL SUPPLY</div>
                          <div className="text-2xl font-bold text-white">
                            {bundleDetails.totalSupply > 0 ? `${(bundleDetails.totalSupply / 1000000).toFixed(1)}M` : 'N/A'}
                          </div>
                        </div>
                      </div>

                      {bundleHoldings.length > 0 && (
                        <div className="mt-8">
                          <h3 className="text-xl font-bold text-white mb-4">Treasury Holdings</h3>
                          <div className="space-y-3">
                            {bundleHoldings.map((holding: any, idx: number) => {
                              const assetId = holding.asset_id || holding['3384401418'] || '';
                              const rawAmount = holding.amount || holding['3573748184'] || 0;
                              const lastUpdated = holding.last_updated || holding['1600678930'] || 0;

                              const assetDetails = bundleDetails.assets.find((a: any) => a.symbol === assetId);
                              const decimals = assetDetails?.decimals || 8;
                              const tokens = Number(rawAmount) / Math.pow(10, decimals);

                              if (!assetId) return null;

                              return (
                                <div key={`${assetId}-${idx}`} className="border border-white/10 bg-black/40 p-4">
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                      {assetDetails?.logo ? (
                                        <img src={assetDetails.logo} alt={assetId} className="w-8 h-8 rounded-lg" />
                                      ) : (
                                        <div
                                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                                          style={{ backgroundColor: assetDetails?.color || '#666' }}
                                        >
                                          <span className="text-white font-bold text-xs">
                                            {assetId.slice(0, 2)}
                                          </span>
                                        </div>
                                      )}
                                      <div>
                                        <div className="text-white font-medium">{assetDetails?.name || assetId}</div>
                                        <div className="text-gray-500 text-xs font-mono">{assetId}</div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-white font-bold font-mono">
                                        {tokens.toLocaleString(undefined, { maximumFractionDigits: 8 })} {assetId}
                                      </div>
                                      <div className="text-gray-500 text-xs">
                                        Updated {new Date(Number(lastUpdated) / 1000000).toLocaleDateString()}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
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
                              <div className="w-10 h-10 flex items-center justify-center overflow-hidden rounded-lg flex-shrink-0">
                                {asset.logo ? (
                                  <img
                                    src={asset.logo}
                                    alt={asset.symbol}
                                    className="w-full h-full object-cover rounded-lg"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const parent = target.parentElement;
                                      if (parent) {
                                        parent.innerHTML = `<div class="w-full h-full flex items-center justify-center rounded-lg" style="background-color: ${asset.color}"><span class="text-white font-bold text-xs">${asset.symbol.slice(0, 2)}</span></div>`;
                                      }
                                    }}
                                  />
                                ) : (
                                  <div
                                    className="w-full h-full flex items-center justify-center rounded-lg"
                                    style={{ backgroundColor: asset.color }}
                                  >
                                    <span className="text-white font-bold text-xs">
                                      {asset.symbol.slice(0, 2)}
                                    </span>
                                  </div>
                                )}
                              </div>
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
                                {asset.value > 0 ? `$${asset.value.toFixed(2)}` : (() => {
                                  const holding = bundleHoldings.find((h: any) =>
                                    (h.asset_id || h['3384401418']) === asset.symbol
                                  );
                                  const rawAmount = holding ? (holding.amount || holding['3573748184'] || 0) : 0;
                                  if (rawAmount > 0) {
                                    const decimals = asset.decimals || 8;
                                    const tokens = Number(rawAmount) / Math.pow(10, decimals);
                                    return `${tokens.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${asset.symbol}`;
                                  }
                                  return 'No holdings yet';
                                })()}
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
              <div className="border border-white/10 bg-white/5 md:sticky md:top-6">
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
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-gray-400 text-sm">
                          {tradeTab === 'buy' ? 'You Pay (USDC)' : 'You Sell (NAV)'}
                        </label>
                        {isAuthenticated && (
                          <button
                            onClick={() => setTradeAmount(tradeTab === 'buy' ? userUsdcBalance : userNavBalance)}
                            className="text-white/60 hover:text-white text-xs transition-colors"
                          >
                            Balance: {tradeTab === 'buy' ? userUsdcBalance : userNavBalance}
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          value={tradeAmount}
                          onChange={(e) => setTradeAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-black border border-white/10 p-4 pr-20 text-white text-2xl focus:border-white/20 focus:outline-none transition-colors"
                          disabled={isTrading}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                          {tradeTab === 'buy' ? 'USDC' : 'NAV'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-center py-1">
                      <ArrowUpDown className="w-4 h-4 text-gray-600" />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2">
                        {tradeTab === 'buy' ? 'You Receive (NAV)' : 'You Receive (USDC)'}
                      </label>
                      <div className="relative">
                        {fetchingQuote ? (
                          <div className="w-full bg-black border border-white/10 p-4 text-2xl flex items-center">
                            <Loader2 className="w-5 h-5 animate-spin mr-3" />
                            <span className="text-gray-600">Loading...</span>
                          </div>
                        ) : currentQuote ? (
                          <>
                            <input
                              type="text"
                              value={
                                tradeTab === 'buy'
                                  ? (currentQuote.nav_tokens / 1e8).toFixed(4)
                                  : (currentQuote.ckusdc_amount / 1e8).toFixed(2)
                              }
                              readOnly
                              className="w-full bg-black border border-white/10 p-4 pr-20 text-white text-2xl cursor-not-allowed"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                              {tradeTab === 'buy' ? 'NAV' : 'USDC'}
                            </span>
                          </>
                        ) : (
                          <>
                            <input
                              type="text"
                              value=""
                              readOnly
                              placeholder="0.00"
                              className="w-full bg-black border border-white/10 p-4 pr-20 text-white text-2xl cursor-not-allowed"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                              {tradeTab === 'buy' ? 'NAV' : 'USDC'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {currentQuote && (
                      <div className="border border-white/10 bg-black/40 p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Price per NAV</span>
                          <span className="text-white">
                            ${(currentQuote.ckusdc_amount / currentQuote.nav_tokens).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Platform Fee</span>
                          <span className="text-white">${(currentQuote.fees / 1e8).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Quote expires</span>
                          <span className="text-white">
                            {quoteExpired ? (
                              <span className="text-red-400">EXPIRED</span>
                            ) : (
                              <span>{getTimeRemaining(timeRemaining)}</span>
                            )}
                          </span>
                        </div>
                      </div>
                    )}

                    {tradeAmount && parseFloat(tradeAmount) > 0 && (
                      (() => {
                        const amount = parseFloat(tradeAmount);
                        const balance = tradeTab === 'buy' ? parseFloat(userUsdcBalance) : parseFloat(userNavBalance);
                        const insufficientBalance = amount > balance;

                        if (insufficientBalance) {
                          return (
                            <div className="border border-red-400/20 bg-red-500/10 p-4">
                              <p className="text-red-400 text-sm">
                                Insufficient balance. You have {balance.toFixed(tradeTab === 'buy' ? 2 : 4)} {tradeTab === 'buy' ? 'USDC' : 'NAV'} but need {amount.toFixed(tradeTab === 'buy' ? 2 : 4)} {tradeTab === 'buy' ? 'USDC' : 'NAV'}.
                              </p>
                            </div>
                          );
                        }
                        return null;
                      })()
                    )}

                    {isAuthenticated ? (
                      <>
                        {(() => {
                          const amount = parseFloat(tradeAmount) || 0;
                          const balance = tradeTab === 'buy' ? parseFloat(userUsdcBalance) : parseFloat(userNavBalance);
                          const insufficientBalance = amount > balance;

                          return (
                            <button
                              onClick={() => void handleExecuteTrade()}
                              disabled={!currentQuote || quoteExpired || isTrading || fetchingQuote || insufficientBalance}
                              className={`w-full py-4 font-bold text-sm uppercase tracking-wide transition-all flex items-center justify-center gap-2 border ${
                                tradeTab === 'buy'
                                  ? 'bg-green-500/10 text-green-400 border-green-400/20 hover:bg-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed'
                                  : 'bg-red-500/10 text-red-400 border-red-400/20 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed'
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
                              ) : insufficientBalance && amount > 0 ? (
                                `Insufficient ${tradeTab === 'buy' ? 'USDC' : 'NAV'} Balance`
                              ) : (
                                `${tradeTab === 'buy' ? 'Buy' : 'Sell'} ${bundleDetails.name}`
                              )}
                            </button>
                          );
                        })()}
                      </>
                    ) : (
                      <button
                        onClick={() => void login()}
                        className="w-full py-4 font-bold text-sm uppercase tracking-wide bg-white text-black hover:bg-gray-200 transition-colors"
                      >
                        Connect Wallet
                      </button>
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