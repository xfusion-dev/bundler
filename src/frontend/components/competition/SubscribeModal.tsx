import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Trophy, Users, Share2, Check } from 'lucide-react';
import { validateEmail } from '../../lib/competition';
import { competitionApi } from '../../lib/competition-api';
import { useAuth } from '../../lib/AuthContext';
import type { Bundle } from '../../lib/mock-data';

interface SubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  bundle: Bundle;
  isAuthenticated: boolean;
  onLogin: () => void;
}

export default function SubscribeModal({ 
  isOpen, 
  onClose, 
  bundle, 
  isAuthenticated, 
  onLogin 
}: SubscribeModalProps) {
  const { principal } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [emailError, setEmailError] = useState('');

  const handleSubscribe = async () => {
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    if (!principal) {
      setEmailError('Please login first');
      return;
    }

    setEmailError('');
    setIsSubscribing(true);

    try {
      await competitionApi.subscribe({
        bundle_id: bundle.id,
        principal: principal.toString(),
        email: email,
      });
      setSubscribed(true);
    } catch (error) {
      console.error('Subscription failed:', error);
      setEmailError(error instanceof Error ? error.message : 'Subscription failed');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleShare = async (platform: 'twitter' | 'linkedin') => {
    // Record the share in our API
    if (principal) {
      try {
        await competitionApi.recordShare({
          bundle_id: bundle.id,
          principal: principal.toString(),
        });
      } catch (error) {
        console.error('Failed to record share:', error);
        // Continue with share anyway
      }
    }

    const shareUrl = `${window.location.origin}/bundle/${bundle.id}`;
    
    if (platform === 'twitter') {
      const text = `Just subscribed to the ${bundle.name} bundle on @xfusion_finance! 🚀 #XFusion #DeFi`;
      const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
      window.open(url, '_blank', 'width=600,height=400');
    } else {
      // LinkedIn only supports URL sharing, copy text to clipboard for user
      const text = `Excited to subscribe to the ${bundle.name} bundle on XFusion! Revolutionary token bundling platform. ${shareUrl}`;
      
      navigator.clipboard.writeText(text).then(() => {
        // Open LinkedIn share dialog
        const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        window.open(url, '_blank', 'width=600,height=400');
        
        // Show user that text was copied
        alert('Post text copied to clipboard! Paste it in your LinkedIn post.');
      }).catch(() => {
        // Fallback if clipboard fails
        const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        window.open(url, '_blank', 'width=600,height=400');
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-void/80 backdrop-blur-md"
              onClick={onClose}
            />
            
            <motion.div
              className="relative bg-surface border border-primary rounded p-8 max-w-md mx-4"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
            >
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-elevated border border-primary rounded flex items-center justify-center mx-auto">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                
                <div>
                  <h3 className="heading-medium mb-2">Sign In Required</h3>
                  <p className="text-secondary">
                    Sign in with Internet Identity to subscribe to {bundle.name}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button onClick={onLogin} className="btn-unique flex-1">
                    Sign In
                  </button>
                  <button onClick={onClose} className="btn-outline-unique">
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-void/80 backdrop-blur-md"
            onClick={onClose}
          />
          
          <motion.div
            className="relative bg-surface border border-primary rounded p-8 max-w-lg mx-4"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-tertiary hover:text-primary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {!subscribed ? (
              <div className="space-y-6">
                {/* Header */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-elevated border border-primary rounded flex items-center justify-center mx-auto mb-4">
                    <Trophy className="w-8 h-8 text-accent" />
                  </div>
                  <h3 className="heading-medium mb-2">Subscribe to {bundle.name}</h3>
                  <p className="text-secondary">
                    Join the competition and win prizes!
                  </p>
                </div>

                {/* Competition Info */}
                <div className="bg-elevated border border-primary p-4 rounded space-y-3">
                  <div className="text-primary text-sm font-medium">🏆 Competition Prizes</div>
                  <div className="space-y-1 text-xs text-secondary">
                    <div>• 30 random subscribers win $10 each</div>
                    <div>• 30 random social sharers win $10 each</div>
                    <div>• Top bundle creators win $500, $300, $200</div>
                  </div>
                </div>

                {/* Email Input */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-secondary text-sm mb-2">
                      Email Address <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-tertiary" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setEmailError('');
                        }}
                        placeholder="your@email.com"
                        className={`w-full bg-elevated border pl-10 pr-4 py-3 text-primary rounded focus:outline-none transition-colors ${
                          emailError ? 'border-red-400 focus:border-red-400' : 'border-primary focus:border-accent'
                        }`}
                      />
                    </div>
                    {emailError && (
                      <p className="text-red-400 text-xs mt-1">{emailError}</p>
                    )}
                  </div>

                  <div className="text-xs text-tertiary">
                    We'll send you competition updates and verify your entry. 
                    No spam, unsubscribe anytime.
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={handleSubscribe}
                  disabled={isSubscribing || !email}
                  className="btn-unique w-full py-3 flex items-center justify-center gap-2"
                >
                  {isSubscribing ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                      Subscribing...
                    </>
                  ) : (
                    'Subscribe & Enter Competition'
                  )}
                </button>
              </div>
            ) : (
              <div className="text-center space-y-6">
                {/* Success State */}
                <div className="w-16 h-16 bg-green-400/10 border border-green-400/20 rounded flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-green-400" />
                </div>
                
                <div>
                  <h3 className="heading-medium mb-2 text-green-400">Successfully Subscribed!</h3>
                  <p className="text-secondary">
                    You're now entered in the competition for {bundle.name}
                  </p>
                </div>

                {/* Social Sharing */}
                <div className="bg-elevated border border-primary p-4 rounded">
                  <div className="text-primary text-sm font-medium mb-3 flex items-center gap-2">
                    <Share2 className="w-4 h-4" />
                    Share for Extra Entries
                  </div>
                  <p className="text-secondary text-xs mb-4">
                    Share your subscription on social media and tag @xfusion_finance for a chance to win an additional $10!
                  </p>
                  
                  <button 
                    onClick={() => handleShare('twitter')}
                    className="btn-unique w-full py-2 text-sm"
                  >
                    Share on X
                  </button>
                </div>

                <button onClick={onClose} className="btn-outline-unique w-full">
                  Close
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 