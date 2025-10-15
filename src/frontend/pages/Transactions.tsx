import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle, Search, Copy, Download, Filter, ChevronDown } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { backendService } from '../lib/backend-service';
import { authService } from '../lib/auth';
import toast from 'react-hot-toast';

function CustomDropdown({ value, onChange, options, label }: { value: string; onChange: (val: string) => void; options: { value: string; label: string }[]; label: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white/5 border border-white/10 px-4 py-3 text-white hover:border-white/20 transition-colors flex items-center justify-between gap-2"
      >
        <span className="text-sm">{selectedOption?.label || label}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 bg-black border border-white/10 shadow-xl"
          >
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                  value === option.value
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bundleMap, setBundleMap] = useState<Map<number, any>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [operationFilter, setOperationFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const { isAuthenticated, login } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      loadTransactions();
    }
  }, [isAuthenticated]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const principal = await authService.getPrincipal();
      if (!principal) return;

      const [txs, bundles] = await Promise.all([
        backendService.getUserTransactions(principal),
        backendService.getBundlesList()
      ]);

      const bundlesById = new Map(bundles.map((b: any) => [Number(b.id), b]));
      setBundleMap(bundlesById);

      setTransactions(txs.sort((a: any, b: any) => Number(b.created_at) - Number(a.created_at)));
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (ns: bigint | string) => {
    const timestamp = typeof ns === 'string' ? BigInt(ns) : ns;
    const ms = Number(timestamp / BigInt(1000000));
    const date = new Date(ms);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getOperationType = (tx: any) => {
    if ('Buy' in tx.operation) return 'Buy';
    if ('Sell' in tx.operation) return 'Sell';
    if ('InitialBuy' in tx.operation) return 'Initial Buy';
    return 'Unknown';
  };

  const getStatusText = (status: any) => {
    if ('Completed' in status || status === 'Completed') return 'Completed';
    if ('Failed' in status || status === 'Failed') return 'Failed';
    if ('TimedOut' in status || status === 'TimedOut') return 'Timed Out';
    if ('Pending' in status || status === 'Pending') return 'Pending';
    if ('InProgress' in status || status === 'InProgress') return 'In Progress';
    if ('WaitingForResolver' in status || status === 'WaitingForResolver') return 'Waiting';
    if ('FundsLocked' in status || status === 'FundsLocked') return 'Funds Locked';
    if ('AssetsTransferred' in status || status === 'AssetsTransferred') return 'Assets Transferred';
    return 'Unknown';
  };

  const getOperationAmount = (tx: any) => {
    const bundle = bundleMap.get(Number(tx.bundle_id));
    const symbol = bundle?.symbol || 'NAV';

    if ('Buy' in tx.operation) {
      return `${(Number(tx.operation.Buy.ckusdc_amount) / 1e6).toFixed(2)} USDC`;
    }
    if ('Sell' in tx.operation) {
      return `${(Number(tx.operation.Sell.nav_tokens) / 1e8).toFixed(4)} ${symbol}`;
    }
    if ('InitialBuy' in tx.operation) {
      return `${(Number(tx.operation.InitialBuy.usd_amount) / 1e6).toFixed(2)} USDC`;
    }
    return '-';
  };

  const getBundleName = (bundleId: number) => {
    const bundle = bundleMap.get(bundleId);
    return bundle?.name || `Bundle #${bundleId}`;
  };

  const getStatusIcon = (status: any) => {
    if ('Completed' in status || status === 'Completed') {
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    }
    if ('Failed' in status || status === 'Failed' || 'TimedOut' in status || status === 'TimedOut') {
      return <XCircle className="w-5 h-5 text-red-400" />;
    }
    return <Clock className="w-5 h-5 text-yellow-400" />;
  };

  const copyTransactionId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success('Transaction ID copied!');
  };

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    if (searchQuery) {
      filtered = filtered.filter(tx => {
        const bundleName = getBundleName(Number(tx.bundle_id)).toLowerCase();
        return bundleName.includes(searchQuery.toLowerCase());
      });
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(tx => {
        const status = getStatusText(tx.status).toLowerCase();
        return status === statusFilter.toLowerCase();
      });
    }

    if (operationFilter !== 'all') {
      filtered = filtered.filter(tx => {
        const operation = getOperationType(tx).toLowerCase();
        return operation === operationFilter.toLowerCase() ||
               (operationFilter === 'buy' && operation === 'initial buy');
      });
    }

    if (timeFilter !== 'all') {
      const now = Date.now();
      const filterTime = timeFilter === '7d' ? 7 * 24 * 60 * 60 * 1000 :
                         timeFilter === '30d' ? 30 * 24 * 60 * 60 * 1000 : 0;

      if (filterTime > 0) {
        filtered = filtered.filter(tx => {
          const txTime = Number(BigInt(tx.created_at) / BigInt(1000000));
          return now - txTime <= filterTime;
        });
      }
    }

    return filtered;
  }, [transactions, searchQuery, statusFilter, operationFilter, timeFilter, bundleMap]);

  const stats = useMemo(() => {
    const completed = filteredTransactions.filter(tx =>
      getStatusText(tx.status) === 'Completed'
    );
    const failed = filteredTransactions.filter(tx =>
      getStatusText(tx.status) === 'Failed' || getStatusText(tx.status) === 'Timed Out'
    );

    const totalVolume = completed.reduce((sum, tx) => {
      if ('Buy' in tx.operation) {
        return sum + Number(tx.operation.Buy.ckusdc_amount) / 1e6;
      }
      if ('InitialBuy' in tx.operation) {
        return sum + Number(tx.operation.InitialBuy.usd_amount) / 1e6;
      }
      return sum;
    }, 0);

    const successRate = filteredTransactions.length > 0
      ? (completed.length / filteredTransactions.length) * 100
      : 0;

    return {
      totalVolume,
      completedCount: completed.length,
      failedCount: failed.length,
      successRate
    };
  }, [filteredTransactions]);

  const exportToCSV = () => {
    const headers = ['Timestamp', 'Operation', 'Bundle', 'Amount', 'Status', 'Transaction ID'];
    const rows = filteredTransactions.map(tx => [
      formatTimestamp(tx.created_at),
      getOperationType(tx),
      getBundleName(Number(tx.bundle_id)),
      getOperationAmount(tx),
      getStatusText(tx.status),
      tx.id.toString()
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xfusion-transactions-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Transactions exported!');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black">
        <div className="px-6 py-8 md:py-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">🔐</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Authentication Required</h3>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">
                You need to be logged in to view your transaction history.
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
      <div className="px-6 py-8 md:py-16">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link
              to="/portfolio"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Portfolio
            </Link>

            <div className="mb-8">
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-3 md:mb-4">Transaction History</h1>
              <p className="text-gray-400 text-lg mb-8">View all your bundle transactions</p>

              {!loading && transactions.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="border border-white/10 bg-white/5 p-4">
                    <div className="text-gray-400 text-xs font-mono uppercase mb-2">Total Volume</div>
                    <div className="text-white text-2xl font-bold">${stats.totalVolume.toFixed(2)}</div>
                  </div>
                  <div className="border border-white/10 bg-white/5 p-4">
                    <div className="text-gray-400 text-xs font-mono uppercase mb-2">Completed</div>
                    <div className="text-white text-2xl font-bold">{stats.completedCount}</div>
                  </div>
                  <div className="border border-white/10 bg-white/5 p-4">
                    <div className="text-gray-400 text-xs font-mono uppercase mb-2">Failed</div>
                    <div className="text-white text-2xl font-bold">{stats.failedCount}</div>
                  </div>
                  <div className="border border-white/10 bg-white/5 p-4">
                    <div className="text-gray-400 text-xs font-mono uppercase mb-2">Success Rate</div>
                    <div className="text-white text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
                  </div>
                </div>
              )}
            </div>

            {!loading && transactions.length > 0 && (
              <div className="mb-6 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by bundle name..."
                      className="w-full bg-white/5 border border-white/10 pl-12 pr-4 py-3 text-white placeholder:text-gray-500 focus:border-white/30 focus:outline-none transition-colors"
                    />
                  </div>
                  <button
                    onClick={exportToCSV}
                    className="btn-outline-unique px-6 py-3 flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <CustomDropdown
                    value={timeFilter}
                    onChange={setTimeFilter}
                    label="Time Filter"
                    options={[
                      { value: 'all', label: 'All Time' },
                      { value: '7d', label: 'Last 7 Days' },
                      { value: '30d', label: 'Last 30 Days' }
                    ]}
                  />

                  <CustomDropdown
                    value={statusFilter}
                    onChange={setStatusFilter}
                    label="Status Filter"
                    options={[
                      { value: 'all', label: 'All Status' },
                      { value: 'completed', label: 'Completed' },
                      { value: 'failed', label: 'Failed' },
                      { value: 'pending', label: 'Pending' },
                      { value: 'in progress', label: 'In Progress' }
                    ]}
                  />

                  <CustomDropdown
                    value={operationFilter}
                    onChange={setOperationFilter}
                    label="Operation Filter"
                    options={[
                      { value: 'all', label: 'All Operations' },
                      { value: 'buy', label: 'Buy' },
                      { value: 'sell', label: 'Sell' }
                    ]}
                  />

                  {(searchQuery || statusFilter !== 'all' || operationFilter !== 'all' || timeFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('all');
                        setOperationFilter('all');
                        setTimeFilter('all');
                      }}
                      className="btn-outline-unique px-6 py-3 whitespace-nowrap"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>
            )}

            {loading ? (
              <div className="border border-white/10 bg-white/5 p-20 text-center">
                <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Loading transactions...</p>
              </div>
            ) : filteredTransactions.length === 0 && transactions.length > 0 ? (
              <div className="border border-white/10 bg-white/5 p-20 text-center">
                <div className="w-20 h-20 bg-white/10 flex items-center justify-center mx-auto mb-6">
                  <Filter className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">No Matching Transactions</h3>
                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                  Try adjusting your filters to see more results.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setOperationFilter('all');
                    setTimeFilter('all');
                  }}
                  className="btn-outline-unique px-6 py-3"
                >
                  Clear All Filters
                </button>
              </div>
            ) : transactions.length === 0 ? (
              <div className="border border-white/10 bg-white/5 p-20 text-center">
                <div className="w-20 h-20 bg-white/10 flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">📜</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">No Transactions Yet</h3>
                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                  Start buying or selling bundles to see your transaction history here.
                </p>
                <Link to="/bundles" className="btn-unique px-8 py-3 inline-block">
                  Explore Bundles
                </Link>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full border border-white/10">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10">
                        <th className="text-left p-4 text-gray-400 text-sm font-mono uppercase">Timestamp</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-mono uppercase">Operation</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-mono uppercase">Bundle</th>
                        <th className="text-right p-4 text-gray-400 text-sm font-mono uppercase">Amount</th>
                        <th className="text-center p-4 text-gray-400 text-sm font-mono uppercase">Status</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-mono uppercase">TX ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((tx) => (
                        <tr key={tx.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                          <td className="p-4 text-white font-mono text-sm">
                            {formatTimestamp(tx.created_at)}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {getOperationType(tx) === 'Buy' || getOperationType(tx) === 'Initial Buy' ? (
                                <ArrowDownLeft className="w-4 h-4 text-green-400" />
                              ) : (
                                <ArrowUpRight className="w-4 h-4 text-red-400" />
                              )}
                              <span className="text-white font-mono">{getOperationType(tx)}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <Link
                              to={`/bundle/${tx.bundle_id}`}
                              className="text-white hover:text-gray-300 transition-colors"
                            >
                              {getBundleName(Number(tx.bundle_id))}
                            </Link>
                          </td>
                          <td className="p-4 text-right text-white font-mono">
                            {getOperationAmount(tx)}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              {getStatusIcon(tx.status)}
                              <span className="text-sm text-gray-400">{getStatusText(tx.status)}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => copyTransactionId(tx.id.toString())}
                              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
                              title="Copy transaction ID"
                            >
                              <span className="text-sm font-mono">{tx.id.toString().slice(0, 8)}...</span>
                              <Copy className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden space-y-4">
                  {filteredTransactions.map((tx) => (
                    <div key={tx.id} className="border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getOperationType(tx) === 'Buy' || getOperationType(tx) === 'Initial Buy' ? (
                            <ArrowDownLeft className="w-4 h-4 text-green-400" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 text-red-400" />
                          )}
                          <span className="text-white font-mono text-sm">{getOperationType(tx)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(tx.status)}
                          <span className="text-xs text-gray-400">{getStatusText(tx.status)}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-500 text-xs">Bundle</span>
                          <Link
                            to={`/bundle/${tx.bundle_id}`}
                            className="text-white text-sm hover:text-gray-300"
                          >
                            {getBundleName(Number(tx.bundle_id))}
                          </Link>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 text-xs">Amount</span>
                          <span className="text-white text-sm font-mono">{getOperationAmount(tx)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 text-xs">Time</span>
                          <span className="text-white text-xs font-mono">{formatTimestamp(tx.created_at)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-white/10 mt-2">
                          <span className="text-gray-500 text-xs">TX ID</span>
                          <button
                            onClick={() => copyTransactionId(tx.id.toString())}
                            className="flex items-center gap-2 text-white text-xs font-mono hover:text-gray-300 transition-colors"
                          >
                            {tx.id.toString().slice(0, 12)}...
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
