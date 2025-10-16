import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Menu, X, Wallet, Trophy } from 'lucide-react';
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { useAuth } from '../../lib/AuthContext';
import { icrc2Service } from '../../lib/icrc2-service';
import { idlFactory } from '../../../backend/declarations/backend.did.js';
import type { _SERVICE } from '../../../backend/declarations/backend.did';
import AuthModal from '../ui/AuthModal';
import UserDropdown from '../ui/UserDropdown';
const BACKEND_CANISTER_ID = 'dk3fi-vyaaa-aaaae-qfycq-cai';

interface HeaderProps {
  showHero?: boolean;
  onWalletClick?: () => void;
}

export default function Header({ showHero = false, onWalletClick }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(!showHero);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState<string>('0.00');
  const [userPoints, setUserPoints] = useState<number>(0);
  const { isAuthenticated, principal, login, logout, loading } = useAuth();

  useEffect(() => {
    if (!showHero) {
      setIsScrolled(true);
      return;
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [showHero]);

  useEffect(() => {
    const loadBalance = async () => {
      if (isAuthenticated) {
        try {
          const balance = await icrc2Service.getBalance();
          const formattedBalance = (Number(balance) / 1000000).toFixed(2);
          setUsdcBalance(formattedBalance);
        } catch (error) {
          console.error('Failed to load USDC balance:', error);
        }
      }
    };

    void loadBalance();

    const interval = setInterval(() => {
      void loadBalance();
    }, 10000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    const loadPoints = async () => {
      if (isAuthenticated && principal) {
        try {
          const agent = new HttpAgent({ host: 'https://ic0.app' });
          const backend = Actor.createActor<_SERVICE>(idlFactory, {
            agent,
            canisterId: BACKEND_CANISTER_ID,
          });
          const points = await backend.get_user_points([principal]);
          setUserPoints(Number(points));
        } catch (error) {
          console.error('[Header] Failed to load user points:', error);
        }
      }
    };

    void loadPoints();

    const interval = setInterval(() => {
      void loadPoints();
    }, 10000);

    return () => clearInterval(interval);
  }, [isAuthenticated, principal]);

  const handleAuth = async () => {
    if (isAuthenticated) {
      await logout();
    } else {
      setShowAuthModal(true);
      const success = await login();
      setShowAuthModal(false);
    }
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <nav className={`nav-main ${isScrolled ? 'scrolled' : ''}`}>
        <div className="nav-content">
          {/* Left side - Logo and Desktop Menu */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link to="/" className="nav-logo">
              <div className="nav-logo-icon">
                <span className="text-lg font-bold">X</span>
              </div>
              <span>Fusion</span>
            </Link>

            {/* Desktop Menu */}
            <div className="nav-menu hidden md:flex">
              <Link to="/bundles">Discover Bundles</Link>
              <Link to="/build">Create Bundle</Link>
              <Link to="/leaderboard">Leaderboard</Link>
              {isAuthenticated && (
                <Link to="/portfolio">Portfolio</Link>
              )}
            </div>
          </div>

          <div className="nav-actions">
            {isAuthenticated && principal ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={onWalletClick}
                  className="hidden md:flex items-center gap-2 px-3 py-2 border border-white/20 hover:bg-white/10 transition-colors cursor-pointer"
                  title="Your Points - Earn 1 point per cent spent buying, lose 1 point per cent selling"
                >
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span className="text-white font-mono text-sm">{userPoints.toLocaleString()}</span>
                  <span className="text-gray-400 text-xs">pts</span>
                </button>
                <button
                  onClick={onWalletClick}
                  className="hidden md:flex items-center gap-2 px-3 py-2 border border-white/20 hover:bg-white/10 transition-colors"
                  title="Open Wallet"
                >
                  <span className="text-white font-mono text-sm">${usdcBalance}</span>
                  <span className="text-gray-400 text-xs">USDC</span>
                </button>
                <UserDropdown
                  principal={principal}
                  onSignOut={() => {
                    void logout();
                  }}
                />
                <button
                  onClick={onWalletClick}
                  className="flex w-10 h-10 border border-white/20 hover:bg-white/10 items-center justify-center transition-colors md:hidden"
                  title="Open Wallet"
                >
                  <Wallet className="w-5 h-5 text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  void handleAuth();
                }}
                disabled={loading}
                className="btn-outline-unique"
              >
                {loading ? 'Loading...' : 'Sign In'}
              </button>
            )}
          </div>
        </div>
      </nav>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => { setShowAuthModal(false); }}
      />
    </>
  );
} 