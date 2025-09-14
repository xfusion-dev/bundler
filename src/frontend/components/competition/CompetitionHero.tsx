import { motion } from 'framer-motion';
import { ChevronDown, Users, DollarSign, Trophy, ArrowRight, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CompetitionHero() {
  return (
    <section className="hero-container">
      <div className="hero-data-bg" />
      <div className="hero-gradient-overlay" />
      
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-12 pt-32 lg:pt-24 sm:pt-16">
        <div className="text-center max-w-5xl">
          {/* Competition Title */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="hero-title mb-16">
              Launch Competition
              <br />
              Win $1,600 in Prizes
            </h1>
          </motion.div>

          {/* Competition Subtitle */}
          <motion.p
            className="hero-subtitle mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          >
            Subscribe to bundles, create your own, and share on social media to win prizes. 
            Competition runs until September 8, 2025, 20:00 UTC.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-12 sm:mb-16 mt-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          >
            <Link to="/bundles" className="btn-unique px-6 sm:px-8 py-3 sm:py-4 flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base">
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              Browse Bundles
            </Link>
            <Link to="/build" className="btn-outline-unique px-6 sm:px-8 py-3 sm:py-4 flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base">
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              Create Bundle
            </Link>
          </motion.div>

          {/* Prize Breakdown */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          >
            <div className="bg-surface/50 border border-primary rounded p-8 prize-box prize-box-warm">
              <div className="w-12 h-12 bg-elevated border border-primary rounded flex items-center justify-center mx-auto mb-6">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary text-data mb-3">30 × $10</div>
                <div className="text-primary font-medium mb-2">Random Subscribers</div>
                <div className="text-tertiary text-sm">
                  Subscribe to any bundle to enter
                </div>
              </div>
            </div>

            <div className="bg-surface/50 border border-primary rounded p-8 prize-box prize-box-cool">
              <div className="w-12 h-12 bg-elevated border border-primary rounded flex items-center justify-center mx-auto mb-6">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary text-data mb-3">30 × $10</div>
                <div className="text-primary font-medium mb-2">Social Sharers</div>
                <div className="text-tertiary text-sm">
                  Share subscription on X to enter
                </div>
              </div>
            </div>

            <div className="bg-surface/50 border border-primary rounded p-8 prize-box prize-box-blue">
              <div className="w-12 h-12 bg-elevated border border-primary rounded flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary text-data mb-3">$1,000</div>
                <div className="text-primary font-medium mb-2">Top Creators</div>
                <div className="text-tertiary text-sm">
                  $500 + $300 + $200 for most subscribed
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.6 }}
      >
        <div className="flex flex-col items-center gap-3 text-ghost">
          <div className="w-px h-8 bg-border-primary" />
          <span className="text-xs font-mono">EXPLORE BUNDLES</span>
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