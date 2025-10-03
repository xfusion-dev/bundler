import { Link } from 'react-router-dom';

interface Bundle {
  id: number;
  name: string;
  description: string;
  tokens: Array<{
    symbol: string;
    name: string;
    allocation: number;
    logo: string;
  }>;
  totalValue: number;
  change24h: number;
  subscribers: number;
  creator: string;
}

interface BundleRowProps {
  bundle: Bundle;
}

export default function BundleRow({ bundle }: BundleRowProps) {
  const symbol = bundle.name.replace(/\s+/g, '').substring(0, 4).toUpperCase();
  const price = bundle.totalValue.toFixed(2);
  const marketCap = bundle.subscribers * parseFloat(price);

  return (
    <Link to={`/bundle/${bundle.id}`}>
      <div className="border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-all group">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 bg-gradient-to-br from-white/20 to-white/10 border border-white/30 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">
                {symbol}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-bold group-hover:text-gray-300 transition-colors truncate">
                {bundle.name}
              </h3>
              <p className="text-gray-500 text-xs truncate">{bundle.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-6 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1.5">
                {bundle.tokens.slice(0, 4).map((token, idx) => (
                  <div
                    key={idx}
                    className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 border-2 border-black flex items-center justify-center"
                    style={{ zIndex: bundle.tokens.length - idx }}
                    title={token.symbol}
                  >
                    <span className="text-[9px] text-white font-bold">
                      {token.symbol.charAt(0)}
                    </span>
                  </div>
                ))}
                {bundle.tokens.length > 4 && (
                  <div className="w-6 h-6 rounded-full bg-white/10 border-2 border-black flex items-center justify-center text-[9px] text-gray-400">
                    +{bundle.tokens.length - 4}
                  </div>
                )}
              </div>
            </div>

            <div className="text-center min-w-[100px]">
              <div className={`text-sm font-bold ${
                bundle.change24h >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {bundle.change24h >= 0 ? '+' : ''}{bundle.change24h.toFixed(2)}%
              </div>
              <div className="text-gray-500 text-xs">${price}</div>
            </div>

            <div className="text-right min-w-[100px]">
              <div className="text-white font-bold">
                ${marketCap >= 1000000
                  ? `${(marketCap / 1000000).toFixed(1)}M`
                  : marketCap >= 1000
                  ? `${(marketCap / 1000).toFixed(1)}K`
                  : marketCap.toLocaleString()}
              </div>
              <div className="text-gray-500 text-xs">Market Cap</div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
