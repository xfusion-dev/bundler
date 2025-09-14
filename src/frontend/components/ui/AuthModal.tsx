import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Shield, Zap } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-void/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            className="relative card-unique p-8 max-w-md mx-4"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div className="text-center space-y-6">
              {/* Icon */}
              <div className="relative mx-auto w-16 h-16">
                <div className="w-16 h-16 bg-elevated border border-primary rounded flex items-center justify-center">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                
                {/* Animated loader ring */}
                <div className="absolute inset-0 border-2 border-transparent border-t-accent rounded-full animate-spin" />
              </div>

              {/* Title */}
              <div>
                <h3 className="heading-medium mb-2">Authenticating</h3>
                <p className="text-secondary">
                  Complete authentication in the Internet Identity popup window
                </p>
              </div>

              {/* Loading Steps */}
              <div className="space-y-3 text-left">
                <div className="flex items-center gap-3">
                  <motion.div
                    className="w-2 h-2 rounded-full bg-accent"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  <span className="text-secondary text-sm">Opening Internet Identity...</span>
                </div>
                <div className="flex items-center gap-3">
                  <motion.div
                    className="w-2 h-2 rounded-full bg-tertiary"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
                  />
                  <span className="text-tertiary text-sm">Waiting for authentication...</span>
                </div>
                <div className="flex items-center gap-3">
                  <motion.div
                    className="w-2 h-2 rounded-full bg-tertiary"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.6 }}
                  />
                  <span className="text-tertiary text-sm">Setting up secure session...</span>
                </div>
              </div>

              {/* Security Note */}
              <div className="bg-elevated border border-primary p-4 rounded">
                <div className="flex items-start gap-3">
                  <Zap className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                  <div className="text-left">
                    <div className="text-primary text-sm font-medium mb-1">
                      Secure Authentication
                    </div>
                    <div className="text-tertiary text-xs">
                      Internet Identity uses advanced cryptography to protect your identity. 
                      No passwords or personal data required.
                    </div>
                  </div>
                </div>
              </div>

              {/* Cancel Button */}
              <button
                onClick={onClose}
                className="btn-outline-unique w-full"
              >
                Cancel Authentication
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 