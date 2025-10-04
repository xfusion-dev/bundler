import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { backendService } from '../lib/backend-service';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

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
      try {
        setHoldings(MOCK_HOLDINGS);
        const total = MOCK_HOLDINGS.reduce((sum, h) => sum + h.totalValue, 0);
        setTotalPortfolioValue(total);
      } catch (error) {
        console.error('Failed to fetch holdings:', error);
        setHoldings([]);
        setTotalPortfolioValue(0);
      }
    }
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="px-6 py-16">
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
        <div className="px-6 py-16">
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
      <div className="px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 md:mb-16">
            <div className="md:hidden mb-6">
              <h1 className="text-4xl font-bold text-white mb-2">Portfolio</h1>
              <p className="text-gray-400 text-base mb-4">Track and manage your bundle positions</p>
              <Link to="/bundles" className="btn-outline-unique w-full text-center block py-3">
                Explore Bundles
              </Link>
            </div>

            <div className="hidden md:flex items-center justify-between mb-12">
              <div>
                <h1 className="text-6xl font-bold text-white mb-4">Portfolio</h1>
                <p className="text-gray-400 text-lg">Track and manage your bundle positions</p>
              </div>
              <Link to="/bundles" className="btn-outline-unique">
                Explore Bundles
              </Link>
            </div>

            <div className="border border-white/10 bg-white/5 p-6 md:p-12">
              <div className="flex items-baseline gap-4 mb-2">
                <div className="text-gray-400 text-sm font-mono uppercase tracking-wide">Total Value</div>
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              </div>
              <div className="text-white text-5xl md:text-7xl font-bold tracking-tight">
                ${totalPortfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="grid grid-cols-2 md:flex md:items-center gap-4 md:gap-8 mt-6 pt-6 border-t border-white/10">
                <div>
                  <div className="text-gray-500 text-xs font-mono uppercase mb-1">Bundles</div>
                  <div className="text-white text-2xl font-bold">{holdings.length}</div>
                </div>
                <div className="hidden md:block w-px h-8 bg-white/10" />
                <div>
                  <div className="text-gray-500 text-xs font-mono uppercase mb-1">24h Change</div>
                  <div className="text-green-400 text-2xl font-bold">+8.4%</div>
                </div>
                <div className="hidden md:block w-px h-8 bg-white/10" />
                <div>
                  <div className="text-gray-500 text-xs font-mono uppercase mb-1">Collateral Available</div>
                  <div className="text-gray-600 text-2xl font-bold">$0.00</div>
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
                  <div
                    key={holding.bundleId}
                    className="border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                  >
                    <div className="p-3 md:p-8">
                      <div className="mb-3 md:mb-6">
                        <div className="flex items-start justify-between mb-3">
                          <Link
                            to={`/bundle/${holding.bundleId}`}
                            className="text-white text-xl md:text-2xl font-bold hover:text-gray-300 transition-colors inline-block flex-1"
                          >
                            {holding.bundleName}
                          </Link>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {holding.allocations.map((allocation) => (
                            <span
                              key={allocation.symbol}
                              className="px-3 py-1 bg-white/10 border border-white/20 text-white text-xs font-mono"
                            >
                              {allocation.symbol} {allocation.percentage}%
                            </span>
                          ))}
                        </div>
                        <Link
                          to={`/bundle/${holding.bundleId}`}
                          className="btn-outline-unique w-full md:w-auto block md:inline-block text-center"
                        >
                          View Details
                        </Link>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-8 pt-3 md:pt-6 border-t border-white/10">
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

                        <div className="col-span-2 md:col-span-1">
                          <div className="text-gray-500 text-xs font-mono uppercase mb-2">Position</div>
                          <div className="text-white text-lg md:text-xl font-bold">
                            {((holding.totalValue / totalPortfolioValue) * 100).toFixed(1)}%
                          </div>
                          <div className="text-gray-500 text-xs md:text-sm mt-1">
                            of portfolio
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}