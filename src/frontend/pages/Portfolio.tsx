import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, ArrowRight } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { backendService } from '../lib/backend-service';
import { icrc2Service } from '../lib/icrc2-service';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import toast from 'react-hot-toast';

interface Holding {
  bundleId: number;
  bundleName: string;
  navTokens: number;
  navPrice: number;
  totalValue: number;
  allocations: { symbol: string; percentage: number }[];
}

const MOCK_HOLDINGS: Holding[] = [
  {
    bundleId: 1,
    bundleName: 'DeFi Leaders',
    navTokens: 150.5,
    navPrice: 45.32,
    totalValue: 6820.66,
    allocations: [
      { symbol: 'ckBTC', percentage: 40 },
      { symbol: 'ckETH', percentage: 35 },
      { symbol: 'ckUSDC', percentage: 25 }
    ]
  },
  {
    bundleId: 2,
    bundleName: 'Stable Growth',
    navTokens: 500.0,
    navPrice: 12.15,
    totalValue: 6075.00,
    allocations: [
      { symbol: 'ckUSDC', percentage: 50 },
      { symbol: 'ckBTC', percentage: 30 },
      { symbol: 'Gold', percentage: 20 }
    ]
  },
  {
    bundleId: 3,
    bundleName: 'High Risk High Reward',
    navTokens: 75.25,
    navPrice: 67.89,
    totalValue: 5108.73,
    allocations: [
      { symbol: 'ckETH', percentage: 60 },
      { symbol: 'ckBTC', percentage: 40 }
    ]
  }
];


export default function Portfolio() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [totalPortfolioValue, setTotalPortfolioValue] = useState(0);
  const [showChart, setShowChart] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState<string>('0.00');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [amount, setAmount] = useState('');
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
      const balance = await icrc2Service.getBalance();
      const formattedBalance = (Number(balance) / 1000000).toFixed(2);
      setUsdcBalance(formattedBalance);

      setHoldings(MOCK_HOLDINGS);
      const total = MOCK_HOLDINGS.reduce((sum, h) => sum + h.totalValue, 0);
      setTotalPortfolioValue(total);
    } catch (error) {
      console.error('Failed to fetch portfolio data:', error);
      setHoldings([]);
      setTotalPortfolioValue(0);
    }
  };

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      toast.success(`Depositing ${amount} USDC...`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Deposit successful!');
      setAmount('');
      setShowDepositModal(false);
      await loadPortfolioData();
    } catch (error) {
      toast.error('Deposit failed');
    }
  };

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (parseFloat(amount) > parseFloat(usdcBalance)) {
      toast.error('Insufficient balance');
      return;
    }

    try {
      toast.success(`Withdrawing ${amount} USDC...`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Withdrawal successful!');
      setAmount('');
      setShowWithdrawModal(false);
      await loadPortfolioData();
    } catch (error) {
      toast.error('Withdrawal failed');
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
                    <div className="text-green-400 text-xl font-bold">+8.4%</div>
                  </div>
                </div>
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

            {holdings.length === 0 ? (
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
                          <div className="flex flex-wrap gap-2">
                            {holding.allocations.map((allocation) => (
                              <span
                                key={allocation.symbol}
                                className="px-3 py-1 bg-white/10 border border-white/20 text-white text-xs font-mono"
                              >
                                {allocation.symbol} {allocation.percentage}%
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 md:gap-8 md:flex-shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-white/10">
                          <div>
                            <div className="text-gray-500 text-xs font-mono uppercase mb-2">Balance</div>
                            <div className="text-white text-lg md:text-xl font-bold">
                              {holding.navTokens.toLocaleString()} NAV
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
                            <div className="text-green-400 text-xs md:text-sm mt-1">
                              +{(Math.random() * 15 + 5).toFixed(2)}%
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

      <AnimatePresence>
        {showDepositModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDepositModal(false)}
            className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-black border border-white/10 w-full max-w-md p-6"
            >
              <h3 className="text-2xl font-bold text-white mb-4">Deposit USDC</h3>
              <p className="text-gray-400 text-sm mb-6">
                Transfer USDC from your wallet to your XFusion balance
              </p>

              <div className="mb-6">
                <label className="text-gray-400 text-sm mb-2 block">Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white/5 border border-white/10 px-4 py-3 text-white text-xl focus:border-white/30 focus:outline-none"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    USDC
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDepositModal(false)}
                  className="flex-1 btn-outline-unique py-3"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeposit}
                  className="flex-1 btn-unique py-3"
                >
                  Deposit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showWithdrawModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowWithdrawModal(false)}
            className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-black border border-white/10 w-full max-w-md p-6"
            >
              <h3 className="text-2xl font-bold text-white mb-4">Withdraw USDC</h3>
              <p className="text-gray-400 text-sm mb-2">
                Transfer USDC from your XFusion balance to your wallet
              </p>
              <p className="text-gray-500 text-xs mb-6">
                Available: ${usdcBalance}
              </p>

              <div className="mb-6">
                <label className="text-gray-400 text-sm mb-2 block">Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    max={usdcBalance}
                    className="w-full bg-white/5 border border-white/10 px-4 py-3 text-white text-xl focus:border-white/30 focus:outline-none"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    USDC
                  </div>
                </div>
                <button
                  onClick={() => setAmount(usdcBalance)}
                  className="text-gray-400 hover:text-white text-xs mt-2 transition-colors"
                >
                  Max: ${usdcBalance}
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="flex-1 btn-outline-unique py-3"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWithdraw}
                  className="flex-1 btn-unique py-3"
                >
                  Withdraw
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}