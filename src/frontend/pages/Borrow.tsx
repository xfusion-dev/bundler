import { useState } from 'react';
import { Shield, AlertTriangle, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CollateralAsset {
  symbol: string;
  amount: number;
  valueUSD: number;
  ltv: number;
}

interface WalletAsset {
  symbol: string;
  balance: number;
  price: number;
  ltv: number;
}

const MOCK_COLLATERAL: CollateralAsset[] = [
  { symbol: 'DeFi Leaders', amount: 150.5, valueUSD: 6820.66, ltv: 75 },
  { symbol: 'Stable Growth', amount: 500.0, valueUSD: 6075.00, ltv: 80 },
  { symbol: 'High Risk High Reward', amount: 75.25, valueUSD: 5108.73, ltv: 60 }
];

const MOCK_WALLET_ASSETS: WalletAsset[] = [
  { symbol: 'DeFi Leaders', balance: 250, price: 45.32, ltv: 75 },
  { symbol: 'Stable Growth', balance: 1000, price: 12.15, ltv: 80 },
  { symbol: 'High Risk High Reward', balance: 100, price: 67.89, ltv: 60 },
  { symbol: 'AI & Tech Bundle', balance: 50, price: 89.45, ltv: 70 }
];

export default function Borrow() {
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'borrow' | 'repay'>('borrow');
  const [collateralDrawerOpen, setCollateralDrawerOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<WalletAsset | null>(null);
  const [collateralAmount, setCollateralAmount] = useState('');

  const totalCollateralValue = MOCK_COLLATERAL.reduce((sum, asset) => sum + asset.valueUSD, 0);
  const borrowLimit = MOCK_COLLATERAL.reduce((sum, asset) => sum + (asset.valueUSD * asset.ltv / 100), 0);
  const currentDebt = 2000;
  const availableToBorrow = borrowLimit - currentDebt;
  const healthFactor = borrowLimit > 0 ? borrowLimit / Math.max(currentDebt, 1) : 0;
  const borrowAPR = 8.5;

  const getHealthColor = (health: number) => {
    if (health >= 2) return 'text-green-400';
    if (health >= 1.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  const calculateNewHealthFactor = () => {
    if (!amount) return healthFactor;
    const numAmount = parseFloat(amount);
    if (mode === 'borrow') {
      const newDebt = currentDebt + numAmount;
      return borrowLimit / Math.max(newDebt, 1);
    } else {
      const newDebt = Math.max(currentDebt - numAmount, 0);
      return newDebt > 0 ? borrowLimit / newDebt : 999;
    }
  };

  const newHealthFactor = calculateNewHealthFactor();

  return (
    <div className="min-h-screen bg-black">
      <div className="px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 flex items-end justify-between">
            <div>
              <h1 className="text-6xl font-bold text-white mb-4">Borrow ckUSDC</h1>
              <p className="text-gray-400 text-lg">
                Borrow ckUSDC against your bundle collateral at {borrowAPR}% APR
              </p>
            </div>
            <div className="text-right">
              <div className="text-gray-500 text-xs font-mono uppercase mb-2 tracking-wider">Health Factor</div>
              <div className="flex items-center justify-end gap-3">
                <span className={`text-7xl font-bold tabular-nums ${getHealthColor(healthFactor)}`}>
                  {healthFactor.toFixed(2)}
                </span>
                {healthFactor >= 2 ? (
                  <Shield className="w-10 h-10 text-green-400" />
                ) : healthFactor >= 1.5 ? (
                  <AlertTriangle className="w-10 h-10 text-yellow-400" />
                ) : (
                  <AlertTriangle className="w-10 h-10 text-red-400" />
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-8">
              <div className="border border-white/10 bg-white/5 p-8">
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <div className="text-gray-400 text-xs font-mono uppercase mb-2">Current Debt</div>
                    <div className="text-white text-4xl font-bold">
                      ${currentDebt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-400 text-xs font-mono uppercase mb-2">Available</div>
                    <div className="text-green-400 text-4xl font-bold">
                      ${availableToBorrow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden mb-6">
                  <div
                    className="h-full bg-gradient-to-r from-orange-400 to-red-400 transition-all"
                    style={{ width: `${(currentDebt / borrowLimit) * 100}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-gray-400 text-xs mb-1">Borrow APR</div>
                    <div className="text-orange-400 text-xl font-bold">
                      {borrowAPR}%
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs mb-1">Interest (30d)</div>
                    <div className="text-white text-xl font-bold">
                      ${((currentDebt * borrowAPR / 100) / 12).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-white/10 bg-white/5 p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Your Collateral</h2>
                  <button
                    onClick={() => setCollateralDrawerOpen(true)}
                    className="border border-white/20 px-4 py-2 text-white text-sm hover:bg-white/10 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Collateral
                  </button>
                </div>

                <div className="space-y-4 mb-6">
                  {MOCK_COLLATERAL.map((asset) => (
                    <div key={asset.symbol} className="border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-bold">{asset.symbol.slice(0, 2)}</span>
                          </div>
                          <div>
                            <div className="text-white font-bold">{asset.symbol}</div>
                            <div className="text-gray-400 text-xs">{asset.amount.toLocaleString()} tokens</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-mono">${asset.valueUSD.toLocaleString()}</div>
                          <div className="text-gray-400 text-xs">LTV {asset.ltv}%</div>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-white/10">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-xs">Borrow Power</span>
                          <span className="text-green-400 font-mono font-bold">
                            ${(asset.valueUSD * asset.ltv / 100).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                  <div className="border border-white/10 bg-black/40 p-4">
                    <div className="text-gray-400 text-xs mb-2">Total Collateral</div>
                    <div className="text-white font-mono text-lg">
                      ${totalCollateralValue.toLocaleString()}
                    </div>
                  </div>
                  <div className="border border-white/10 bg-black/40 p-4">
                    <div className="text-gray-400 text-xs mb-2">Borrow Limit</div>
                    <div className="text-white font-mono text-lg">
                      ${borrowLimit.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="border border-white/10 bg-white/5 sticky top-8">
                <div className="p-6 border-b border-white/10">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMode('borrow')}
                      className={`flex-1 px-6 py-3 text-sm font-bold transition-colors ${
                        mode === 'borrow'
                          ? 'bg-white text-black'
                          : 'bg-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      Borrow
                    </button>
                    <button
                      onClick={() => setMode('repay')}
                      className={`flex-1 px-6 py-3 text-sm font-bold transition-colors ${
                        mode === 'repay'
                          ? 'bg-white text-black'
                          : 'bg-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      Repay
                    </button>
                  </div>
                </div>

                <div className="p-8 space-y-6">
                  {mode === 'borrow' ? (
                    <>
                      <div className="border border-green-400/20 bg-green-400/5 p-4">
                        <div className="text-gray-400 text-sm mb-1">Available to Borrow</div>
                        <div className="text-green-400 text-3xl font-bold">
                          ${availableToBorrow.toLocaleString()}
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <label className="text-gray-400 text-sm font-mono uppercase">Amount to Borrow</label>
                          <span className="text-gray-500 text-xs">
                            Max: ${availableToBorrow.toLocaleString()}
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-black border border-white/20 p-6 text-white text-3xl focus:border-white focus:outline-none"
                          />
                          <button
                            onClick={() => setAmount(availableToBorrow.toString())}
                            className="absolute right-6 top-1/2 -translate-y-1/2 text-sm text-gray-400 hover:text-white border border-white/20 px-3 py-1"
                          >
                            MAX
                          </button>
                        </div>
                      </div>

                      <div className="border border-white/10 bg-black/40 p-4 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400 text-sm">Borrow APR</span>
                          <span className="text-orange-400 font-bold">{borrowAPR}%</span>
                        </div>
                        {amount && (
                          <>
                            <div className="flex justify-between pt-2 border-t border-white/10">
                              <span className="text-gray-400 text-sm">Interest (30d)</span>
                              <span className="text-white font-bold">
                                ${((parseFloat(amount) * borrowAPR / 100) / 12).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400 text-sm">New Health Factor</span>
                              <span className={`font-bold ${getHealthColor(newHealthFactor)}`}>
                                {newHealthFactor.toFixed(2)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      <button
                        className="btn-unique w-full py-6 text-xl"
                        disabled={availableToBorrow <= 0 || (amount && parseFloat(amount) > availableToBorrow)}
                      >
                        Borrow ckUSDC
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="border border-orange-400/20 bg-orange-400/5 p-4">
                        <div className="text-gray-400 text-sm mb-1">Current Debt</div>
                        <div className="text-orange-400 text-3xl font-bold">
                          ${currentDebt.toLocaleString()}
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <label className="text-gray-400 text-sm font-mono uppercase">Amount to Repay</label>
                          <span className="text-gray-500 text-xs">
                            Debt: ${currentDebt.toLocaleString()}
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-black border border-white/20 p-6 text-white text-3xl focus:border-white focus:outline-none"
                          />
                          <button
                            onClick={() => setAmount(currentDebt.toString())}
                            className="absolute right-6 top-1/2 -translate-y-1/2 text-sm text-gray-400 hover:text-white border border-white/20 px-3 py-1"
                          >
                            MAX
                          </button>
                        </div>
                      </div>

                      <div className="border border-white/10 bg-black/40 p-4 space-y-2">
                        {amount && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-400 text-sm">Remaining Debt</span>
                              <span className="text-white font-bold">
                                ${Math.max(currentDebt - parseFloat(amount), 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-white/10">
                              <span className="text-gray-400 text-sm">New Health Factor</span>
                              <span className={`font-bold ${getHealthColor(newHealthFactor)}`}>
                                {newHealthFactor > 100 ? '∞' : newHealthFactor.toFixed(2)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      <button className="btn-unique w-full py-6 text-xl">
                        Repay ckUSDC
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {collateralDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setCollateralDrawerOpen(false);
                setSelectedAsset(null);
                setCollateralAmount('');
              }}
              className="fixed inset-0 bg-black/80 z-40"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-black border-l border-white/10 z-50 overflow-y-auto"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-bold text-white">Add Collateral</h2>
                  <button
                    onClick={() => {
                      setCollateralDrawerOpen(false);
                      setSelectedAsset(null);
                      setCollateralAmount('');
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {!selectedAsset ? (
                  <div className="space-y-4">
                    <p className="text-gray-400 mb-6">Select a bundle to add as collateral</p>
                    {MOCK_WALLET_ASSETS.map((asset) => (
                      <div
                        key={asset.symbol}
                        onClick={() => setSelectedAsset(asset)}
                        className="border border-white/10 bg-white/5 p-6 hover:bg-white/10 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                              <span className="text-white font-bold">{asset.symbol.slice(0, 2)}</span>
                            </div>
                            <div>
                              <div className="text-white font-bold text-lg">{asset.symbol}</div>
                              <div className="text-gray-400 text-sm">{asset.balance} tokens available</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-white font-mono text-lg">
                              ${(asset.balance * asset.price).toLocaleString()}
                            </div>
                            <div className="text-gray-400 text-xs">LTV {asset.ltv}%</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <button
                      onClick={() => {
                        setSelectedAsset(null);
                        setCollateralAmount('');
                      }}
                      className="text-gray-400 hover:text-white text-sm mb-4"
                    >
                      ← Back to assets
                    </button>

                    <div className="border border-white/10 bg-white/5 p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">{selectedAsset.symbol.slice(0, 2)}</span>
                        </div>
                        <div>
                          <div className="text-white font-bold text-xl">{selectedAsset.symbol}</div>
                          <div className="text-gray-400 text-sm">{selectedAsset.balance} tokens available</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                        <div>
                          <div className="text-gray-400 text-xs mb-1">Price</div>
                          <div className="text-white font-mono">${selectedAsset.price}</div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-xs mb-1">Balance</div>
                          <div className="text-white font-mono">{selectedAsset.balance}</div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-xs mb-1">Max LTV</div>
                          <div className="text-white font-mono">{selectedAsset.ltv}%</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <label className="text-gray-400 text-sm font-mono uppercase">Amount</label>
                        <span className="text-gray-500 text-xs">
                          Available: {selectedAsset.balance} tokens
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          value={collateralAmount}
                          onChange={(e) => setCollateralAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-black border border-white/20 p-6 text-white text-3xl focus:border-white focus:outline-none"
                        />
                        <button
                          onClick={() => setCollateralAmount(selectedAsset.balance.toString())}
                          className="absolute right-6 top-1/2 -translate-y-1/2 text-sm text-gray-400 hover:text-white border border-white/20 px-3 py-1"
                        >
                          MAX
                        </button>
                      </div>
                    </div>

                    {collateralAmount && (
                      <div className="border border-white/10 bg-black/40 p-4 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400 text-sm">Collateral Value</span>
                          <span className="text-white font-bold">
                            ${(parseFloat(collateralAmount) * selectedAsset.price).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400 text-sm">Borrow Power</span>
                          <span className="text-green-400 font-bold">
                            ${((parseFloat(collateralAmount) * selectedAsset.price * selectedAsset.ltv) / 100).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}

                    <button className="btn-unique w-full py-6 text-xl">
                      Add {collateralAmount || '0'} {selectedAsset.symbol} as Collateral
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
