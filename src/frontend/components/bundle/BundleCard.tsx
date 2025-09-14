import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Bundle } from '../../lib/mock-bundles';

interface BundleCardProps {
  bundle: Bundle;
  index: number;
}

export default function BundleCard({ bundle, index }: BundleCardProps) {
  // Create a symbol from the bundle name (first 3-4 letters)
  const symbol = bundle.name.replace(/\s+/g, '').substring(0, 4).toUpperCase();
  
  // Convert tokens to assets format for visualization - show top 3 + "X more"
  const topAssets = bundle.tokens.slice(0, 3).map((token, idx) => ({
    symbol: token.symbol,
    percentage: token.allocation,
    color: getTokenColor(token.symbol, idx)
  }));
  
  const remainingCount = bundle.tokens.length - 3;

  function getTokenColor(symbol: string, fallbackIndex: number) {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    
    // Specific colors for known tokens
    const tokenColors: Record<string, string> = {
      'BTC': '#f7931a',
      'ETH': '#627eea',
      'SOL': '#9945ff',
      'AAPLX': '#007aff',
      'MSFTX': '#00bcf2',
      'GOOGLX': '#4285f4',
      'NVDAX': '#76b900',
      'TSLAX': '#cc0000',
      'UNI': '#ff007a',
      'AAVE': '#b6509e',
      'DOGE': '#c2a633',
      'SHIB': '#ffa409',
      'PEPE': '#00b894',
    };

    return tokenColors[symbol] || colors[fallbackIndex % colors.length];
  }

  // Use calculated price from real asset prices
  const price = bundle.totalValue.toFixed(2);
  const subscribers = bundle.subscribers;

  return (
    <Link to={`/bundle/${bundle.id}`} className="block">
      <motion.div
        className="card-unique p-6 cursor-pointer hover:border-accent transition-all duration-300"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 * index }}
        whileHover={{ y: -2 }}
      >
      {/* Unique Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-elevated border border-primary flex items-center justify-center">
            <span className="text-primary font-bold text-sm text-data">
              {symbol}
            </span>
          </div>
          <div>
            <h3 className="heading-medium">{bundle.name}</h3>
            <p className="text-quaternary text-sm">Bundle Token</p>
          </div>
        </div>
        
        <div className={`text-sm font-semibold text-data ${
          bundle.change24h >= 0 ? 'text-green-400' : 'text-red-400'
        }`}>
          {bundle.change24h >= 0 ? '+' : ''}{bundle.change24h.toFixed(2)}%
        </div>
      </div>

      {/* Asset Composition */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-tertiary text-sm font-medium">Asset Allocation</span>
          <span className="text-ghost text-sm text-data">{bundle.tokens.length}</span>
        </div>
        
        {/* Unique Allocation Visualization */}
        <div className="space-y-3 min-h-[120px]">
          {topAssets.map((asset, idx) => (
            <div key={`${bundle.id}-${asset.symbol}`} className="flex items-center gap-4">
              <div className="w-16 text-xs text-data text-secondary">
                {asset.symbol}
              </div>
              <div className="flex-1 h-px bg-border-primary relative">
                <motion.div
                  className="absolute top-0 left-0 h-full"
                  style={{ backgroundColor: asset.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${asset.percentage.toString()}%` }}
                  transition={{ duration: 1.2, delay: 0.3 + idx * 0.1 }}
                />
              </div>
              <div className="w-12 text-xs text-data text-tertiary text-right">
                {asset.percentage}%
              </div>
            </div>
          ))}
           <div className="flex items-center gap-4 mt-2">
            <div className="w-16 text-xs text-tertiary">
              {remainingCount > 0 ? `+${remainingCount.toString()} more` : ''}
            </div>
            <div className="flex-1"></div>
            <div className="w-12"></div>
          </div>
        </div>
      </div>

      {/* Data Metrics */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <div className="text-ghost text-xs mb-2 font-mono">PRICE</div>
          <div className="text-xl font-bold text-primary text-data">
            ${price}
          </div>
        </div>
        <div>
          <div className="text-ghost text-xs mb-2 font-mono">SUBSCRIBERS</div>
          <div className="text-xl font-bold text-primary text-data">
            {subscribers.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-4">
        <div className="btn-unique flex-1 text-center">
          SUBSCRIBE
        </div>
        <div className="btn-outline-unique flex-1 text-center">
          DETAILS
        </div>
      </div>

      {/* Footer Data */}
      <div className="pt-4 border-t border-primary text-xs text-ghost font-mono">
        Creator: {bundle.creator.slice(0, 8)}...{bundle.creator.slice(-4)}
      </div>
      </motion.div>
    </Link>
  );
}  