import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Menu, X, Wallet } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import AuthModal from '../ui/AuthModal';
import UserDropdown from '../ui/UserDropdown';

interface HeaderProps {
  showHero?: boolean;
  onWalletClick?: () => void;
}

export default function Header({ showHero = false, onWalletClick }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(!showHero);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
                <UserDropdown
                  principal={principal}
                  onSignOut={() => {
                    void logout();
                  }}
                />
                <button
                  onClick={onWalletClick}
                  className="flex w-10 h-10 border border-white/20 hover:bg-white/10 items-center justify-center transition-colors"
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