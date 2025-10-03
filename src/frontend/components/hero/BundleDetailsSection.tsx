import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Package, Plus, ArrowRight } from 'lucide-react';
import chartImage from '../../assets/chart.png';

export default function BundlesIntroSection() {
  return (
    <section id="bundles-intro" className="px-6 py-32 bg-black relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="flex flex-col lg:flex-row gap-12 items-center max-w-6xl mx-auto">
            <div className="flex-[3]">
              <h2 className="text-5xl font-bold text-white mb-6">
                What are XFusion Bundles?
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-6">
                Think of XFusion Bundles as crypto-native ETFs. With Bundles, you can combine assets from 10+ blockchains — Bitcoin, Ethereum, stablecoins, gold, and more — into a single token.
              </p>
              <p className="text-gray-400 text-lg leading-relaxed mb-4">
                Bundles are:
              </p>
              <ul className="text-gray-400 text-lg leading-relaxed mb-6 space-y-2 list-disc pl-6">
                <li><span className="text-white font-semibold">Multi-chain backed</span> – powered by Chain-Key and cross-chain integrations</li>
                <li><span className="text-white font-semibold">Fully auditable</span> – transparent and verifiable on the blockchain</li>
                <li><span className="text-white font-semibold">Instant to launch & trade</span> – create and share portfolios in seconds</li>
              </ul>
              <p className="text-gray-400 text-lg leading-relaxed">
                Whether you're an investor seeking simple diversification or a creator designing your own strategy, XFusion makes it seamless to build, own, and trade decentralized portfolios.
              </p>
            </div>

            <div className="relative flex-[2]">
              <img
                src={chartImage}
                alt="XFusion Bundle Performance"
                className="w-full h-auto opacity-90"
              />
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="group"
          >
            <Link to="/bundles">
              <div className="relative h-full p-8 border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-300">
                <div className="w-12 h-12 bg-white/10 border border-white/20 flex items-center justify-center mb-6">
                  <Package className="w-6 h-6 text-white" />
                </div>

                <h3 className="text-2xl font-bold text-white mb-3">
                  Browse Bundles
                </h3>
                <p className="text-gray-400 mb-8 leading-relaxed">
                  Explore curated token bundles created by the community. Buy diversified portfolios with a single click.
                </p>

                <div className="flex items-center gap-2 text-white text-sm font-medium group-hover:gap-3 transition-all">
                  <span>Explore Now</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="group"
          >
            <Link to="/build">
              <div className="relative h-full p-8 border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-300">
                <div className="w-12 h-12 bg-white/10 border border-white/20 flex items-center justify-center mb-6">
                  <Plus className="w-6 h-6 text-white" />
                </div>

                <h3 className="text-2xl font-bold text-white mb-3">
                  Create Bundle
                </h3>
                <p className="text-gray-400 mb-8 leading-relaxed">
                  Design custom token portfolios with your own allocations and earn commission from every trade.
                </p>

                <div className="flex items-center gap-2 text-white text-sm font-medium group-hover:gap-3 transition-all">
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
