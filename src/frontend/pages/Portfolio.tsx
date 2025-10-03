import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../lib/auth';
import { backendService } from '../lib/backend-service';

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await authService.isAuthenticated();
      setIsAuthenticated(authenticated);

      if (authenticated) {
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

      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="text-primary">Loading portfolio...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <h2 className="heading-large mb-4">Please Sign In</h2>
            <p className="text-secondary mb-6">Connect your wallet to view your portfolio</p>
            <button
              onClick={() => authService.login()}
              className="btn-unique px-6 py-3"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <div className="flex items-center justify-between mb-12">
              <div>
                <h1 className="text-6xl font-bold text-white mb-4">Portfolio</h1>
                <p className="text-gray-400 text-lg">Track and manage your bundle positions</p>
              </div>
              <Link to="/bundles" className="btn-outline-unique">
                Explore Bundles
              </Link>
            </div>

            <div className="border border-white/10 bg-white/5 p-12">
              <div className="flex items-baseline gap-4 mb-2">
                <div className="text-gray-400 text-sm font-mono uppercase tracking-wide">Total Value</div>
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              </div>
              <div className="text-white text-7xl font-bold tracking-tight">
                ${totalPortfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="flex items-center gap-8 mt-6 pt-6 border-t border-white/10">
                <div>
                  <div className="text-gray-500 text-xs font-mono uppercase mb-1">Bundles</div>
                  <div className="text-white text-2xl font-bold">{holdings.length}</div>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div>
                  <div className="text-gray-500 text-xs font-mono uppercase mb-1">24h Change</div>
                  <div className="text-green-400 text-2xl font-bold">+8.4%</div>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div>
                  <div className="text-gray-500 text-xs font-mono uppercase mb-1">Collateral Available</div>
                  <div className="text-gray-600 text-2xl font-bold">$0.00</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-white mb-8">Holdings</h2>

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
                    <div className="p-8">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex-1">
                          <Link
                            to={`/bundle/${holding.bundleId}`}
                            className="text-white text-2xl font-bold hover:text-gray-300 transition-colors inline-block mb-3"
                          >
                            {holding.bundleName}
                          </Link>
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
                        <Link
                          to={`/bundle/${holding.bundleId}`}
                          className="btn-outline-unique ml-6"
                        >
                          View Details
                        </Link>
                      </div>

                      <div className="grid grid-cols-3 gap-8 pt-6 border-t border-white/10">
                        <div>
                          <div className="text-gray-500 text-xs font-mono uppercase mb-2">Balance</div>
                          <div className="text-white text-xl font-bold">
                            {holding.navTokens.toLocaleString()} NAV
                          </div>
                          <div className="text-gray-500 text-sm mt-1">
                            @ ${holding.navPrice.toFixed(4)}
                          </div>
                        </div>

                        <div>
                          <div className="text-gray-500 text-xs font-mono uppercase mb-2">Total Value</div>
                          <div className="text-white text-xl font-bold">
                            ${holding.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-green-400 text-sm mt-1">
                            +{(Math.random() * 15 + 5).toFixed(2)}%
                          </div>
                        </div>

                        <div>
                          <div className="text-gray-500 text-xs font-mono uppercase mb-2">Position</div>
                          <div className="text-white text-xl font-bold">
                            {((holding.totalValue / totalPortfolioValue) * 100).toFixed(1)}%
                          </div>
                          <div className="text-gray-500 text-sm mt-1">
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