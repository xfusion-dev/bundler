import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { mockPlatformStats } from '../../lib/mock-data';

export default function Hero() {
  return (
    <section className="hero-container">
      <div className="hero-data-bg" />
      <div className="hero-gradient-overlay" />
      
      <div className="relative z-10 h-full flex items-center justify-center px-6">
        <div className="text-center max-w-5xl">
          {/* Distinctive Title */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="hero-title mb-8">
              Bundle Any Token
              <br />
              Trade as One
            </h1>
          </motion.div>

          {/* Unique Subtitle */}
          <motion.p
            className="hero-subtitle mb-20"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          >
            Create diversified crypto portfolios as single tradeable tokens. 
            Professional-grade bundling with institutional security.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            className="flex items-center justify-center gap-6 mt-8 mb-16"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          >
            <button className="btn-unique flex items-center gap-2">
              Start Trading
              <ArrowRight className="w-4 h-4" />
            </button>
            
            <Link to="/build" className="btn-outline-unique">
              Build Your Index
            </Link>
          </motion.div>

          {/* Data Grid */}
          <motion.div
            className="grid grid-cols-2 gap-12 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
          >
            <div className="text-left">
              <div className="text-4xl font-bold text-primary text-data mb-2">{mockPlatformStats.createdBundles}</div>
              <div className="text-tertiary text-sm">Created Bundles</div>
              <div className="data-bar mt-2" />
            </div>
            <div className="text-left">
              <div className="text-4xl font-bold text-primary text-data mb-2">{mockPlatformStats.subscribedUsers}</div>
              <div className="text-tertiary text-sm">Subscribed Users</div>
              <div className="data-bar mt-2" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Unique Scroll Indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.8 }}
      >
        <div className="flex flex-col items-center gap-3 text-ghost">
          <div className="w-px h-8 bg-border-primary" />
          <span className="text-xs font-mono">SCROLL</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <ChevronDown className="w-3 h-3" />
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
} 