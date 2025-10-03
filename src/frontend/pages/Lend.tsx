import { useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../lib/AuthContext';

export default function Lend() {
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'lend' | 'withdraw'>('lend');
  const { isAuthenticated, login, loading } = useAuth();

  const handleLend = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (parseFloat(amount) > walletBalance) {
      toast.error('Insufficient balance');
      return;
    }
    toast.success(`Successfully lent ${amount} ckUSDC!`);
    setAmount('');
  };

  const handleWithdraw = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (parseFloat(amount) > lentBalance) {
      toast.error('Insufficient lent balance');
      return;
    }
    if (parseFloat(amount) > availableLiquidity) {
      toast.error('Withdrawal amount exceeds available liquidity');
      return;
    }
    toast.success(`Successfully withdrew ${amount} ckUSDC!`);
    setAmount('');
  };

  const walletBalance = 10000;
  const lentBalance = 5000;
  const currentAPY = 4.2;

  const totalPoolSize = 1250000;
  const totalBorrowed = 875000;
  const availableLiquidity = totalPoolSize - totalBorrowed;
  const utilizationRate = (totalBorrowed / totalPoolSize) * 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="px-6 py-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">⏳</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Loading...</h3>
              <p className="text-gray-400">Checking authentication status...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black">
        <div className="px-6 py-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">🔐</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Authentication Required</h3>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">
                You need to be logged in to lend ckUSDC. Please authenticate with Internet Identity to continue.
              </p>
              <button
                onClick={() => void login()}
                className="btn-unique px-8 py-3"
              >
                LOGIN WITH INTERNET IDENTITY
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <h1 className="text-6xl font-bold text-white mb-4">Lend ckUSDC</h1>
            <p className="text-gray-400 text-lg">
              Lend ckUSDC to the pool and earn {currentAPY}% APY from borrowers
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-8">
              <div className="border border-white/10 bg-white/5 p-8">
                <div className="mb-6">
                  <div className="text-gray-400 text-sm mb-2">Your Lent Balance</div>
                  <div className="text-white text-6xl font-bold mb-1">
                    ${lentBalance.toLocaleString()}
                  </div>
                  <div className="text-gray-500 text-sm">{lentBalance.toLocaleString()} ckUSDC</div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10">
                  <div>
                    <div className="text-gray-400 text-xs mb-1">Current APY</div>
                    <div className="text-green-400 text-2xl font-bold flex items-center gap-2">
                      {currentAPY}%
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs mb-1">Earnings (30d)</div>
                    <div className="text-white text-2xl font-bold">
                      ${((lentBalance * currentAPY / 100) / 12).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-white/10 bg-white/5 p-8">
                <h2 className="text-2xl font-bold text-white mb-6">Pool Statistics</h2>

                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400 text-sm">Utilization Rate</span>
                      <span className="text-white font-mono font-bold">{utilizationRate.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-400 to-orange-400 transition-all"
                        style={{ width: `${utilizationRate}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-white/10 bg-black/40 p-4">
                      <div className="text-gray-400 text-xs mb-2">Total Pool Size</div>
                      <div className="text-white font-mono text-lg">
                        ${totalPoolSize.toLocaleString()}
                      </div>
                    </div>
                    <div className="border border-white/10 bg-black/40 p-4">
                      <div className="text-gray-400 text-xs mb-2">Total Borrowed</div>
                      <div className="text-orange-400 font-mono text-lg">
                        ${totalBorrowed.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="border border-green-400/20 bg-green-400/5 p-4">
                    <div className="text-gray-400 text-xs mb-2">Available Liquidity</div>
                    <div className="text-green-400 font-mono text-xl font-bold">
                      ${availableLiquidity.toLocaleString()}
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
                      onClick={() => setMode('lend')}
                      className={`flex-1 px-6 py-3 text-sm font-bold transition-colors ${
                        mode === 'lend'
                          ? 'bg-white text-black'
                          : 'bg-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      Lend
                    </button>
                    <button
                      onClick={() => setMode('withdraw')}
                      className={`flex-1 px-6 py-3 text-sm font-bold transition-colors ${
                        mode === 'withdraw'
                          ? 'bg-white text-black'
                          : 'bg-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      Withdraw
                    </button>
                  </div>
                </div>

                <div className="p-8 space-y-6">
                  {mode === 'lend' ? (
                    <>
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <label className="text-gray-400 text-sm font-mono uppercase">Amount to Lend</label>
                          <span className="text-gray-500 text-xs">
                            Wallet: {walletBalance.toLocaleString()} ckUSDC
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
                            onClick={() => setAmount(walletBalance.toString())}
                            className="absolute right-6 top-1/2 -translate-y-1/2 text-sm text-gray-400 hover:text-white border border-white/20 px-3 py-1"
                          >
                            MAX
                          </button>
                        </div>
                      </div>

                      <div className="border border-white/10 bg-black/40 p-4 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400 text-sm">Current APY</span>
                          <span className="text-green-400 font-bold">{currentAPY}%</span>
                        </div>
                        {amount && (
                          <div className="flex justify-between pt-2 border-t border-white/10">
                            <span className="text-gray-400 text-sm">Estimated Earnings (30d)</span>
                            <span className="text-white font-bold">
                              ${((parseFloat(amount) * currentAPY / 100) / 12).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleLend}
                        className="btn-unique w-full py-6 text-xl"
                      >
                        Lend ckUSDC
                      </button>
                    </>
                  ) : (
                    <>
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <label className="text-gray-400 text-sm font-mono uppercase">Amount to Withdraw</label>
                          <span className="text-gray-500 text-xs">
                            Lent: {lentBalance.toLocaleString()} ckUSDC
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
                            onClick={() => setAmount(lentBalance.toString())}
                            className="absolute right-6 top-1/2 -translate-y-1/2 text-sm text-gray-400 hover:text-white border border-white/20 px-3 py-1"
                          >
                            MAX
                          </button>
                        </div>
                      </div>

                      <div className="border border-white/10 bg-black/40 p-4 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400 text-sm">Available Liquidity</span>
                          <span className="text-green-400 font-bold">
                            ${availableLiquidity.toLocaleString()}
                          </span>
                        </div>
                        {amount && parseFloat(amount) > availableLiquidity && (
                          <div className="text-orange-400 text-xs pt-2 border-t border-white/10">
                            ⚠️ Withdrawal amount exceeds available liquidity
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleWithdraw}
                        className="btn-unique w-full py-6 text-xl"
                        disabled={amount && parseFloat(amount) > availableLiquidity}
                      >
                        Withdraw ckUSDC
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
