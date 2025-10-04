import { Link, useLocation } from 'react-router-dom';
import { Home, Package, PlusCircle, Briefcase, User } from 'lucide-react';

export default function MobileNav() {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/bundles', icon: Package, label: 'Bundles' },
    { path: '/build', icon: PlusCircle, label: 'Create' },
    { path: '/portfolio', icon: Briefcase, label: 'Portfolio' },
    { path: '/lending/supply', icon: User, label: 'Account' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-white/10 z-50">
      <div className="flex items-center justify-around px-2 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-3 py-1 transition-colors ${
                active ? 'text-white' : 'text-gray-500'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-500'}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
