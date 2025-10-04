import Header from './Header';
import Footer from './Footer';
import MobileNav from './MobileNav';

interface LayoutProps {
  children: React.ReactNode;
  showHero?: boolean;
}

export default function Layout({ children, showHero = false }: LayoutProps) {
  return (
    <div className="bg-void">
      <Header showHero={showHero} />
      <main className={showHero ? 'pb-20 md:pb-0' : 'pt-20 pb-20 md:pb-0'}>
        {children}
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
} 