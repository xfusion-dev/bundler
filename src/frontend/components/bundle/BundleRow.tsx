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
      <div className="border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.03] hover:from-white/[0.12] hover:to-white/[0.06] transition-all duration-300 group relative overflow-hidden p-5">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="relative flex items-center justify-between gap-8">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 bg-gradient-to-br from-white/20 to-white/5 border border-white/20 flex items-center justify-center flex-shrink-0 group-hover:border-white/40 transition-colors">
              <span className="text-white font-bold">
                {symbol}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white text-lg font-bold mb-1 group-hover:text-gray-200 transition-colors truncate">
                {bundle.name}
              </h3>
              <p className="text-gray-500 text-xs truncate">{bundle.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-8 flex-shrink-0">
            <div className="flex items-center gap-3 w-24 justify-center">
              <div className="flex -space-x-1.5">
                {bundle.tokens.slice(0, 3).map((token, idx) => (
                  <div
                    key={idx}
                    className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 border-2 border-black flex items-center justify-center group-hover:border-white/20 transition-colors"
                    style={{ zIndex: bundle.tokens.length - idx }}
                    title={token.symbol}
                  >
                    <span className="text-[9px] text-white font-bold">
                      {token.symbol.charAt(0)}
                    </span>
                  </div>
                ))}
                {bundle.tokens.length > 3 && (
                  <div className="w-7 h-7 rounded-full bg-white/10 border-2 border-black flex items-center justify-center text-[9px] text-gray-400 group-hover:border-white/20 transition-colors">
                    +{bundle.tokens.length - 3}
                  </div>
                )}
              </div>
            </div>

            <div className="text-right min-w-[120px]">
              <div className="text-white text-xl font-bold mb-1">
                ${price}
              </div>
              <div className="text-gray-500 text-xs">per token</div>
            </div>

            <div className="text-right min-w-[100px]">
              <div className={`text-lg font-bold ${
                bundle.change24h >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {bundle.change24h >= 0 ? '+' : ''}{bundle.change24h.toFixed(2)}%
              </div>
            </div>

            <div className="text-right min-w-[100px]">
              <div className="text-white text-lg font-bold">
                {bundle.subscribers >= 1000
                  ? `${(bundle.subscribers / 1000).toFixed(1)}K`
                  : bundle.subscribers.toLocaleString()}
              </div>
            </div>

            <div className="w-8 h-8 border border-white/20 flex items-center justify-center group-hover:border-white/40 group-hover:bg-white/10 transition-all flex-shrink-0">
              <span className="text-white">→</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
