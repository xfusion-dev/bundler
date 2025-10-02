import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { DollarSign, Package, Plus, ArrowRight } from 'lucide-react';

export default function BundlesIntroSection() {
  return (
    <section id="bundles-intro" className="px-6 py-24 bg-space relative">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-unique/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto mb-16"
        >
          <div className="bg-surface/50 border border-primary rounded-lg p-8">
            <div className="flex items-start gap-6">
              <div className="w-12 h-12 bg-unique/10 border border-unique/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-6 h-6 text-unique" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-3">
                  What are XFusion Bundles?
                </h3>
                <p className="text-tertiary leading-relaxed mb-4">
                  Welcome to XFusion — a platform for creating, exploring, and trading with decentralized token bundles.
                  An XFusion Bundle is a dynamic portfolio owned by any number of subscribers in a decentralized network.
                  Bundles can be created in seconds, are fully auditable on the blockchain, and are backed with real tokens.
                </p>
                <p className="text-tertiary leading-relaxed">
                  XFusion Bundles support all major assets including ckBTC, ckETH, ckUSDC, and tokenized gold, wrapped via{' '}
                  <span className="text-unique font-semibold">Chain-Key</span> technology backed by the Internet Computer.
                  Users can trade their bundle tokens for any use-case at any time without anyone else's permission.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="group"
          >
            <Link to="/bundles">
              <div className="relative p-8 rounded-lg border border-unique/30 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-sm hover:border-unique/50 transition-all duration-300 hover:transform hover:scale-[1.02]">
                <div className="w-14 h-14 bg-elevated/80 border border-primary/50 rounded-lg flex items-center justify-center mb-6 group-hover:border-unique/50 transition-colors">
                  <Package className="w-7 h-7 text-unique" />
                </div>

                <h3 className="text-xl font-bold text-white mb-3">
                  Browse Bundles
                </h3>
                <p className="text-tertiary mb-6 text-sm leading-relaxed">
                  Explore curated token bundles created by the community. Subscribe to diversified portfolios with a single click.
                </p>

                <div className="flex items-center gap-2 text-unique text-sm font-medium group-hover:gap-3 transition-all">
                  <span>Explore Now</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
            className="group"
          >
            <Link to="/build">
              <div className="relative p-8 rounded-lg border border-unique/30 bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm hover:border-unique/50 transition-all duration-300 hover:transform hover:scale-[1.02]">
                <div className="w-14 h-14 bg-elevated/80 border border-primary/50 rounded-lg flex items-center justify-center mb-6 group-hover:border-unique/50 transition-colors">
                  <Plus className="w-7 h-7 text-unique" />
                </div>

                <h3 className="text-xl font-bold text-white mb-3">
                  Create Bundle
                </h3>
                <p className="text-tertiary mb-6 text-sm leading-relaxed">
                  Build your own token bundle with custom allocations. Share your strategy and earn from subscribers.
                </p>

                <div className="flex items-center gap-2 text-unique text-sm font-medium group-hover:gap-3 transition-all">
                  <span>Start Building</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
