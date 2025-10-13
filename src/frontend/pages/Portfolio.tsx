import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, ArrowRight, Coins, DollarSign, X } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { backendService } from '../lib/backend-service';
import { icrc2Service } from '../lib/icrc2-service';
import { icrc151Service } from '../lib/icrc151-service';
import { authService } from '../lib/auth';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { PortfolioSkeleton, Skeleton } from '../components/ui/Skeleton';
import DepositModal from '../components/ui/DepositModal';
import toast from 'react-hot-toast';

interface Holding {
  bundleId: number;
  bundleName: string;
  tokenSymbol: string;
  navTokens: number;
  navPrice: number;
  totalValue: number;
  allocations: { symbol: string; percentage: number; logo?: string }[];
}



export default function Portfolio() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [totalPortfolioValue, setTotalPortfolioValue] = useState(0);
  const [showChart, setShowChart] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState<string>('0.00');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [recipientPrincipal, setRecipientPrincipal] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [principalError, setPrincipalError] = useState('');
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [hoveredToken, setHoveredToken] = useState<{ holdingId: number; tokenIdx: number } | null>(null);
  const { isAuthenticated, login, loading } = useAuth();

  const aggregateAllocation = useMemo(() => {
    const allocation: { [symbol: string]: number } = {};

    holdings.forEach(holding => {
      holding.allocations.forEach(asset => {
        const assetValue = (holding.totalValue * asset.percentage) / 100;
        allocation[asset.symbol] = (allocation[asset.symbol] || 0) + assetValue;
      });
    });

    return Object.entries(allocation).map(([symbol, value]) => ({
      symbol,
      value,
      percentage: (value / totalPortfolioValue) * 100
    })).sort((a, b) => b.value - a.value);
  }, [holdings, totalPortfolioValue]);

  const COLORS = ['#ffffff', '#a3a3a3', '#737373', '#525252', '#404040', '#262626'];

  useEffect(() => {
    if (isAuthenticated) {
      loadPortfolioData();
    }
  }, [isAuthenticated]);

  const loadPortfolioData = async () => {
    try {
      setLoadingPortfolio(true);
      const balance = await icrc2Service.getBalance();
      const formattedBalance = (Number(balance) / 1000000).toFixed(2);
      setUsdcBalance(formattedBalance);

      const principal = await authService.getPrincipal();
      if (!principal) {
        setHoldings([]);
        setTotalPortfolioValue(0);
        setLoadingPortfolio(false);
        return;
      }

      const tokenBalances = await icrc151Service.getBalancesFor(principal);

      if (!tokenBalances || tokenBalances.length === 0) {
        setHoldings([]);
        setTotalPortfolioValue(0);
        setLoadingPortfolio(false);
        return;
      }

      const [allBundles, allAssets] = await Promise.all([
        backendService.getBundlesList(),
        backendService.listAssets()
      ]);

      const assetMap = new Map(allAssets.map((asset: any) => [asset.id, asset]));

      const tokenIdToBundleMap = new Map();
      allBundles.forEach((bundle: any) => {
        if (bundle.token_location && 'ICRC151' in bundle.token_location) {
          const tokenIdHex = Array.from(bundle.token_location.ICRC151.token_id)
            .map((b: number) => b.toString(16).padStart(2, '0'))
            .join('');
          tokenIdToBundleMap.set(tokenIdHex, bundle);
        }
      });

      const holdingsPromises = tokenBalances.map(async (tokenBalance: any) => {
        try {
          const tokenIdHex = Array.from(tokenBalance.token_id)
            .map((b: number) => b.toString(16).padStart(2, '0'))
            .join('');

          const bundle = tokenIdToBundleMap.get(tokenIdHex);
          if (!bundle) {
            console.warn('Bundle not found for token_id:', tokenIdHex);
            return null;
          }

          const bundleId = Number(bundle.id);
          const navData = await backendService.calculateBundleNav(bundleId);

          const navTokens = Number(tokenBalance.balance) / 1e8;
          const navPrice = Number(navData.nav_per_token) / 1e8;
          const totalValue = navTokens * navPrice;

          const holding = {
            bundleId,
            bundleName: bundle.name,
            tokenSymbol: bundle.symbol || 'NAV',
            navTokens,
            navPrice,
            totalValue,
            allocations: bundle.allocations.map((a: any) => {
              const assetDetails = assetMap.get(a.asset_id);
              return {
                symbol: a.asset_id,
                percentage: a.percentage,
                logo: assetDetails?.metadata?.logo_url || ''
              };
            })
          };

          return holding;
        } catch (error) {
          console.error(`Failed to load bundle data:`, error);
          return null;
        }
      });

      const loadedHoldings = (await Promise.all(holdingsPromises)).filter((h): h is Holding => h !== null);
      setHoldings(loadedHoldings);

      const total = loadedHoldings.reduce((sum, h) => sum + h.totalValue, 0);
      setTotalPortfolioValue(total);
    } catch (error) {
      console.error('Failed to fetch portfolio data:', error);
      setHoldings([]);
      setTotalPortfolioValue(0);
    } finally {
      setLoadingPortfolio(false);
    }
  };


  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!recipientPrincipal.trim()) {
      setPrincipalError('Please enter a recipient principal');
      return;
    }

    if (!icrc2Service.validatePrincipal(recipientPrincipal)) {
      setPrincipalError('Invalid principal format');
      return;
    }

    const TRANSFER_FEE = 0.01;
    const withdrawAmount = parseFloat(amount);
    const totalNeeded = withdrawAmount + TRANSFER_FEE;

    if (totalNeeded > parseFloat(usdcBalance)) {
      toast.error(`Insufficient balance. You need ${totalNeeded.toFixed(2)} USDC (including ${TRANSFER_FEE} USDC fee)`);
      return;
    }

    try {
      setWithdrawing(true);
      toast.loading('Processing withdrawal...');

      const amountInE6s = BigInt(Math.floor(withdrawAmount * 1000000));

      await icrc2Service.transfer(recipientPrincipal, amountInE6s);

      toast.dismiss();
      toast.success('Withdrawal successful!');

      setAmount('');
      setRecipientPrincipal('');
      setPrincipalError('');
      setShowWithdrawModal(false);

      await loadPortfolioData();
    } catch (error) {
      toast.dismiss();
      console.error('Withdrawal failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Withdrawal failed';
      toast.error(errorMessage);
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="px-6 py-8 md:py-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">⏳</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Loading...</h3>
              <p className="text-gray-400">Checking authentication status...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black">
        <div className="px-6 py-8 md:py-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">🔐</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Authentication Required</h3>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">
                You need to be logged in to view your portfolio. Please authenticate with Internet Identity to continue.
              </p>
              <button
                onClick={() => void login()}
                className="btn-unique px-8 py-3"
              >
                LOGIN WITH INTERNET IDENTITY
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="px-6 py-8 md:py-16">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 md:mb-16">
            <div className="md:hidden mb-4 md:mb-6">
              <h1 className="text-4xl font-bold text-white mb-2">Portfolio</h1>
              <p className="text-gray-400 text-base mb-4">Track and manage your bundle positions</p>
              <Link to="/bundles" className="btn-outline-unique w-full text-center block py-3">
                Explore Bundles
              </Link>
            </div>

            <div className="hidden md:flex items-center justify-between mb-8 md:mb-12">
              <div>
                <h1 className="text-4xl md:text-6xl font-bold text-white mb-3 md:mb-4">Portfolio</h1>
                <p className="text-gray-400 text-lg">Track and manage your bundle positions</p>
              </div>
              <Link to="/bundles" className="btn-outline-unique">
                Explore Bundles
              </Link>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="border border-white/10 bg-white/5 p-6 md:p-8">
                <div className="flex items-baseline gap-4 mb-2">
                  <div className="text-gray-400 text-sm font-mono uppercase tracking-wide">Bundle Portfolio</div>
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                </div>
                {loadingPortfolio ? (
                  <>
                    <Skeleton className="h-12 w-48 mb-6" />
                    <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10">
                      <div>
                        <div className="text-gray-500 text-xs font-mono uppercase mb-1">Bundles</div>
                        <Skeleton className="h-7 w-12" />
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs font-mono uppercase mb-1">24h Change</div>
                        <Skeleton className="h-7 w-16" />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-white text-4xl md:text-5xl font-bold tracking-tight mb-6">
                      ${totalPortfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10">
                      <div>
                        <div className="text-gray-500 text-xs font-mono uppercase mb-1">Bundles</div>
                        <div className="text-white text-xl font-bold">{holdings.length}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs font-mono uppercase mb-1">24h Change</div>
                        <div className="text-gray-400 text-xl font-bold">0.0%</div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.03] p-6 md:p-8">
                <div className="text-gray-400 text-sm font-mono uppercase tracking-wide mb-2">USDC Balance</div>
                <div className="text-white text-4xl md:text-5xl font-bold mb-6">
                  ${usdcBalance}
                </div>
                <div className="flex gap-3 pt-6 border-t border-white/10">
                  <button
                    onClick={() => setShowDepositModal(true)}
                    className="flex-1 btn-unique px-4 py-3 flex items-center justify-center gap-2"
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    Deposit
                  </button>
                  <button
                    onClick={() => setShowWithdrawModal(true)}
                    className="flex-1 btn-outline-unique px-4 py-3 flex items-center justify-center gap-2"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Withdraw
                  </button>
                </div>
              </div>
            </div>
          </div>

          {holdings.length > 0 && (
            <div className="mb-12 md:mb-16">
              <button
                onClick={() => setShowChart(!showChart)}
                className="w-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-300 p-4 md:p-6 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="text-white text-xl md:text-2xl font-bold">Portfolio Allocation</div>
                  <div className="text-gray-500 text-sm font-mono">
                    {aggregateAllocation.length} {aggregateAllocation.length === 1 ? 'asset' : 'assets'}
                  </div>
                </div>
                <div className="text-white text-2xl transition-transform duration-300" style={{ transform: showChart ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  ▼
                </div>
              </button>

              {showChart && (
                <div className="border border-white/10 border-t-0 bg-white/5 p-4 md:p-8">
                  <div className="grid md:grid-cols-2 gap-8 items-center">
                    <div className="h-64 md:h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={aggregateAllocation}
                            cx="50%"
                            cy="50%"
                            innerRadius="60%"
                            outerRadius="80%"
                            dataKey="value"
                            nameKey="symbol"
                            label={({ symbol, percentage }) => `${symbol} ${percentage.toFixed(1)}%`}
                            labelLine={true}
                            isAnimationActive={false}
                          >
                            {aggregateAllocation.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                                style={{ outline: 'none' }}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            contentStyle={{
                              backgroundColor: 'rgba(0, 0, 0, 0.95)',
                              border: '1px solid rgba(255,255,255,0.2)',
                              borderRadius: '0',
                              color: '#fff',
                              padding: '12px',
                              fontFamily: 'monospace'
                            }}
                            itemStyle={{
                              color: '#fff'
                            }}
                            labelStyle={{
                              color: '#a3a3a3',
                              marginBottom: '4px'
                            }}
                            cursor={{ fill: 'transparent' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-3">
                      <div className="text-gray-400 text-xs font-mono uppercase tracking-wide mb-4">Asset Breakdown</div>
                      {aggregateAllocation.map((asset, index) => (
                        <div key={asset.symbol} className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-4 h-4 border border-white/20"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="text-white font-mono text-sm md:text-base">{asset.symbol}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-white font-bold text-sm md:text-base">{asset.percentage.toFixed(1)}%</div>
                            <div className="text-gray-500 text-xs">
                              ${asset.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 md:mb-8">Holdings</h2>

            {loadingPortfolio ? (
              <PortfolioSkeleton />
            ) : holdings.length === 0 ? (
              <div className="border border-white/10 bg-white/5 p-16 text-center">
                <div className="text-6xl mb-6">📦</div>
                <h3 className="text-white text-2xl font-bold mb-3">No Holdings Yet</h3>
                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                  Start building your portfolio by exploring available bundles
                </p>
                <Link to="/bundles" className="btn-unique">
                  Browse Bundles
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {holdings.map((holding, index) => (
                  <Link
                    key={holding.bundleId}
                    to={`/bundle/${holding.bundleId}`}
                    className="block border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-300 group"
                  >
                    <div className="p-3 md:p-8">
                      <div className="md:flex md:items-start md:justify-between md:gap-8">
                        <div className="flex-1 mb-4 md:mb-0">
                          <div className="flex items-center gap-2 mb-3">
                            <h3 className="text-white text-xl md:text-2xl font-bold group-hover:text-gray-200 transition-colors">
                              {holding.bundleName}
                            </h3>
                            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors flex-shrink-0" />
                          </div>
                          <div className="flex items-center -space-x-2 relative overflow-visible">
                            {holding.allocations.map((allocation, idx) => (
                              <div
                                key={allocation.symbol}
                                className="relative"
                                style={{ zIndex: holding.allocations.length - idx }}
                                onMouseEnter={() => setHoveredToken({ holdingId: holding.bundleId, tokenIdx: idx })}
                                onMouseLeave={() => setHoveredToken(null)}
                              >
                                <div className="w-8 h-8 rounded-full bg-white/10 border-2 border-black flex items-center justify-center group-hover:border-white/20 transition-colors overflow-hidden cursor-pointer">
                                  {allocation.logo ? (
                                    <img
                                      src={allocation.logo}
                                      alt={allocation.symbol}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-xs text-white font-bold">
                                      {allocation.symbol.slice(0, 2)}
                                    </span>
                                  )}
                                </div>
                                {hoveredToken?.holdingId === holding.bundleId && hoveredToken?.tokenIdx === idx && (
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black border border-white/20 whitespace-nowrap z-50 pointer-events-none">
                                    <div className="text-white text-xs font-bold">{allocation.symbol}</div>
                                    <div className="text-gray-400 text-[10px]">{allocation.percentage.toFixed(1)}%</div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 md:gap-8 md:flex-shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-white/10">
                          <div>
                            <div className="text-gray-500 text-xs font-mono uppercase mb-2">Balance</div>
                            <div className="text-white text-lg md:text-xl font-bold">
                              {holding.navTokens.toLocaleString()} {holding.tokenSymbol}
                            </div>
                            <div className="text-gray-500 text-xs md:text-sm mt-1">
                              @ ${holding.navPrice.toFixed(4)}
                            </div>
                          </div>

                          <div>
                            <div className="text-gray-500 text-xs font-mono uppercase mb-2">Total Value</div>
                            <div className="text-white text-lg md:text-xl font-bold">
                              ${holding.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-gray-400 text-xs md:text-sm mt-1">
                              0.0%
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <DepositModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
      />

      <AnimatePresence>
        {showWithdrawModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !withdrawing && setShowWithdrawModal(false)}
            className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-black border border-white/10 w-full max-w-lg"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h2 className="text-2xl font-bold text-white">Withdraw USDC</h2>
                <button
                  onClick={() => {
                    if (!withdrawing) {
                      setShowWithdrawModal(false);
                      setAmount('');
                      setRecipientPrincipal('');
                      setPrincipalError('');
                    }
                  }}
                  disabled={withdrawing}
                  className="w-8 h-8 border border-white/20 hover:bg-white/10 flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>

              <div className="p-6">
                <p className="text-gray-400 text-sm mb-2">
                  Transfer ckUSDC to another principal on the Internet Computer
                </p>
                <p className="text-gray-500 text-xs mb-6">
                  Available: ${usdcBalance}
                </p>

              <div className="mb-4">
                <label className="text-gray-400 text-sm mb-2 block">Recipient Principal</label>
                <input
                  type="text"
                  value={recipientPrincipal}
                  onChange={(e) => {
                    setRecipientPrincipal(e.target.value);
                    setPrincipalError('');
                  }}
                  placeholder="xxxxx-xxxxx-xxxxx-xxxxx-xxx"
                  disabled={withdrawing}
                  className="w-full bg-white/5 border border-white/10 px-4 py-3 text-white text-sm font-mono focus:border-white/30 focus:outline-none disabled:opacity-50"
                />
                {principalError && (
                  <p className="text-red-400 text-xs mt-1">{principalError}</p>
                )}
              </div>

              <div className="mb-6">
                <label className="text-gray-400 text-sm mb-2 block">Amount (USDC)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    disabled={withdrawing}
                    className="w-full bg-white/5 border border-white/10 px-4 py-3 text-white text-xl focus:border-white/30 focus:outline-none disabled:opacity-50"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    USDC
                  </div>
                </div>
                <button
                  onClick={() => {
                    const maxAmount = Math.max(0, parseFloat(usdcBalance) - 0.01);
                    setAmount(maxAmount.toFixed(2));
                  }}
                  disabled={withdrawing}
                  className="text-gray-400 hover:text-white text-xs mt-2 transition-colors disabled:opacity-50"
                >
                  Max: ${(parseFloat(usdcBalance) - 0.01).toFixed(2)} (after fee)
                </button>
              </div>

              {amount && parseFloat(amount) > 0 && (
                <>
                  <div className="bg-white/5 border border-white/10 p-4 mb-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Amount</span>
                      <span className="text-white">${parseFloat(amount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Transfer Fee</span>
                      <span className="text-white">$0.01</span>
                    </div>
                    <div className="border-t border-white/10 pt-2 flex justify-between text-sm">
                      <span className="text-gray-400 font-bold">Total</span>
                      <span className="text-white font-bold">${(parseFloat(amount) + 0.01).toFixed(2)}</span>
                    </div>
                    <div className="border-t border-white/10 pt-2 flex justify-between text-sm">
                      <span className="text-gray-400">You will receive</span>
                      <span className="text-green-400 font-bold">${parseFloat(amount).toFixed(2)}</span>
                    </div>
                  </div>

                  {(() => {
                    const totalNeeded = parseFloat(amount) + 0.01;
                    const hasInsufficientBalance = totalNeeded > parseFloat(usdcBalance);

                    if (hasInsufficientBalance) {
                      return (
                        <div className="bg-red-500/10 border border-red-400/20 p-4 mb-6">
                          <p className="text-red-400 text-sm">
                            Insufficient balance. You need ${totalNeeded.toFixed(2)} USDC but only have ${usdcBalance} USDC.
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </>
              )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowWithdrawModal(false);
                      setAmount('');
                      setRecipientPrincipal('');
                      setPrincipalError('');
                    }}
                    disabled={withdrawing}
                    className="flex-1 btn-outline-unique py-3 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleWithdraw}
                    disabled={withdrawing || (amount && parseFloat(amount) > 0 && (parseFloat(amount) + 0.01) > parseFloat(usdcBalance))}
                    className="flex-1 btn-unique py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {withdrawing ? 'Processing...' : 'Withdraw'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}