import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import mockData from '../lib/mock-trading-data';
import TradeModal from '../components/trading/TradeModal';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

type AssetCategory = 'All' | 'Cryptocurrency' | 'Stablecoin' | 'Stocks' | 'CommodityBacked';

export const AssetsPage: React.FC = () => {
  const [assets, setAssets] = useState(mockData.assets);
  const [filteredAssets, setFilteredAssets] = useState(mockData.assets);
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [tradeOperation, setTradeOperation] = useState<'buy' | 'sell'>('buy');
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'change' | 'volume'>('volume');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const categories: AssetCategory[] = ['All', 'Cryptocurrency', 'Stablecoin', 'Stocks', 'CommodityBacked'];

  useEffect(() => {
    let filtered = [...assets];

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(asset => asset.category === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter(asset =>
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          return sortOrder === 'asc' ?
            (aVal < bVal ? -1 : 1) :
            (bVal < aVal ? -1 : 1);
        case 'price':
          aVal = Number(a.current_price);
          bVal = Number(b.current_price);
          break;
        case 'change':
          aVal = a.price_24h_change;
          bVal = b.price_24h_change;
          break;
        case 'volume':
          aVal = Number(a.volume_24h);
          bVal = Number(b.volume_24h);
          break;
        default:
          aVal = 0;
          bVal = 0;
      }
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    setFilteredAssets(filtered);
  }, [assets, selectedCategory, searchQuery, sortBy, sortOrder]);

  const handleTrade = (asset: any, operation: 'buy' | 'sell') => {
    const assetBundle = {
      id: 999,
      name: asset.name,
      allocations: [{ asset_id: asset.id, percentage: 100 }],
      nav_per_token: asset.current_price,
      total_nav_usd: asset.market_cap,
      total_tokens: BigInt(1000000e8),
      holder_count: 100,
      volume_24h: asset.volume_24h,
    };

    setSelectedAsset(assetBundle);
    setTradeOperation(operation);
    setShowTradeModal(true);
  };

  const formatPriceChange = (change: number) => {
    const color = change >= 0 ? 'text-green-400' : 'text-red-400';
    const arrow = change >= 0 ? '↑' : '↓';
    return (
      <span className={`${color} text-sm font-medium`}>
        {arrow} {Math.abs(change).toFixed(2)}%
      </span>
    );
  };

  const AssetCard = ({ asset }: { asset: typeof mockData.assets[0] }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="bg-gray-900 border-gray-800 hover:border-cyan-500/30 transition-all">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {asset.symbol.slice(0, 2)}
                </span>
              </div>
              <div>
                <h3 className="text-white font-semibold">{asset.symbol}</h3>
                <p className="text-gray-400 text-sm">{asset.name}</p>
              </div>
            </div>
            <span className="px-2 py-1 bg-gray-800 text-gray-400 text-xs rounded-lg">
              {asset.category}
            </span>
          </div>

          <div className="mb-4">
            <div className="text-2xl font-bold text-white font-mono">
              {mockData.helpers.formatCurrency(asset.current_price, 6)}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {formatPriceChange(asset.price_24h_change)}
              <span className="text-gray-500 text-xs">24h</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
            <div>
              <span className="text-gray-500">Volume</span>
              <div className="text-white font-mono">
                {mockData.helpers.formatCompact(asset.volume_24h)}
              </div>
            </div>
            <div>
              <span className="text-gray-500">Market Cap</span>
              <div className="text-white font-mono">
                {mockData.helpers.formatCompact(asset.market_cap)}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => handleTrade(asset, 'buy')}
              variant="primary"
              size="sm"
              className="flex-1"
            >
              Buy
            </Button>
            <Button
              onClick={() => handleTrade(asset, 'sell')}
              variant="secondary"
              size="sm"
              className="flex-1"
            >
              Sell
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Assets Market
          </h1>
          <p className="text-gray-400 mt-2">
            Trade individual assets or use them to build your bundles
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-8 space-y-4"
        >
          <div className="relative">
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-10 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
            <svg
              className="absolute left-3 top-3.5 w-4 h-4 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedCategory === category
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                    : 'bg-gray-900 text-gray-400 border border-gray-800 hover:border-gray-700'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">Sort by:</span>
            <div className="flex gap-2">
              {(['volume', 'price', 'change', 'name'] as const).map((sort) => (
                <button
                  key={sort}
                  onClick={() => {
                    if (sortBy === sort) {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy(sort);
                      setSortOrder('desc');
                    }
                  }}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                    sortBy === sort
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-500 hover:text-white'
                  }`}
                >
                  {sort.charAt(0).toUpperCase() + sort.slice(1)}
                  {sortBy === sort && (
                    <span className="ml-1">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-4 gap-4 mb-8"
        >
          <Card className="bg-gray-900 border-gray-800 p-4">
            <div className="text-gray-400 text-sm">Total Assets</div>
            <div className="text-2xl font-bold text-white">{assets.length}</div>
          </Card>
          <Card className="bg-gray-900 border-gray-800 p-4">
            <div className="text-gray-400 text-sm">Total Volume (24h)</div>
            <div className="text-2xl font-bold text-white">
              {mockData.helpers.formatCompact(
                assets.reduce((sum, a) => sum + Number(a.volume_24h), 0)
              )}
            </div>
          </Card>
          <Card className="bg-gray-900 border-gray-800 p-4">
            <div className="text-gray-400 text-sm">Top Gainer (24h)</div>
            <div className="text-2xl font-bold text-green-400">
              +{Math.max(...assets.map(a => a.price_24h_change)).toFixed(2)}%
            </div>
          </Card>
          <Card className="bg-gray-900 border-gray-800 p-4">
            <div className="text-gray-400 text-sm">Active Markets</div>
            <div className="text-2xl font-bold text-white">
              {assets.filter(a => a.is_active).length}
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredAssets.map((asset, index) => (
            <motion.div
              key={asset.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <AssetCard asset={asset} />
            </motion.div>
          ))}
        </motion.div>

        {filteredAssets.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="text-gray-500 text-lg">No assets found</div>
            <p className="text-gray-600 mt-2">Try adjusting your filters or search query</p>
          </motion.div>
        )}

        {selectedAsset && (
          <TradeModal
            bundle={selectedAsset}
            operation={tradeOperation}
            isOpen={showTradeModal}
            onClose={() => {
              setShowTradeModal(false);
              setSelectedAsset(null);
            }}
            onSuccess={(txId) => {
              console.log('Trade successful:', txId);
              // Update user portfolio or refresh data
            }}
          />
        )}
      </div>
    </div>
  );
};

export default AssetsPage;