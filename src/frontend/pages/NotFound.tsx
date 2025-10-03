import { Link } from 'react-router-dom';
import { ArrowLeft, Home, Search } from 'lucide-react';
import SEO from '../components/SEO';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <SEO
        title="Page Not Found | XFusion"
        description="The page you are looking for could not be found."
      />
      <div className="max-w-2xl w-full text-center">
        <div className="border border-white/10 bg-white/5 p-16">
          <div className="mb-8">
            <div className="text-9xl font-bold text-white mb-4">404</div>
            <div className="h-1 w-32 bg-gradient-to-r from-transparent via-white to-transparent mx-auto mb-8" />
            <h1 className="text-4xl font-bold text-white mb-4">Page Not Found</h1>
            <p className="text-gray-400 text-lg max-w-md mx-auto">
              The page you're looking for doesn't exist or has been moved. Let's get you back on track.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/"
              className="btn-unique px-8 py-3 flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              Go Home
            </Link>
            <Link
              to="/bundles"
              className="btn-outline-unique px-8 py-3 flex items-center justify-center gap-2"
            >
              <Search className="w-5 h-5" />
              Discover Bundles
            </Link>
          </div>

          <div className="mt-12 pt-8 border-t border-white/10">
            <p className="text-gray-500 text-sm mb-4">Popular pages:</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link to="/build" className="text-gray-400 hover:text-white text-sm transition-colors">
                Create Bundle
              </Link>
              <span className="text-gray-600">•</span>
              <Link to="/portfolio" className="text-gray-400 hover:text-white text-sm transition-colors">
                Portfolio
              </Link>
              <span className="text-gray-600">•</span>
              <Link to="/lending/supply" className="text-gray-400 hover:text-white text-sm transition-colors">
                Lend
              </Link>
              <span className="text-gray-600">•</span>
              <Link to="/lending/borrow" className="text-gray-400 hover:text-white text-sm transition-colors">
                Borrow
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
