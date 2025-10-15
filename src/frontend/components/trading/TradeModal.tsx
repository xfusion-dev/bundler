import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, TrendingDown, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { backendService } from '../../lib/backend-service';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  bundleId: number;
  bundleName: string;
  mode: 'buy' | 'sell';
}

type TradeState = 'input' | 'quote' | 'confirming' | 'success' | 'error';

export default function TradeModal({ isOpen, onClose, bundleId, bundleName, mode }: TradeModalProps) {
  const [tradeState, setTradeState] = useState<TradeState>('input');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTradeState('input');
      setAmount('');
      setQuote(null);
      setError(null);
      setTxId(null);
    }
  }, [isOpen]);

  const handleRequestQuote = async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    setLoading(true);
    setError(null);

    try {
      const amountNum = parseFloat(amount) * 1_000_000;

      const quoteResult = mode === 'buy'
        ? await backendService.requestBuyQuote(bundleId, amountNum)
        : await backendService.requestSellQuote(bundleId, amountNum);

      setQuote(quoteResult);
      setTradeState('quote');
    } catch (err: any) {
      setError(err.message || 'Failed to get quote');
      setTradeState('error');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteQuote = async () => {
    if (!quote) return;

    setLoading(true);
    setError(null);
    setTradeState('confirming');

    try {
      const result = await backendService.executeQuote(quote.id);
      setTxId(result.transaction_id);
      setTradeState('success');
    } catch (err: any) {
      setError(err.message || 'Failed to execute trade');
      setTradeState('error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTradeState('input');
    setAmount('');
    setQuote(null);
    setError(null);
    setTxId(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          <motion.div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-elevated border border-primary p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  {mode === 'buy' ? (
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-400" />
                  )}
                  <h2 className="text-primary font-bold text-xl">
                    {mode === 'buy' ? 'Buy' : 'Sell'} {bundleName}
                  </h2>
                </div>
                <button
                  onClick={handleClose}
                  className="text-tertiary hover:text-primary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {tradeState === 'input' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-secondary text-sm block mb-2">
                      {mode === 'buy' ? 'Amount (USDC)' : 'NAV Tokens'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-background border border-primary text-primary placeholder-tertiary focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>

                  <button
                    onClick={handleRequestQuote}
                    disabled={!amount || parseFloat(amount) <= 0 || loading}
                    className="w-full btn-unique py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        GETTING QUOTE...
                      </>
                    ) : (
                      'GET QUOTE'
                    )}
                  </button>
                </div>
              )}

              {tradeState === 'quote' && quote && (
                <div className="space-y-4">
                  <div className="p-4 bg-background border border-primary rounded">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-secondary">Amount</span>
                        <span className="text-primary">
                          {mode === 'buy'
                            ? `${(quote.amount_usdc / 1_000_000).toFixed(2)} USDC`
                            : `${(quote.nav_tokens / 1_000_000).toFixed(2)} NAV`
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary">You Receive</span>
                        <span className="text-primary font-bold">
                          {mode === 'buy'
                            ? `${(quote.nav_tokens / 1_000_000).toFixed(2)} NAV`
                            : `${(quote.amount_usdc / 1_000_000).toFixed(2)} USDC`
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary">Quote Expires</span>
                        <span className="text-primary text-sm">60 seconds</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleReset}
                      className="flex-1 px-4 py-3 bg-background border border-primary text-primary hover:border-accent transition-colors"
                    >
                      CANCEL
                    </button>
                    <button
                      onClick={handleExecuteQuote}
                      disabled={loading}
                      className="flex-1 btn-unique py-3 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          EXECUTING...
                        </>
                      ) : (
                        'EXECUTE TRADE'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {tradeState === 'confirming' && (
                <div className="text-center py-8">
                  <Loader2 className="w-12 h-12 animate-spin text-accent mx-auto mb-4" />
                  <h3 className="text-primary font-bold mb-2">Processing Trade...</h3>
                  <p className="text-secondary text-sm">
                    Please wait while we execute your trade on-chain
                  </p>
                </div>
              )}

              {tradeState === 'success' && (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                  <h3 className="text-primary font-bold mb-2">Trade Successful!</h3>
                  <p className="text-secondary text-sm mb-4">
                    Your trade has been executed successfully
                  </p>
                  {txId && (
                    <p className="text-tertiary text-xs mb-4">
                      Transaction ID: {txId}
                    </p>
                  )}
                  <button
                    onClick={handleClose}
                    className="btn-unique px-6 py-2"
                  >
                    DONE
                  </button>
                </div>
              )}

              {tradeState === 'error' && (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                  <h3 className="text-primary font-bold mb-2">Trade Failed</h3>
                  <p className="text-secondary text-sm mb-4">
                    {error || 'Something went wrong'}
                  </p>
                  <button
                    onClick={handleReset}
                    className="btn-unique px-6 py-2"
                  >
                    TRY AGAIN
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export { TradeModal };