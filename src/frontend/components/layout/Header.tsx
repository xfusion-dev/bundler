import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Menu, X } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import AuthModal from '../ui/AuthModal';
import UserDropdown from '../ui/UserDropdown';

interface HeaderProps {
  showHero?: boolean;
}

export default function Header({ showHero = false }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(!showHero);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, principal, login, logout, loading } = useAuth();

  useEffect(() => {
    // Only set up scroll listener on homepage with hero
    if (!showHero) {
      // For all non-homepage pages, always show scrolled state
      setIsScrolled(true);
      return;
    }

    // Homepage with hero - handle scroll
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
      
      if (!success) {
        // Handle login failure if needed
      }
    }
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <nav className={`nav-main ${isScrolled ? 'scrolled' : ''}`}>
        <div className="nav-content">
          {/* Left side - Logo, Menu Button, and Desktop Menu */}
          <div className="flex items-center gap-8">
            {/* Mobile Menu Button */}
            <button
              onClick={() => { setIsMobileMenuOpen(!isMobileMenuOpen); }}
              className="md:hidden p-2 text-tertiary hover:text-primary transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>

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
              <span className="nav-menu-disabled">Lending</span>
              {isAuthenticated && (
                <Link to="/portfolio">Portfolio</Link>
              )}
            </div>
          </div>

          {/* Right side - Auth */}
          <div className="nav-actions">
            {isAuthenticated && principal ? (
              <UserDropdown 
                principal={principal} 
                onSignOut={() => {
                  void logout();
                }} 
              />
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

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-surface border-t border-primary z-50">
            <div className="flex flex-col py-4">
              <Link
                to="/bundles"
                onClick={closeMobileMenu}
                className="px-6 py-3 text-tertiary hover:text-primary transition-colors border-b border-primary/20"
              >
                Discover Bundles
              </Link>
              <Link
                to="/build"
                onClick={closeMobileMenu}
                className="px-6 py-3 text-tertiary hover:text-primary transition-colors border-b border-primary/20"
              >
                Create Bundle
              </Link>
              <span className="px-6 py-3 text-quaternary opacity-50 border-b border-primary/20">
                Lending
              </span>
              {isAuthenticated && (
                <Link
                  to="/portfolio"
                  onClick={closeMobileMenu}
                  className="px-6 py-3 text-tertiary hover:text-primary transition-colors border-b border-primary/20"
                >
                  Portfolio
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Authentication Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => { setShowAuthModal(false); }} 
      />
    </>
  );
} 