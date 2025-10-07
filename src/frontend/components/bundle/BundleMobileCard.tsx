import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

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
}

interface BundleMobileCardProps {
  bundle: Bundle;
}

export default function BundleMobileCard({ bundle }: BundleMobileCardProps) {
  const symbol = (bundle.symbol || bundle.name.replace(/\s+/g, '')).substring(0, 4).toUpperCase();
  const price = bundle.totalValue.toFixed(2);

  return (
    <Link to={`/bundle/${bundle.id}`}>
      <div className="border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.03] p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 bg-gradient-to-br from-white/20 to-white/5 border border-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">{symbol}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white text-lg font-bold mb-2 truncate">
                {bundle.name}
              </h3>
              <div className="flex -space-x-1.5 mb-2">
                {bundle.tokens.slice(0, 4).map((token, idx) => (
                  <div
                    key={idx}
                    className="w-6 h-6 rounded-full bg-white/10 border-2 border-black flex items-center justify-center overflow-hidden"
                    style={{ zIndex: bundle.tokens.length - idx }}
                    title={token.name}
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
                            parent.innerHTML = `<span class="text-[9px] text-white font-bold">${token.symbol.slice(0, 2)}</span>`;
                          }
                        }}
                      />
                    ) : (
                      <span className="text-[9px] text-white font-bold">
                        {token.symbol.slice(0, 2)}
                      </span>
                    )}
                  </div>
                ))}
                {bundle.tokens.length > 4 && (
                  <div
                    className="w-6 h-6 rounded-full bg-white/10 border-2 border-black flex items-center justify-center text-[9px] text-gray-400"
                    style={{ zIndex: 0 }}
                  >
                    +{bundle.tokens.length - 4}
                  </div>
                )}
              </div>
              <p className="text-gray-500 text-xs line-clamp-1">{bundle.description}</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <div>
            <div className="text-gray-400 text-xs mb-1">Price</div>
            <div className="text-white text-lg font-bold">${price}</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs mb-1">24h Change</div>
            <div className={`text-lg font-bold ${
              bundle.change24h >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {bundle.change24h >= 0 ? '+' : ''}{bundle.change24h.toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="text-gray-400 text-xs mb-1">Holders</div>
            <div className="text-white text-lg font-bold">
              {bundle.subscribers >= 1000
                ? `${(bundle.subscribers / 1000).toFixed(1)}K`
                : bundle.subscribers}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
