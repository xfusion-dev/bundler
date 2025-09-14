import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
  showHero?: boolean;
}

export default function Layout({ children, showHero = false }: LayoutProps) {
  return (
    <div className="bg-void">
      <Header showHero={showHero} />
      <main className={showHero ? '' : 'pt-20'}>
        {children}
      </main>
      <Footer />
    </div>
  );
} 