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

  const topTokens = bundle.tokens.slice(0, 4);

  return (
    <Link to={`/bundle/${bundle.id}`}>
      <div className="flex items-center py-4 px-6 border-b border-white/10 hover:bg-white/5 transition-colors cursor-pointer">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-white/10 border border-white/20 rounded flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs">
              {symbol}
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="text-white font-medium">{bundle.name}</h3>
            <p className="text-sm text-gray-400">${symbol}</p>
          </div>
        </div>

        <div className="flex items-center gap-8 flex-shrink-0">
          <div className="flex -space-x-2 min-w-[120px]">
            {topTokens.map((token, idx) => (
              <div
                key={idx}
                className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 border-2 border-black flex items-center justify-center"
                style={{ zIndex: topTokens.length - idx }}
              >
                <span className="text-[10px] text-white font-bold">
                  {token.symbol.charAt(0)}
                </span>
              </div>
            ))}
          </div>

          <div className="text-left min-w-[120px]">
            <div className="text-sm text-gray-300">
              {bundle.tokens.map(t => t.symbol).slice(0, 2).join(', ')}
            </div>
          </div>

          <div className="text-left min-w-[140px]">
            <div className={`text-sm font-medium ${
              bundle.change24h >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {bundle.change24h >= 0 ? '+' : ''}{bundle.change24h.toFixed(2)}%
              <span className="text-gray-500 ml-1">(${price})</span>
            </div>
          </div>

          <div className="text-left min-w-[120px]">
            <div className="text-white font-medium">${(bundle.subscribers * parseFloat(price)).toLocaleString()}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
