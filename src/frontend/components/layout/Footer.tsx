import { Mail, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { XLogo } from '../ui/XLogo';
import { LinkedInLogo } from '../ui/LinkedInLogo';

export default function Footer() {
  return (
    <footer className="hidden md:block border-t border-primary px-6 py-12 bg-surface">
      <div className="max-w-7xl mx-auto">
        {/* Main Footer Content - Desktop Only */}
        <div className="hidden md:block asymmetric-grid mb-12">
          {/* Left Side - Brand & Description */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="nav-logo-icon">
                <span className="text-lg font-bold">X</span>
              </div>
              <span className="text-2xl font-bold text-primary">Fusion</span>
            </div>

            <p className="text-body max-w-md">
              The first Chain-Key token bundler. Create, trade, and manage
              diversified crypto portfolios with institutional-grade security.
            </p>

              <div className="flex items-center gap-4">
                <a href="https://x.com/xfusion_finance" target="_blank" rel="noopener noreferrer" className="text-tertiary hover:text-primary transition-colors">
                  <XLogo className="w-5 h-5" />
                </a>
                <a href="https://www.linkedin.com/company/xfusion-finance/" target="_blank" rel="noopener noreferrer" className="text-tertiary hover:text-primary transition-colors">
                  <LinkedInLogo className="w-5 h-5" />
                </a>
                <a href="#" className="text-tertiary hover:text-primary transition-colors">
                  <Mail className="w-5 h-5" />
                </a>
              </div>
          </div>

          {/* Right Side - Links Grid */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h4 className="heading-small mb-4">Product</h4>
              <div className="space-y-3">
                <Link to="/#features" className="block text-small hover:text-primary transition-colors">
                  Features
                </Link>
                <Link to="/bundles" className="block text-small hover:text-primary transition-colors">
                  Bundles
                </Link>
                <span className="block text-small text-quaternary opacity-50 cursor-not-allowed">
                  Analytics
                </span>
                <span className="block text-small text-quaternary opacity-50 cursor-not-allowed">
                  API
                </span>
              </div>
            </div>

            <div>
              <h4 className="heading-small mb-4">Resources</h4>
              <div className="space-y-3">
                <span className="block text-small text-quaternary opacity-50 cursor-not-allowed flex items-center gap-1">
                  Documentation
                  <ExternalLink className="w-3 h-3" />
                </span>
                <span className="block text-small text-quaternary opacity-50 cursor-not-allowed">
                  Tutorials
                </span>
                <span className="block text-small text-quaternary opacity-50 cursor-not-allowed">
                  Support
                </span>
                <span className="block text-small text-quaternary opacity-50 cursor-not-allowed">
                  Status
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Data Separator - Desktop Only */}
        <div className="h-px bg-border-primary mb-8 hidden md:block" />

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row items-center md:items-center justify-between gap-4">
          {/* Mobile: Just copyright and socials */}
          <div className="md:hidden w-full">
            <div className="flex items-center justify-between">
              <p className="text-caption font-mono text-gray-400">
                © 2025 XFUSION
              </p>
              <div className="flex items-center gap-4">
                <a href="https://x.com/xfusion_finance" target="_blank" rel="noopener noreferrer" className="text-tertiary hover:text-primary transition-colors">
                  <XLogo className="w-4 h-4" />
                </a>
                <a href="https://www.linkedin.com/company/xfusion-finance/" target="_blank" rel="noopener noreferrer" className="text-tertiary hover:text-primary transition-colors">
                  <LinkedInLogo className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Desktop: Full footer */}
          <div className="hidden md:flex items-center gap-8">
            <p className="text-caption font-mono">
              © 2025 XFUSION
            </p>
            <div className="flex items-center gap-6">
              <span className="text-caption text-quaternary opacity-50 cursor-not-allowed">
                Privacy Policy
              </span>
              <span className="text-caption text-quaternary opacity-50 cursor-not-allowed">
                Terms of Service
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 text-caption font-mono">
            <span>SECURED WITH</span>
            <a href="https://learn.internetcomputer.org/hc/en-us/articles/34209486239252-Chain-Key-Cryptography" target="_blank" rel="noopener noreferrer">
            <span className="text-primary font-semibold">CHAIN-KEY CRYPTOGRAPHY</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
} 