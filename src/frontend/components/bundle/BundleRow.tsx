import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';

interface Bundle {
  id: number;
  name: string;
  symbol?: string;
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
  marketCapValue?: number;
}

interface BundleRowProps {
  bundle: Bundle;
}

export default function BundleRow({ bundle }: BundleRowProps) {
  const [hoveredToken, setHoveredToken] = useState<number | null>(null);
  const symbol = (bundle.symbol || bundle.name.replace(/\s+/g, '')).substring(0, 4).toUpperCase();
  const price = bundle.totalValue.toFixed(2);
  const marketCap = bundle.marketCapValue || 0;

  const formatMarketCap = (cap: number) => {
    if (cap >= 1_000_000) return `$${(cap / 1_000_000).toFixed(2)}M`;
    if (cap >= 1_000) return `$${(cap / 1_000).toFixed(1)}K`;
    return `$${cap.toFixed(0)}`;
  };

  return (
    <Link to={`/bundle/${bundle.id}`} className="block">
      <div className="border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.03] hover:from-white/[0.12] hover:to-white/[0.06] transition-all duration-300 group relative overflow-visible p-5">
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
            <div className="flex items-center gap-3 w-48 justify-center relative overflow-visible">
              <div className="flex -space-x-2.5">
                {bundle.tokens.slice(0, 5).map((token, idx) => (
                  <div
                    key={idx}
                    className="relative"
                    onMouseEnter={() => setHoveredToken(idx)}
                    onMouseLeave={() => setHoveredToken(null)}
                  >
                    <div
                      className="w-10 h-10 rounded-full bg-white/10 border-2 border-black flex items-center justify-center group-hover:border-white/20 transition-colors overflow-hidden cursor-pointer"
                      style={{ zIndex: bundle.tokens.length - idx }}
                    >
                      {token.logo ? (
                        <img
                          src={token.logo}
                          alt={token.symbol}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `<span class="text-xs text-white font-bold">${token.symbol.slice(0, 2)}</span>`;
                            }
                          }}
                        />
                      ) : (
                        <span className="text-xs text-white font-bold">
                          {token.symbol.slice(0, 2)}
                        </span>
                      )}
                    </div>
                    {hoveredToken === idx && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black border border-white/20 whitespace-nowrap z-50 pointer-events-none">
                        <div className="text-white text-xs font-bold">{token.symbol}</div>
                        <div className="text-gray-400 text-[10px]">{token.allocation.toFixed(1)}%</div>
                      </div>
                    )}
                  </div>
                ))}
                {bundle.tokens.length > 5 && (
                  <div
                    className="w-10 h-10 rounded-full bg-white/10 border-2 border-black flex items-center justify-center text-xs text-gray-400 group-hover:border-white/20 transition-colors"
                    style={{ zIndex: 0 }}
                  >
                    +{bundle.tokens.length - 5}
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

            <div className="text-right min-w-[120px]">
              <div className="text-white text-lg font-bold">
                {formatMarketCap(marketCap)}
              </div>
            </div>

            <div className="w-8 h-8 border border-white/20 flex items-center justify-center group-hover:border-white/40 group-hover:bg-white/10 transition-all flex-shrink-0">
              <ArrowRight className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
