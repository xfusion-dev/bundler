import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown } from 'lucide-react';

interface SupplyAsset {
  symbol: string;
  balance: number;
  balanceUSD: number;
  apy: number;
  isCollateral: boolean;
}

interface BorrowAsset {
  symbol: string;
  debt: number;
  debtUSD: number;
  apr: number;
}

interface AvailableAsset {
  symbol: string;
  walletBalance: number;
  apy?: number;
  apr?: number;
  availableUSD?: number;
}

const MOCK_SUPPLIES: SupplyAsset[] = [
  { symbol: 'ckUSDC', balance: 5000, balanceUSD: 5000, apy: 4.2, isCollateral: true },
  { symbol: 'ckBTC', balance: 0.15, balanceUSD: 9750, apy: 1.8, isCollateral: true }
];

const MOCK_BORROWS: BorrowAsset[] = [
  { symbol: 'ckUSDC', debt: 2000, debtUSD: 2000, apr: 8.5 }
];

const MOCK_AVAILABLE_SUPPLY: AvailableAsset[] = [
  { symbol: 'ckUSDC', walletBalance: 10000, apy: 4.2 },
  { symbol: 'ckBTC', walletBalance: 0.5, apy: 1.8 },
  { symbol: 'ckETH', walletBalance: 2.5, apy: 3.1 },
  { symbol: 'ckUSDT', walletBalance: 5000, apy: 3.9 }
];

const MOCK_AVAILABLE_BORROW: AvailableAsset[] = [
  { symbol: 'ckUSDC', availableUSD: 11250, apr: 8.5 },
  { symbol: 'ckUSDT', availableUSD: 8400, apr: 9.2 },
  { symbol: 'ckETH', availableUSD: 4500, apr: 12.3 }
];

