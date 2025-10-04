import { useState } from 'react';
import Header from './Header';
import Footer from './Footer';
import MobileNav from './MobileNav';
import WalletSidebar from '../ui/WalletSidebar';

interface LayoutProps {
  children: React.ReactNode;
  showHero?: boolean;
}

export default function Layout({ children, showHero = false }: LayoutProps) {
  const [showWalletSidebar, setShowWalletSidebar] = useState(false);

  return (
    <div className="bg-void">
      <Header showHero={showHero} onWalletClick={() => setShowWalletSidebar(true)} />
      <main className={showHero ? 'pb-20 md:pb-0' : 'pt-20 pb-20 md:pb-0'}>
        {children}
      </main>
      <Footer />
      <MobileNav />
      <WalletSidebar
        isOpen={showWalletSidebar}
        onClose={() => setShowWalletSidebar(false)}
      />
    </div>
  );
} 