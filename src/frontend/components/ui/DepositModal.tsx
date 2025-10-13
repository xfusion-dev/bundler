import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import QRCode from 'react-qr-code';
import toast from 'react-hot-toast';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DepositAddress {
  walletAddress: string;
  supportedChains: string[];
}

const CHAIN_INFO = {
  base: {
    name: 'Base',
    logo: 'https://rails.xfusion.finance/assets/base-logo-86cab295.svg'
  },
  arbitrum: {
    name: 'Arbitrum',
    logo: 'https://rails.xfusion.finance/assets/arbitrum-arb-logo-f719363f.svg'
  },
  polygon: {
    name: 'Polygon',
    logo: 'https://rails.xfusion.finance/assets/matic-logo-b9f8499c.svg'
  },
  bsc: {
    name: 'BNB Chain',
    logo: 'https://rails.xfusion.finance/assets/bnb-chain-logo-99b96eaf.svg'
  }
};

export default function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const [activeTab, setActiveTab] = useState<'ckusdc' | 'multichain'>('ckusdc');
  const [copiedPrincipal, setCopiedPrincipal] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [depositAddress, setDepositAddress] = useState<DepositAddress | null>(null);
  const [loading, setLoading] = useState(false);
  const { principal } = useAuth();

  useEffect(() => {
    if (isOpen && activeTab === 'multichain' && principal && !depositAddress) {
      fetchDepositAddress();
    }
  }, [isOpen, activeTab, principal]);

  const fetchDepositAddress = async () => {
    if (!principal) return;

    setLoading(true);
    try {
      const response = await fetch('https://rails-api.xfusion.finance/api/deposit-address', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          icpPrincipal: principal.toText()
        })
      });

      const data = await response.json();
      setDepositAddress({
        walletAddress: data.walletAddress,
        supportedChains: data.supportedChains
      });
    } catch (error) {
      console.error('Failed to fetch deposit address:', error);
      toast.error('Failed to load deposit address');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'principal' | 'address') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'principal') {
        setCopiedPrincipal(true);
        setTimeout(() => setCopiedPrincipal(false), 2000);
      } else {
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
      }
      toast.success('Copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
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
            <h2 className="text-2xl font-bold text-white">Deposit USDC</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 border border-white/20 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          <div className="flex border-b border-white/10">
            <button
              onClick={() => setActiveTab('ckusdc')}
              className={`flex-1 px-6 py-4 text-sm font-mono tracking-wide transition-colors ${
                activeTab === 'ckusdc'
                  ? 'bg-white/10 text-white border-b-2 border-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              ckUSDC
            </button>
            <button
              onClick={() => setActiveTab('multichain')}
              className={`flex-1 px-6 py-4 text-sm font-mono tracking-wide transition-colors ${
                activeTab === 'multichain'
                  ? 'bg-white/10 text-white border-b-2 border-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Bridge from EVM
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'ckusdc' ? (
              <div className="space-y-6">
                <div className="flex flex-col items-center">
                  <div className="bg-white p-4 mb-4">
                    {principal && (
                      <QRCode
                        value={principal.toText()}
                        size={200}
                        level="M"
                      />
                    )}
                  </div>
                  <p className="text-gray-400 text-sm text-center mb-4">
                    Scan QR code or copy your principal below to deposit ckUSDC
                  </p>
                </div>

                <div>
                  <label className="text-gray-400 text-xs font-mono uppercase mb-2 block">
                    Your Principal
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={principal?.toText() || ''}
                      readOnly
                      className="flex-1 bg-white/5 border border-white/10 px-4 py-3 text-white text-sm font-mono focus:outline-none"
                    />
                    <button
                      onClick={() => principal && copyToClipboard(principal.toText(), 'principal')}
                      className="px-4 py-3 border border-white/20 hover:bg-white/10 transition-colors flex items-center justify-center"
                    >
                      {copiedPrincipal ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-white" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-4">
                  <p className="text-gray-400 text-xs">
                    Send ckUSDC to this principal address on the Internet Computer network.
                    Only send ckUSDC tokens - sending other tokens may result in loss of funds.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400">Loading deposit address...</div>
                  </div>
                ) : depositAddress ? (
                  <>
                    <div className="flex flex-col items-center">
                      <div className="bg-white p-4 mb-4">
                        <QRCode
                          value={depositAddress.walletAddress}
                          size={200}
                          level="M"
                        />
                      </div>
                      <p className="text-gray-400 text-sm text-center mb-4">
                        Scan QR code or copy your deposit address below
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-400 text-sm mb-3">
                        Supports deposits from:
                      </p>
                      <div className="flex items-center justify-center gap-2 mb-6">
                        {depositAddress.supportedChains.map((chain) => {
                          const info = CHAIN_INFO[chain as keyof typeof CHAIN_INFO];
                          return (
                            <div
                              key={chain}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 border border-white/10 bg-white/5"
                            >
                              <img
                                src={info.logo}
                                alt={info.name}
                                className="w-4 h-4"
                              />
                              <span className="text-white text-xs font-mono">
                                {info.name}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="text-gray-400 text-xs font-mono uppercase mb-2 block">
                        Your Deposit Address
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={depositAddress.walletAddress}
                          readOnly
                          className="flex-1 bg-white/5 border border-white/10 px-4 py-3 text-white text-sm font-mono focus:outline-none"
                        />
                        <button
                          onClick={() => copyToClipboard(depositAddress.walletAddress, 'address')}
                          className="px-4 py-3 border border-white/20 hover:bg-white/10 transition-colors flex items-center justify-center"
                        >
                          {copiedAddress ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-white" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-4">
                      <p className="text-gray-400 text-xs">
                        Send USDC from Base, Arbitrum, Polygon, or BNB Chain to this address.
                        Your funds will be bridged to ckUSDC on the Internet Computer automatically.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400">Failed to load deposit address</p>
                    <button
                      onClick={fetchDepositAddress}
                      className="mt-4 btn-unique px-6 py-2"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
