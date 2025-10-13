import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, ArrowUpRight, ArrowDownLeft, Trophy } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import { icrc2Service } from '../../lib/icrc2-service';
import { icrc151Service } from '../../lib/icrc151-service';
import { backendService } from '../../lib/backend-service';
import { authService } from '../../lib/auth';
import { backend } from '../../../backend/declarations';
import DepositModal from './DepositModal';
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
  const [userPoints, setUserPoints] = useState<number>(0);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [totalPortfolioValue, setTotalPortfolioValue] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [loadingHoldings, setLoadingHoldings] = useState(true);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [recipientPrincipal, setRecipientPrincipal] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [principalError, setPrincipalError] = useState('');
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadWalletData();
    }
  }, [isOpen, isAuthenticated]);

  const loadWalletData = async () => {
    loadUSDCBalance();
    loadPoints();
    loadHoldings();
  };

  const loadUSDCBalance = async () => {
    try {
      setLoadingBalance(true);
      const balance = await icrc2Service.getBalance();
      const formattedBalance = (Number(balance) / 1000000).toFixed(2);
      setUsdcBalance(formattedBalance);
    } catch (error) {
      console.error('Failed to load USDC balance:', error);
    } finally {
      setLoadingBalance(false);
    }
  };

  const loadPoints = async () => {
    try {
      const points = await backend.get_user_points([]);
      setUserPoints(Number(points));
    } catch (error) {
      console.error('Failed to load user points:', error);
    }
  };

  const loadHoldings = async () => {
    try {
      setLoadingHoldings(true);

      const principal = await authService.getPrincipal();
      if (!principal) {
        setHoldings([]);
        setTotalPortfolioValue(0);
        setLoadingHoldings(false);
        return;
      }

      const tokenBalances = await icrc151Service.getBalancesFor(principal);

      if (!tokenBalances || tokenBalances.length === 0) {
        setHoldings([]);
        setTotalPortfolioValue(0);
        setLoadingHoldings(false);
        return;
      }

      const allBundles = await backendService.getBundlesList();

      const tokenIdToBundleMap = new Map();
      allBundles.forEach((bundle: any) => {
        if (bundle.token_location && 'ICRC151' in bundle.token_location) {
          const tokenIdHex = Array.from(bundle.token_location.ICRC151.token_id)
            .map((b: number) => b.toString(16).padStart(2, '0'))
            .join('');
          tokenIdToBundleMap.set(tokenIdHex, bundle);
        }
      });

      const holdingsPromises = tokenBalances.map(async (tokenBalance: any) => {
        try {
          const tokenIdHex = Array.from(tokenBalance.token_id)
            .map((b: number) => b.toString(16).padStart(2, '0'))
            .join('');

          const bundle = tokenIdToBundleMap.get(tokenIdHex);
          if (!bundle) {
            console.warn('Bundle not found for token_id:', tokenIdHex);
            return null;
          }

          const bundleId = Number(bundle.id);
          const navData = await backendService.calculateBundleNav(bundleId);

          const navTokens = Number(tokenBalance.balance) / 1e8;
          const navPrice = Number(navData.nav_per_token) / 1e8;
          const totalValue = navTokens * navPrice;

          return {
            bundleId,
            bundleName: bundle.name,
            navTokens,
            totalValue
          };
        } catch (error) {
          console.error(`Failed to load bundle data:`, error);
          return null;
        }
      });

      const loadedHoldings = (await Promise.all(holdingsPromises)).filter((h): h is Holding => h !== null);
      setHoldings(loadedHoldings);

      const total = loadedHoldings.reduce((sum, h) => sum + h.totalValue, 0);
      setTotalPortfolioValue(total);

    } catch (error) {
      console.error('Failed to load holdings:', error);
      setHoldings([]);
      setTotalPortfolioValue(0);
    } finally {
      setLoadingHoldings(false);
    }
  };


  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!recipientPrincipal.trim()) {
      setPrincipalError('Please enter a recipient principal');
      return;
    }

    if (!icrc2Service.validatePrincipal(recipientPrincipal)) {
      setPrincipalError('Invalid principal format');
      return;
    }

    const TRANSFER_FEE = 0.01;
    const withdrawAmount = parseFloat(amount);
    const totalNeeded = withdrawAmount + TRANSFER_FEE;

    if (totalNeeded > parseFloat(usdcBalance)) {
      toast.error(`Insufficient balance. You need ${totalNeeded.toFixed(2)} USDC (including ${TRANSFER_FEE} USDC fee)`);
      return;
    }

    try {
      setWithdrawing(true);
      toast.loading('Processing withdrawal...');

      const amountInE6s = BigInt(Math.floor(withdrawAmount * 1000000));

      await icrc2Service.transfer(recipientPrincipal, amountInE6s);

      toast.dismiss();
      toast.success('Withdrawal successful!');

      setAmount('');
      setRecipientPrincipal('');
      setPrincipalError('');
      setShowWithdrawModal(false);

      await loadUSDCBalance();
    } catch (error) {
      toast.dismiss();
      console.error('Withdrawal failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Withdrawal failed';
      toast.error(errorMessage);
    } finally {
      setWithdrawing(false);
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

                <div className="border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.03] p-6 mb-6">
                  <div className="text-gray-400 text-sm mb-2">USDC Balance</div>
                  {loadingBalance ? (
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <div className="text-2xl font-bold text-white">Loading...</div>
                    </div>
                  ) : (
                    <div className="text-4xl font-bold text-white mb-4">
                      ${usdcBalance}
                    </div>
                  )}
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

                <div className="border border-white/10 bg-gradient-to-br from-yellow-500/10 to-orange-500/5 p-6 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    <div className="text-gray-400 text-sm">Your Points</div>
                  </div>
                  <div className="text-4xl font-bold text-white mb-2">
                    {userPoints.toLocaleString()}
                  </div>
                  <div className="text-gray-400 text-xs">
                    Earn 1 point per $1 buying • Lose 1 point per $1 selling
                  </div>
                  <Link
                    to="/leaderboard"
                    onClick={onClose}
                    className="mt-4 block text-center py-2 border border-yellow-400/30 hover:bg-yellow-400/10 text-yellow-400 text-sm transition-colors"
                  >
                    View Leaderboard →
                  </Link>
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

                  {loadingHoldings ? (
                    <div className="border border-white/10 bg-white/5 p-8 text-center">
                      <div className="w-16 h-16 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-gray-400">Loading holdings...</p>
                    </div>
                  ) : holdings.length > 0 ? (
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
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <DepositModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
      />

      <AnimatePresence>
        {showWithdrawModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !withdrawing && setShowWithdrawModal(false)}
            className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-black border border-white/10 w-full max-w-lg"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h2 className="text-2xl font-bold text-white">Withdraw USDC</h2>
                <button
                  onClick={() => {
                    if (!withdrawing) {
                      setShowWithdrawModal(false);
                      setAmount('');
                      setRecipientPrincipal('');
                      setPrincipalError('');
                    }
                  }}
                  disabled={withdrawing}
                  className="w-8 h-8 border border-white/20 hover:bg-white/10 flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>

              <div className="p-6">
                <p className="text-gray-400 text-sm mb-2">
                  Transfer ckUSDC to another principal on the Internet Computer
                </p>
                <p className="text-gray-500 text-xs mb-6">
                  Available: ${usdcBalance}
                </p>

              <div className="mb-4">
                <label className="text-gray-400 text-sm mb-2 block">Recipient Principal</label>
                <input
                  type="text"
                  value={recipientPrincipal}
                  onChange={(e) => {
                    setRecipientPrincipal(e.target.value);
                    setPrincipalError('');
                  }}
                  placeholder="xxxxx-xxxxx-xxxxx-xxxxx-xxx"
                  disabled={withdrawing}
                  className="w-full bg-white/5 border border-white/10 px-4 py-3 text-white text-sm font-mono focus:border-white/30 focus:outline-none disabled:opacity-50"
                />
                {principalError && (
                  <p className="text-red-400 text-xs mt-1">{principalError}</p>
                )}
              </div>

              <div className="mb-6">
                <label className="text-gray-400 text-sm mb-2 block">Amount (USDC)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    disabled={withdrawing}
                    className="w-full bg-white/5 border border-white/10 px-4 py-3 text-white text-xl focus:border-white/30 focus:outline-none disabled:opacity-50"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    USDC
                  </div>
                </div>
                <button
                  onClick={() => {
                    const maxAmount = Math.max(0, parseFloat(usdcBalance) - 0.01);
                    setAmount(maxAmount.toFixed(2));
                  }}
                  disabled={withdrawing}
                  className="text-gray-400 hover:text-white text-xs mt-2 transition-colors disabled:opacity-50"
                >
                  Max: ${(parseFloat(usdcBalance) - 0.01).toFixed(2)} (after fee)
                </button>
              </div>

              {amount && parseFloat(amount) > 0 && (
                <>
                  <div className="bg-white/5 border border-white/10 p-4 mb-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Amount</span>
                      <span className="text-white">${parseFloat(amount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Transfer Fee</span>
                      <span className="text-white">$0.01</span>
                    </div>
                    <div className="border-t border-white/10 pt-2 flex justify-between text-sm">
                      <span className="text-gray-400 font-bold">Total</span>
                      <span className="text-white font-bold">${(parseFloat(amount) + 0.01).toFixed(2)}</span>
                    </div>
                    <div className="border-t border-white/10 pt-2 flex justify-between text-sm">
                      <span className="text-gray-400">You will receive</span>
                      <span className="text-green-400 font-bold">${parseFloat(amount).toFixed(2)}</span>
                    </div>
                  </div>

                  {(() => {
                    const totalNeeded = parseFloat(amount) + 0.01;
                    const hasInsufficientBalance = totalNeeded > parseFloat(usdcBalance);

                    if (hasInsufficientBalance) {
                      return (
                        <div className="bg-red-500/10 border border-red-400/20 p-4 mb-6">
                          <p className="text-red-400 text-sm">
                            Insufficient balance. You need ${totalNeeded.toFixed(2)} USDC but only have ${usdcBalance} USDC.
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </>
              )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowWithdrawModal(false);
                      setAmount('');
                      setRecipientPrincipal('');
                      setPrincipalError('');
                    }}
                    disabled={withdrawing}
                    className="flex-1 btn-outline-unique py-3 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleWithdraw}
                    disabled={withdrawing || (amount && parseFloat(amount) > 0 && (parseFloat(amount) + 0.01) > parseFloat(usdcBalance))}
                    className="flex-1 btn-unique py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {withdrawing ? 'Processing...' : 'Withdraw'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
