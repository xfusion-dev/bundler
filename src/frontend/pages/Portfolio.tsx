import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../lib/auth';

interface Holding {
  bundleId: number;
  bundleName: string;
  navTokens: number;
  navPrice: number;
  totalValue: number;
  allocations: { symbol: string; percentage: number }[];
}

// Mock data for portfolio
const getMockHoldings = (): Holding[] => [
  {
    bundleId: 1,
    bundleName: "DeFi Leaders Index",
    navTokens: 150,
    navPrice: 1.05,
    totalValue: 157.50,
    allocations: [
      { symbol: "ETH", percentage: 40 },
      { symbol: "BTC", percentage: 30 },
      { symbol: "SOL", percentage: 30 }
    ]
  },
  {
    bundleId: 2,
    bundleName: "Digital Gold Basket",
    navTokens: 500,
    navPrice: 1.02,
    totalValue: 510,
    allocations: [
      { symbol: "BTC", percentage: 70 },
      { symbol: "ETH", percentage: 20 },
      { symbol: "GOLD", percentage: 10 }
    ]
  },
  {
    bundleId: 3,
    bundleName: "Stable Growth Fund",
    navTokens: 1000,
    navPrice: 0.98,
    totalValue: 980,
    allocations: [
      { symbol: "USDC", percentage: 50 },
      { symbol: "BTC", percentage: 30 },
      { symbol: "ETH", percentage: 20 }
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
        // In production, fetch real holdings from backend
        const mockHoldings = getMockHoldings();
        setHoldings(mockHoldings);

        // Calculate total portfolio value
        const total = mockHoldings.reduce((sum, holding) => sum + holding.totalValue, 0);
        setTotalPortfolioValue(total);
      }

      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary">Loading portfolio...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
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
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        {/* Portfolio Header */}
        <div className="mb-8">
          <h1 className="heading-large mb-2">My Portfolio</h1>
          <p className="text-secondary">Manage your bundle holdings and collateral positions</p>
        </div>

        {/* Portfolio Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card-unique p-6">
            <div className="text-secondary text-sm mb-2">Total Portfolio Value</div>
            <div className="text-primary text-3xl font-bold">
              ${totalPortfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="card-unique p-6">
            <div className="text-secondary text-sm mb-2">Total Bundles</div>
            <div className="text-primary text-3xl font-bold">{holdings.length}</div>
          </div>
          <div className="card-unique p-6">
            <div className="text-secondary text-sm mb-2">Available as Collateral</div>
            <div className="text-primary text-3xl font-bold">$0.00</div>
            <div className="text-tertiary text-xs mt-1">Coming Soon</div>
          </div>
        </div>

        {/* Holdings List */}
        <div className="space-y-4">
          <h2 className="heading-medium mb-4">Bundle Holdings</h2>

          {holdings.length === 0 ? (
            <div className="card-unique p-8 text-center">
              <p className="text-secondary mb-4">You don't have any bundle holdings yet</p>
              <Link to="/" className="btn-unique px-6 py-3 inline-block">
                Explore Bundles
              </Link>
            </div>
          ) : (
            holdings.map((holding) => (
              <div key={holding.bundleId} className="card-unique p-6 hover:shadow-xl transition-shadow">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 items-center">
                  {/* Bundle Info - spans 4 columns */}
                  <div className="md:col-span-4">
                    <Link
                      to={`/bundle/${holding.bundleId}`}
                      className="text-primary font-bold text-lg hover:text-accent transition-colors block mb-2"
                    >
                      {holding.bundleName}
                    </Link>
                    <div className="flex flex-wrap gap-2">
                      {holding.allocations.map((allocation) => (
                        <span
                          key={allocation.symbol}
                          className="px-2 py-1 bg-surface-light rounded text-xs text-secondary"
                        >
                          {allocation.symbol} {allocation.percentage}%
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* NAV Tokens Info - spans 2 columns */}
                  <div className="md:col-span-2 md:text-center">
                    <div className="text-secondary text-sm mb-1">NAV Tokens</div>
                    <div className="text-primary font-bold text-xl">
                      {holding.navTokens.toLocaleString()}
                    </div>
                    <div className="text-tertiary text-sm">
                      @ ${holding.navPrice.toFixed(4)}
                    </div>
                  </div>

                  {/* Value Info - spans 2 columns */}
                  <div className="md:col-span-2 md:text-center">
                    <div className="text-secondary text-sm mb-1">Value</div>
                    <div className="text-accent font-bold text-xl">
                      ${holding.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Actions - spans 4 columns */}
                  <div className="md:col-span-4 flex flex-col sm:flex-row gap-2 md:justify-end">
                    <Link
                      to={`/bundle/${holding.bundleId}`}
                      className="btn-unique px-4 py-2 text-center"
                    >
                      View Bundle
                    </Link>
                    <button
                      className="btn-outline-unique opacity-50 cursor-not-allowed"
                      disabled
                      title="Coming Soon: Use your NAV tokens as collateral for borrowing"
                    >
                      Use as Collateral
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Collateral Section (Future Feature) */}
        <div className="mt-12">
          <h2 className="heading-medium mb-4">Collateral Positions</h2>
          <div className="card-unique p-8 text-center border-2 border-dashed border-surface-light">
            <div className="text-5xl mb-4">🔒</div>
            <h3 className="text-primary font-bold mb-2">Collateral Feature Coming Soon</h3>
            <p className="text-secondary max-w-md mx-auto">
              Soon you'll be able to use your NAV tokens as collateral to borrow stablecoins
              and other assets. Stay tuned for this exciting DeFi feature!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}