export default function Lending() {
  const [supplyModalOpen, setSupplyModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [borrowModalOpen, setBorrowModalOpen] = useState(false);
  const [repayModalOpen, setRepayModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<string>('');

  const netWorth = 12750;
  const netAPY = 2.1;
  const healthFactor = 2.81;

  const getHealthColor = (health: number) => {
    if (health >= 2) return 'text-green-400';
    if (health >= 1.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  const openSupplyModal = (symbol: string) => {
    setSelectedAsset(symbol);
    setSupplyModalOpen(true);
  };

  const openBorrowModal = (symbol: string) => {
    setSelectedAsset(symbol);
    setBorrowModalOpen(true);
  };

  return (
    <>
      <div className="min-h-screen bg-black">
        <div className="px-6 py-16">
          <div className="max-w-7xl mx-auto">
            <div className="mb-12">
              <h1 className="text-6xl font-bold text-white mb-4">Lending</h1>
              <p className="text-gray-400 text-lg">
                Supply assets to earn interest or borrow against your collateral
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="border border-white/10 bg-white/5 p-6">
                <div className="text-gray-400 text-xs font-mono uppercase mb-2">Net Worth</div>
                <div className="text-white text-3xl font-bold">${netWorth.toLocaleString()}</div>
              </div>

              <div className="border border-white/10 bg-white/5 p-6">
                <div className="text-gray-400 text-xs font-mono uppercase mb-2">Net APY</div>
                <div className="text-green-400 text-3xl font-bold">{netAPY}%</div>
              </div>

              <div className="border border-white/10 bg-white/5 p-6">
                <div className="text-gray-400 text-xs font-mono uppercase mb-2">Health Factor</div>
                <div className={`text-3xl font-bold ${getHealthColor(healthFactor)}`}>
                  {healthFactor.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-8">
                <div className="border border-white/10 bg-white/5">
                  <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">Your Supplies</h2>
                    <button className="text-gray-400 hover:text-white text-sm">
                      Hide <ChevronDown className="w-4 h-4 inline" />
                    </button>
                  </div>

                  {MOCK_SUPPLIES.length === 0 ? (
                    <div className="p-12 text-center">
                      <p className="text-gray-500">Nothing supplied yet</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="text-left p-4 text-gray-400 text-xs font-mono uppercase">Asset</th>
                            <th className="text-right p-4 text-gray-400 text-xs font-mono uppercase">Balance</th>
                            <th className="text-right p-4 text-gray-400 text-xs font-mono uppercase">APY</th>
                            <th className="text-center p-4 text-gray-400 text-xs font-mono uppercase">Collateral</th>
                            <th className="text-right p-4"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {MOCK_SUPPLIES.map((asset) => (
                            <tr key={asset.symbol} className="border-b border-white/10 hover:bg-white/5">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">{asset.symbol.slice(0, 2)}</span>
                                  </div>
                                  <span className="text-white font-bold">{asset.symbol}</span>
                                </div>
                              </td>
                              <td className="p-4 text-right">
                                <div className="text-white font-mono">{asset.balance.toLocaleString()}</div>
                                <div className="text-gray-500 text-sm">${asset.balanceUSD.toLocaleString()}</div>
                              </td>
                              <td className="p-4 text-right">
                                <div className="text-green-400 font-mono">{asset.apy}%</div>
                              </td>
                              <td className="p-4 text-center">
                                <label className="relative inline-block w-10 h-5">
                                  <input type="checkbox" checked={asset.isCollateral} readOnly className="sr-only" />
                                  <div className={`block w-full h-full rounded-full transition-colors ${asset.isCollateral ? 'bg-green-400' : 'bg-white/20'}`}>
                                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${asset.isCollateral ? 'translate-x-5' : ''}`} />
                                  </div>
                                </label>
                              </td>
                              <td className="p-4 text-right">
                                <button className="text-white text-sm hover:text-gray-300 mr-3">Swap</button>
                                <button className="text-white text-sm hover:text-gray-300">Withdraw</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="border border-white/10 bg-white/5">
                  <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">Assets to Supply</h2>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left p-4 text-gray-400 text-xs font-mono uppercase">Asset</th>
                          <th className="text-right p-4 text-gray-400 text-xs font-mono uppercase">Wallet Balance</th>
                          <th className="text-right p-4 text-gray-400 text-xs font-mono uppercase">APY</th>
                          <th className="text-right p-4"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {MOCK_AVAILABLE_SUPPLY.map((asset) => (
                          <tr key={asset.symbol} className="border-b border-white/10 hover:bg-white/5">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">{asset.symbol.slice(0, 2)}</span>
                                </div>
                                <span className="text-white font-bold">{asset.symbol}</span>
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <div className="text-white font-mono">{asset.walletBalance.toLocaleString()}</div>
                            </td>
                            <td className="p-4 text-right">
                              <div className="text-green-400 font-mono">{asset.apy}%</div>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => openSupplyModal(asset.symbol)}
                                className="border border-white/20 px-4 py-2 text-white text-sm hover:bg-white/10"
                              >
                                Supply
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="border border-white/10 bg-white/5">
                  <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">Your Borrows</h2>
                    <button className="text-gray-400 hover:text-white text-sm">
                      Hide <ChevronDown className="w-4 h-4 inline" />
                    </button>
                  </div>

                  {MOCK_BORROWS.length === 0 ? (
                    <div className="p-12 text-center">
                      <p className="text-gray-500">Nothing borrowed yet</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="text-left p-4 text-gray-400 text-xs font-mono uppercase">Asset</th>
                            <th className="text-right p-4 text-gray-400 text-xs font-mono uppercase">Debt</th>
                            <th className="text-right p-4 text-gray-400 text-xs font-mono uppercase">APR</th>
                            <th className="text-right p-4"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {MOCK_BORROWS.map((asset) => (
                            <tr key={asset.symbol} className="border-b border-white/10 hover:bg-white/5">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">{asset.symbol.slice(0, 2)}</span>
                                  </div>
                                  <span className="text-white font-bold">{asset.symbol}</span>
                                </div>
                              </td>
                              <td className="p-4 text-right">
                                <div className="text-white font-mono">{asset.debt.toLocaleString()}</div>
                                <div className="text-gray-500 text-sm">${asset.debtUSD.toLocaleString()}</div>
                              </td>
                              <td className="p-4 text-right">
                                <div className="text-orange-400 font-mono">{asset.apr}%</div>
                              </td>
                              <td className="p-4 text-right">
                                <button className="text-white text-sm hover:text-gray-300 mr-3">Swap</button>
                                <button className="text-white text-sm hover:text-gray-300">Repay</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="border border-white/10 bg-white/5">
                  <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">Assets to Borrow</h2>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left p-4 text-gray-400 text-xs font-mono uppercase">Asset</th>
                          <th className="text-right p-4 text-gray-400 text-xs font-mono uppercase">Available</th>
                          <th className="text-right p-4 text-gray-400 text-xs font-mono uppercase">APR</th>
                          <th className="text-right p-4"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {MOCK_AVAILABLE_BORROW.map((asset) => (
                          <tr key={asset.symbol} className="border-b border-white/10 hover:bg-white/5">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">{asset.symbol.slice(0, 2)}</span>
                                </div>
                                <span className="text-white font-bold">{asset.symbol}</span>
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <div className="text-white font-mono">${asset.availableUSD?.toLocaleString()}</div>
                            </td>
                            <td className="p-4 text-right">
                              <div className="text-orange-400 font-mono">{asset.apr}%</div>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => openBorrowModal(asset.symbol)}
                                className="border border-white/20 px-4 py-2 text-white text-sm hover:bg-white/10"
                              >
                                Borrow
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {supplyModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSupplyModalOpen(false)}
              className="fixed inset-0 bg-black/80 z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-black border border-white/10 z-50 p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Supply {selectedAsset}</h3>
                <button onClick={() => setSupplyModalOpen(false)} className="text-gray-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-gray-400 text-sm font-mono uppercase mb-3">Amount</label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full bg-white/5 border border-white/20 p-4 text-white text-2xl focus:border-white focus:outline-none"
                    />
                    <button className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 hover:text-white">
                      MAX
                    </button>
                  </div>
                  <div className="text-gray-500 text-sm mt-2">Wallet balance: 10,000 {selectedAsset}</div>
                </div>

                <div className="border border-white/10 bg-white/5 p-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Supply APY</span>
                    <span className="text-green-400 font-bold">4.2%</span>
                  </div>
                </div>

                <button className="btn-unique w-full py-4 text-lg">
                  Supply {selectedAsset}
                </button>
              </div>
            </motion.div>
          </>
        )}

        {borrowModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setBorrowModalOpen(false)}
              className="fixed inset-0 bg-black/80 z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-black border border-white/10 z-50 p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Borrow {selectedAsset}</h3>
                <button onClick={() => setBorrowModalOpen(false)} className="text-gray-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-gray-400 text-sm font-mono uppercase mb-3">Amount</label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full bg-white/5 border border-white/20 p-4 text-white text-2xl focus:border-white focus:outline-none"
                    />
                    <button className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 hover:text-white">
                      MAX
                    </button>
                  </div>
                  <div className="text-gray-500 text-sm mt-2">Available: $11,250</div>
                </div>

                <div className="border border-white/10 bg-white/5 p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Borrow APR</span>
                    <span className="text-orange-400 font-bold">8.5%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Health Factor</span>
                    <span className="text-green-400 font-bold">2.81 → 2.35</span>
                  </div>
                </div>

                <button className="btn-unique w-full py-4 text-lg">
                  Borrow {selectedAsset}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
