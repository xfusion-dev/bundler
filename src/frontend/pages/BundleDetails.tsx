import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
import { TrendingUp, TrendingDown, ArrowUpDown, CheckCircle, Loader2, PieChart } from 'lucide-react';
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
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [tradeStatus, setTradeStatus] = useState('');
  const [tradeStep, setTradeStep] = useState<0 | 1 | 2 | 3>(0);
  const [userUsdcBalance, setUserUsdcBalance] = useState<string>('0');
  const [userNavBalance, setUserNavBalance] = useState<string>('0');
  const [userUsdcBalanceRaw, setUserUsdcBalanceRaw] = useState<bigint>(BigInt(0));
  const [userNavBalanceRaw, setUserNavBalanceRaw] = useState<bigint>(BigInt(0));
  const [currentQuote, setCurrentQuote] = useState<any>(null);
  const [quoteExpiresAt, setQuoteExpiresAt] = useState<number>(0);
  const [quoteExpired, setQuoteExpired] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [fetchingQuote, setFetchingQuote] = useState<boolean>(false);
  const { isAuthenticated, login } = useAuth();

  const getTimeRemaining = (ns: number): string => {
    const ms = ns / 1000000;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const fetchQuote = useCallback(async () => {
    if (!tradeAmount || parseFloat(tradeAmount) <= 0 || !id) return;

    setFetchingQuote(true);
    try {
      const userPrincipal = await authService.getPrincipal();
      if (!userPrincipal) return;

      const operation = tradeTab === 'buy'
        ? { Buy: { ckusdc_amount: Math.floor(parseFloat(tradeAmount) * 1e6) } }
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
  }, [tradeAmount, id, tradeTab]);

  useEffect(() => {
    if (!quoteExpiresAt) return;

    const interval = setInterval(() => {
      const now = Date.now() * 1000000;
      const remaining = Math.max(0, quoteExpiresAt - now);
      setTimeRemaining(remaining);

      if (remaining === 0 && !quoteExpired && currentQuote) {
        setQuoteExpired(true);
        void fetchQuote();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [quoteExpiresAt, quoteExpired, currentQuote, fetchQuote]);

  const getAssetColor = useCallback((symbol: string) => {
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
  }, []);

  const loadBundleDetails = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const [foundBundle, allAssets, navData, holders, holdings] = await Promise.all([
        backendService.getBundle(Number(id)),
        backendService.listAssets(),
        backendService.calculateBundleNav(Number(id)).catch(() => {
          console.log('NAV calculation not available yet (no holdings)');
          return null;
        }),
        backendService.getBundleHolderCount(Number(id)).catch(() => {
          console.log('Could not fetch holder count');
          return 0;
        }),
        backendService.getBundleHoldings(Number(id)).catch(() => {
          console.error('Failed to fetch bundle holdings');
          return [];
        })
      ]);

      const assetMap = new Map(allAssets.map((asset: any) => [asset.id, asset]));

      setBundleNav(navData);
      setHolderCount(holders);
      setBundleHoldings(holdings);

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
              value: Number(assetValue.value_usd) / 100000000,
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
              value: 0,
              amount: 0,
              price: 0,
              color: getAssetColor(assetDetails?.symbol || allocation.asset_id),
              logo: assetDetails?.metadata?.logo_url || '',
              decimals: assetDetails?.decimals || 8
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
  }, [id, getAssetColor]);

  useEffect(() => {
    void loadBundleDetails();
  }, [loadBundleDetails]);

  // Load user's ckUSDC balance when authenticated
  useEffect(() => {
    const loadBalance = async () => {
      if (isAuthenticated) {
        try {
          const balance = await icrc2Service.getBalance();
          setUserUsdcBalanceRaw(balance);
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
      if (isAuthenticated && id && bundle) {
        try {
          const userPrincipal = await authService.getPrincipal();
          if (!userPrincipal) return;

          // Get the bundle's token location
          if ('ICRC151' in bundle.token_location) {
            const { ledger, token_id } = bundle.token_location.ICRC151;

            // Query the ICRC151 ledger directly for the balance
            const agent = await authService.getAgent();
            if (!agent) return;

            const { Actor } = await import('@dfinity/agent');
            const { IDL } = await import('@dfinity/candid');

            const idlFactory = ({ IDL }: any) => {
              const Account = IDL.Record({ owner: IDL.Principal, subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)) });
              const Result = IDL.Variant({ Ok: IDL.Nat, Err: IDL.Text });
              return IDL.Service({
                get_balance: IDL.Func([IDL.Vec(IDL.Nat8), Account], [Result], ['query']),
              });
            };

            const ledgerActor: any = Actor.createActor(idlFactory, {
              agent,
              canisterId: ledger.toString(),
            });

            const result = await ledgerActor.get_balance(
              Array.from(token_id),
              { owner: userPrincipal, subaccount: [] }
            );

            if ('Ok' in result) {
              setUserNavBalanceRaw(result.Ok);
              const formattedBalance = (Number(result.Ok) / 100000000).toFixed(4);
              setUserNavBalance(formattedBalance);
            } else {
              setUserNavBalanceRaw(BigInt(0));
              setUserNavBalance('0');
            }
          }
        } catch (err) {
          console.error('Failed to load NAV token balance:', err);
          setUserNavBalance('0');
        }
      }
    };

    void loadNavBalance();
  }, [isAuthenticated, id, bundle]);

  useEffect(() => {
    if (!tradeAmount || parseFloat(tradeAmount) <= 0 || !isAuthenticated || !id) {
      setCurrentQuote(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      void fetchQuote();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [tradeAmount, tradeTab, isAuthenticated, id, fetchQuote]);

  const priceHistory = useMemo(() => {
    if (!bundle) return [];
    const basePrice = bundle.calculated_price || 1.00;
    const points = selectedPeriod === '1D' ? 24 : selectedPeriod === '7D' ? 7 : 30;
    const data = [];
    const now = new Date();

    for (let i = 0; i <= points; i++) {
      const variation = Math.sin(i / 3) * 0.02 + (Math.random() - 0.5) * 0.01;
      const trend = i * 0.001;
      const price = basePrice * (1 + variation + trend);

      let timeLabel = '';
      const date = new Date(now);

      if (selectedPeriod === '1D') {
        date.setHours(now.getHours() - (24 - i));
        timeLabel = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      } else if (selectedPeriod === '7D') {
        date.setDate(now.getDate() - (7 - i));
        timeLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else {
        date.setDate(now.getDate() - (30 - i));
        timeLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      data.push({
        time: timeLabel,
        price: Math.max(0, price)
      });
    }

    return data;
  }, [bundle, selectedPeriod]);

  const bundleDetails = useMemo(() => {
    if (!bundle) return null;

    return {
      id: bundle.id,
      name: bundle.name,
      symbol: (bundle.symbol || bundle.name.replace(/\s+/g, '')).substring(0, 4).toUpperCase(),
      description: bundle.description,
      creator: bundle.creator,
      createdAt: bundle.created_at ? new Date(Number(bundle.created_at) / 1000000).toISOString().split('T')[0] : 'Unknown',
      price: bundle.calculated_price || 1,
      change24h: 0,
      volume24h: 0,
      marketCap: bundle.total_nav_usd || 0,
      holders: holderCount,
      totalSupply: bundle.total_tokens || 0,
      assets: bundleAssets,
      performance: {
        '1D': 0,
        '7D': 0,
        '30D': 0,
      },
      priceHistory,
    };
  }, [bundle, holderCount, bundleAssets, priceHistory]);

  const handleExecuteTrade = async () => {
    if (!currentQuote) return;

    const now = Date.now() * 1000000;
    if (now >= quoteExpiresAt) {
      setError('Quote expired. Please get a new quote.');
      setCurrentQuote(null);
      toast.error('Quote expired');
      return;
    }

    // Save the current quote before clearing the form
    const quoteToExecute = currentQuote;

    // Clear the form immediately to prevent quote refreshing in background
    setTradeAmount('');
    setCurrentQuote(null);
    setQuoteExpiresAt(0);
    setQuoteExpired(false);
    setTimeRemaining(0);

    setIsTrading(true);
    setIsTradeModalOpen(true);
    setTradeStep(1);

    try {
      if (tradeTab === 'buy') {
        setTradeStatus('Approving USDC spending...');

        const usdcAmount = BigInt(quoteToExecute.ckusdc_amount);
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

      setTradeStep(2);
      setTradeStatus('Executing trade...');

      const assignmentId = await backendService.executeQuote(quoteToExecute);

      setTradeStep(3);
      console.log(`Sending assignment ${assignmentId} to coordinator for execution...`);
      await coordinatorService.executeAssignment(assignmentId);

      setTradeStatus('Waiting for execution to complete...');
      console.log(`Polling for assignment ${assignmentId} completion...`);
      let completed = false;
      for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
          const transaction = await backendService.getTransaction(assignmentId);
          console.log(`Poll ${i + 1}/30: Transaction status:`, transaction.status);

          if ('Completed' in transaction.status || transaction.status === 'Completed') {
            completed = true;
            console.log('Transaction completed!');
            break;
          } else if ('Failed' in transaction.status || transaction.status === 'Failed' ||
                     'TimedOut' in transaction.status || transaction.status === 'TimedOut') {
            throw new Error(`Transaction failed or timed out`);
          }
        } catch (pollError) {
          console.error('Status poll error:', pollError);
          if (i === 29) throw pollError;
        }
      }

      if (!completed) {
        throw new Error('Transaction execution timed out');
      }

      setTradeStatus('Trade completed successfully!');
      toast.success(`Trade executed successfully!`);

      await new Promise(resolve => setTimeout(resolve, 1500));

      setTradeStatus('');
      setTradeStep(0);
      setIsTradeModalOpen(false);

      console.log('Reloading bundle details after trade completion...');
      await loadBundleDetails();

      if (tradeTab === 'buy') {
        const newBalance = await icrc2Service.getBalance();
        setUserUsdcBalanceRaw(newBalance);
        const formattedBalance = (Number(newBalance) / 1000000).toFixed(2);
        setUserUsdcBalance(formattedBalance);
      }

      const userPrincipal = await authService.getPrincipal();
      if (userPrincipal && bundle && 'ICRC151' in bundle.token_location) {
        try {
          const { ledger, token_id } = bundle.token_location.ICRC151;
          const agent = await authService.getAgent();
          if (agent) {
            const { Actor } = await import('@dfinity/agent');
            const { IDL } = await import('@dfinity/candid');

            const idlFactory = ({ IDL }: any) => {
              const Account = IDL.Record({ owner: IDL.Principal, subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)) });
              const Result = IDL.Variant({ Ok: IDL.Nat, Err: IDL.Text });
              return IDL.Service({
                get_balance: IDL.Func([IDL.Vec(IDL.Nat8), Account], [Result], ['query']),
              });
            };

            const ledgerActor: any = Actor.createActor(idlFactory, {
              agent,
              canisterId: ledger.toString(),
            });

            const result = await ledgerActor.get_balance(
              Array.from(token_id),
              { owner: userPrincipal, subaccount: [] }
            );

            if ('Ok' in result) {
              setUserNavBalanceRaw(result.Ok);
              const formattedBalance = (Number(result.Ok) / 100000000).toFixed(4);
              setUserNavBalance(formattedBalance);
            }
          }
        } catch (err) {
          console.error('Failed to refresh NAV balance:', err);
        }
      }
    } catch (err) {
      console.error('Trade failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Trade failed. Please try again.';
      setTradeStatus(errorMessage);
      toast.error(errorMessage);
      setTradeStep(0);
      setTimeout(() => {
        setTradeStatus('');
        setIsTradeModalOpen(false);
      }, 3000);
    } finally {
      setIsTrading(false);
    }
  };


  if (loading) {
    return <BundleDetailsSkeleton />;
  }

  if (error || !bundle || !bundleDetails) {
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

                  {activeTab === 'composition' && (
                    <div className="space-y-6">
                      <h3 className="text-xl font-bold text-white mb-6">Asset Allocation</h3>

                      {bundleNav && bundleNav.total_nav_usd > 0 && (
                        <div className="border border-white/10 bg-black/40 p-6 mb-6 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Total Treasury Value</span>
                            <span className="text-white font-bold text-xl">
                              ${(Number(bundleNav.total_nav_usd) / 100000000).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">NAV Tokens in Circulation</span>
                            <span className="text-white font-mono">
                              {(Number(bundleNav.total_tokens) / 100000000).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Holders</span>
                            <span className="text-white font-mono">
                              {bundleDetails.holders.toLocaleString()}
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
                                {asset.value > 0 ? `$${asset.value.toFixed(2)}` : 'No holdings yet'}
                              </div>
                              {asset.amount > 0 && (
                                <div className="text-gray-500 text-xs">
                                  {asset.amount.toLocaleString('en-US', {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 8,
                                    useGrouping: true
                                  })} {asset.symbol}
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
                            onClick={() => {
                              if (tradeTab === 'buy') {
                                setTradeAmount((Number(userUsdcBalanceRaw) / 1000000).toString());
                              } else {
                                setTradeAmount((Number(userNavBalanceRaw) / 100000000).toString());
                              }
                            }}
                            className="text-white/60 hover:text-white text-xs transition-colors"
                          >
                            Balance: {tradeTab === 'buy' ? userUsdcBalance : userNavBalance}
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="any"
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
                                  : (currentQuote.ckusdc_amount / 1e6).toFixed(2)
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
                          <span className="text-white">${(currentQuote.fees / 1e6).toFixed(2)}</span>
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
                        const rawBalance = tradeTab === 'buy'
                          ? Number(userUsdcBalanceRaw) / 1000000
                          : Number(userNavBalanceRaw) / 100000000;

                        const transferFee = tradeTab === 'buy' ? 0.01 : 0;
                        const totalNeeded = amount + transferFee;
                        const insufficientBalance = totalNeeded > rawBalance;

                        if (insufficientBalance) {
                          return (
                            <div className="border border-red-400/20 bg-red-500/10 p-4">
                              <p className="text-red-400 text-sm">
                                Insufficient balance. You have {rawBalance.toFixed(tradeTab === 'buy' ? 6 : 8)} {tradeTab === 'buy' ? 'USDC' : 'NAV'} but need {totalNeeded.toFixed(tradeTab === 'buy' ? 6 : 8)} {tradeTab === 'buy' ? 'USDC' : 'NAV'}{tradeTab === 'buy' ? ' (including 0.01 USDC transfer fee)' : ''}.
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
                          const rawBalance = tradeTab === 'buy'
                            ? Number(userUsdcBalanceRaw) / 1000000
                            : Number(userNavBalanceRaw) / 100000000;
                          const transferFee = tradeTab === 'buy' ? 0.01 : 0;
                          const totalNeeded = amount + transferFee;
                          const insufficientBalance = totalNeeded > rawBalance;

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

      {isTradeModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !isTrading && setIsTradeModalOpen(false)}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-black border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 md:p-8">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                {tradeTab === 'buy' ? 'Buy' : 'Sell'} {bundle?.name || 'NAV Tokens'}
              </h2>
              <p className="text-gray-400 text-sm mb-8">
                {tradeTab === 'buy'
                  ? 'Executing your buy order. This will lock your USDC and mint NAV tokens.'
                  : 'Executing your sell order. This will burn your NAV tokens and send you USDC.'}
              </p>

              <div className="space-y-4">
                {[
                  { step: 1, label: tradeTab === 'buy' ? 'Approving USDC spending' : 'Preparing sell order', desc: tradeTab === 'buy' ? 'Approving backend to spend your USDC' : 'Validating NAV token balance' },
                  { step: 2, label: 'Executing quote on-chain', desc: 'Locking funds and creating assignment' },
                  { step: 3, label: 'Completing transaction', desc: tradeTab === 'buy' ? 'Assets deposited, NAV tokens minted' : 'NAV tokens burned, USDC sent' }
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-4">
                    <div className={`w-8 h-8 flex items-center justify-center border-2 ${
                      tradeStep > item.step ? 'border-green-400 bg-green-400' :
                      tradeStep === item.step ? 'border-white bg-white' :
                      'border-white/20 bg-transparent'
                    }`}>
                      {tradeStep > item.step ? (
                        <span className="text-black text-sm">✓</span>
                      ) : tradeStep === item.step ? (
                        <div className="w-3 h-3 bg-black animate-pulse" />
                      ) : (
                        <span className="text-gray-600 text-sm">{item.step}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className={`font-bold ${
                        tradeStep >= item.step ? 'text-white' : 'text-gray-600'
                      }`}>
                        {item.label}
                      </div>
                      <div className="text-gray-500 text-sm">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {tradeStatus && (
                <div className="mt-6 p-4 border border-white/20 bg-white/5">
                  <div className="text-white text-sm">{tradeStatus}</div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}