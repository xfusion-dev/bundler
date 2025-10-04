import { Link } from 'react-router-dom';
import { ArrowRight, Coins, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Lending() {
  return (
    <div className="min-h-screen bg-black">
      <div className="px-6 py-8 md:py-16">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8 md:mb-12"
          >
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-3 md:mb-4">Earn or Borrow</h1>
            <p className="text-gray-400 text-base md:text-lg">
              Choose how you want to participate in DeFi lending
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            <Link
              to="/lending/supply"
              className="block border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.03] hover:from-white/[0.12] hover:to-white/[0.06] p-8 transition-all duration-300 group"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/20 flex items-center justify-center">
                  <Coins className="w-8 h-8 text-green-400" />
                </div>
                <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
              </div>

              <h2 className="text-3xl font-bold text-white mb-3 group-hover:text-gray-200 transition-colors">
                Lend
              </h2>
              <p className="text-gray-400 mb-6">
                Supply USDC to earn interest. Your funds are used by borrowers to increase their leverage.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10">
                <div>
                  <div className="text-gray-500 text-xs font-mono uppercase mb-1">Current APY</div>
                  <div className="text-green-400 text-2xl font-bold">4.2%</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs font-mono uppercase mb-1">Total Supplied</div>
                  <div className="text-white text-2xl font-bold">$1.25M</div>
                </div>
              </div>
            </Link>

            <Link
              to="/lending/borrow"
              className="block border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.03] hover:from-white/[0.12] hover:to-white/[0.06] p-8 transition-all duration-300 group"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-red-500/20 to-red-500/5 border border-red-500/20 flex items-center justify-center">
                  <CreditCard className="w-8 h-8 text-red-400" />
                </div>
                <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
              </div>

              <h2 className="text-3xl font-bold text-white mb-3 group-hover:text-gray-200 transition-colors">
                Borrow
              </h2>
              <p className="text-gray-400 mb-6">
                Borrow USDC against your bundle holdings. Use leverage to increase your position size.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10">
                <div>
                  <div className="text-gray-500 text-xs font-mono uppercase mb-1">Borrow APY</div>
                  <div className="text-red-400 text-2xl font-bold">6.8%</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs font-mono uppercase mb-1">Total Borrowed</div>
                  <div className="text-white text-2xl font-bold">$875K</div>
                </div>
              </div>
            </Link>
          </div>

          <div className="mt-12 border border-white/10 bg-white/5 p-6">
            <h3 className="text-white text-lg font-bold mb-3">How it works</h3>
            <div className="grid md:grid-cols-2 gap-6 text-gray-400 text-sm">
              <div>
                <div className="font-bold text-white mb-2">Lenders</div>
                <p>Supply USDC to the lending pool and earn passive interest. Your funds are always accessible and protected by overcollateralization.</p>
              </div>
              <div>
                <div className="font-bold text-white mb-2">Borrowers</div>
                <p>Use your bundle holdings as collateral to borrow USDC. Maintain a healthy collateral ratio to avoid liquidation.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
