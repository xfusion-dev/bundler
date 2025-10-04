import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import { icrc2Service } from '../../lib/icrc2-service';
import { backendService } from '../../lib/backend-service';
import toast from 'react-hot-toast';

interface WalletSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Holding {
  bundleId: number;
  bundleName: string;
  navTokens: number;
  totalValue: number;
}

export default function WalletSidebar({ isOpen, onClose }: WalletSidebarProps) {
  const [usdcBalance, setUsdcBalance] = useState<string>('0.00');
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [totalPortfolioValue, setTotalPortfolioValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [amount, setAmount] = useState('');
  const { isAuthenticated, principal } = useAuth();

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadWalletData();
    }
  }, [isOpen, isAuthenticated]);

  const loadWalletData = async () => {
    try {
      setLoading(true);

      const balance = await icrc2Service.getBalance();
      const formattedBalance = (Number(balance) / 1000000).toFixed(2);
      setUsdcBalance(formattedBalance);

      const userHoldings = await backendService.getUserHoldings();

      const transformedHoldings: Holding[] = userHoldings.map((h: any) => ({
        bundleId: h.bundle_id,
        bundleName: h.bundle_name || `Bundle #${h.bundle_id}`,
        navTokens: Number(h.nav_tokens) / 100,
        totalValue: Number(h.total_value_usd) / 100000000
      }));

      setHoldings(transformedHoldings);

      const total = transformedHoldings.reduce((sum, h) => sum + h.totalValue, 0);
      setTotalPortfolioValue(total);

    } catch (error) {
      console.error('Failed to load wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      toast.success(`Depositing ${amount} USDC...`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Deposit successful!');
      setAmount('');
      setShowDepositModal(false);
      await loadWalletData();
    } catch (error) {
      toast.error('Deposit failed');
    }
  };

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (parseFloat(amount) > parseFloat(usdcBalance)) {
      toast.error('Insufficient balance');
      return;
    }

    try {
      toast.success(`Withdrawing ${amount} USDC...`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Withdrawal successful!');
      setAmount('');
      setShowWithdrawModal(false);
      await loadWalletData();
    } catch (error) {
      toast.error('Withdrawal failed');
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full md:w-[440px] bg-black border-l border-white/10 z-50 overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-white/20 to-white/5 border border-white/20 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Wallet</h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-10 h-10 border border-white/20 hover:bg-white/10 flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Loading wallet data...</p>
                  </div>
                ) : (
                  <>
                    <div className="border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.03] p-6 mb-6">
                      <div className="text-gray-400 text-sm mb-2">USDC Balance</div>
                      <div className="text-4xl font-bold text-white mb-4">
                        ${usdcBalance}
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowDepositModal(true)}
                          className="flex-1 btn-unique py-3 flex items-center justify-center gap-2"
                        >
                          <ArrowDownLeft className="w-4 h-4" />
                          Deposit
                        </button>
                        <button
                          onClick={() => setShowWithdrawModal(true)}
                          className="flex-1 btn-outline-unique py-3 flex items-center justify-center gap-2"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                          Withdraw
                        </button>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white">Bundle Holdings</h3>
                        <Link
                          to="/portfolio"
                          onClick={onClose}
                          className="text-gray-400 hover:text-white text-sm transition-colors"
                        >
                          View All →
                        </Link>
                      </div>

                      {holdings.length > 0 ? (
                        <>
                          <div className="border border-white/10 bg-white/5 p-4 mb-4">
                            <div className="text-gray-400 text-xs mb-1">Total Portfolio Value</div>
                            <div className="text-2xl font-bold text-white">
                              ${totalPortfolioValue.toFixed(2)}
                            </div>
                          </div>

                          <div className="space-y-3">
                            {holdings.map((holding) => (
                              <Link
                                key={holding.bundleId}
                                to={`/bundle/${holding.bundleId}`}
                                onClick={onClose}
                                className="block border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.03] hover:from-white/[0.12] hover:to-white/[0.06] p-4 transition-all"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-white font-bold mb-1">
                                      {holding.bundleName}
                                    </div>
                                    <div className="text-gray-500 text-xs">
                                      {holding.navTokens.toFixed(2)} tokens
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-white font-bold">
                                      ${holding.totalValue.toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="border border-white/10 bg-white/5 p-8 text-center">
                          <div className="w-16 h-16 bg-white/10 flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">📦</span>
                          </div>
                          <p className="text-gray-400 mb-4">No bundle holdings yet</p>
                          <Link
                            to="/bundles"
                            onClick={onClose}
                            className="btn-outline-unique px-6 py-2 inline-block"
                          >
                            Discover Bundles
                          </Link>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDepositModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDepositModal(false)}
            className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-black border border-white/10 w-full max-w-md p-6"
            >
              <h3 className="text-2xl font-bold text-white mb-4">Deposit USDC</h3>
              <p className="text-gray-400 text-sm mb-6">
                Transfer USDC from your wallet to your XFusion balance
              </p>

              <div className="mb-6">
                <label className="text-gray-400 text-sm mb-2 block">Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white/5 border border-white/10 px-4 py-3 text-white text-xl focus:border-white/30 focus:outline-none"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    USDC
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDepositModal(false)}
                  className="flex-1 btn-outline-unique py-3"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeposit}
                  className="flex-1 btn-unique py-3"
                >
                  Deposit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showWithdrawModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowWithdrawModal(false)}
            className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-black border border-white/10 w-full max-w-md p-6"
            >
              <h3 className="text-2xl font-bold text-white mb-4">Withdraw USDC</h3>
              <p className="text-gray-400 text-sm mb-2">
                Transfer USDC from your XFusion balance to your wallet
              </p>
              <p className="text-gray-500 text-xs mb-6">
                Available: ${usdcBalance}
              </p>

              <div className="mb-6">
                <label className="text-gray-400 text-sm mb-2 block">Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    max={usdcBalance}
                    className="w-full bg-white/5 border border-white/10 px-4 py-3 text-white text-xl focus:border-white/30 focus:outline-none"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    USDC
                  </div>
                </div>
                <button
                  onClick={() => setAmount(usdcBalance)}
                  className="text-gray-400 hover:text-white text-xs mt-2 transition-colors"
                >
                  Max: ${usdcBalance}
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="flex-1 btn-outline-unique py-3"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWithdraw}
                  className="flex-1 btn-unique py-3"
                >
                  Withdraw
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
