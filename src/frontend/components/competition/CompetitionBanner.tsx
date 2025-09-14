import { motion } from 'framer-motion';
import { Trophy, Clock, DollarSign, Users } from 'lucide-react';
import { competitionConfig, getTimeRemaining } from '../../lib/competition';
import { useState, useEffect } from 'react';

export default function CompetitionBanner() {
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining(competitionConfig.endDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeRemaining(competitionConfig.endDate));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!competitionConfig.isActive) return null;

  return (
    <motion.div
      className="bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20 rounded p-6 mb-8"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-accent/10 border border-accent/20 rounded flex items-center justify-center">
            <Trophy className="w-6 h-6 text-accent" />
          </div>
          
          <div>
            <h3 className="heading-medium text-accent mb-1">
              🏆 Launch Competition
            </h3>
            <p className="text-secondary text-sm">
              Subscribe to bundles and share on social media to win prizes!
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-2 text-accent text-sm font-medium mb-1">
            <Clock className="w-4 h-4" />
            <span className="font-mono">
              {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m
            </span>
          </div>
          <div className="text-tertiary text-xs">Time remaining</div>
        </div>
      </div>

      {/* Prize Breakdown */}
      <div className="grid grid-cols-3 gap-6 mt-6 pt-6 border-t border-accent/20">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-accent text-sm font-medium mb-1">
            <Users className="w-4 h-4" />
            <span>Subscribers</span>
          </div>
          <div className="text-primary font-bold text-data">30 × $10</div>
          <div className="text-tertiary text-xs">Random winners</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-accent text-sm font-medium mb-1">
            <DollarSign className="w-4 h-4" />
            <span>Social Shares</span>
          </div>
          <div className="text-primary font-bold text-data">30 × $10</div>
          <div className="text-tertiary text-xs">Random winners</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-accent text-sm font-medium mb-1">
            <Trophy className="w-4 h-4" />
            <span>Top Creators</span>
          </div>
          <div className="text-primary font-bold text-data">$500 + $300 + $200</div>
          <div className="text-tertiary text-xs">Most subscribed</div>
        </div>
      </div>
    </motion.div>
  );
} 