import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './lib/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/layout/Layout';
import ScrollToTop from './components/layout/ScrollToTop';
import HomePage from './pages/HomePage';
import BundleDetails from './pages/BundleDetails';
import BundleBuilder from './pages/BundleBuilder';
import Assets from './pages/Assets';
import Bundles from './pages/Bundles';
import Portfolio from './pages/Portfolio';
import Lending from './pages/Lending';
import Lend from './pages/Lend';
import Borrow from './pages/Borrow';
import NotFound from './pages/NotFound';

function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <AuthProvider>
          <Router>
            <ScrollToTop />
            <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#000',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '16px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            },
            success: {
              iconTheme: {
                primary: '#fff',
                secondary: '#000',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#000',
              },
            },
          }}
        />
        <Routes>
          <Route path="/" element={
            <Layout showHero={true}>
              <HomePage />
            </Layout>
          } />
          <Route path="/bundle/:id" element={
            <Layout showHero={false}>
              <BundleDetails />
            </Layout>
          } />
          <Route path="/build" element={
            <Layout showHero={false}>
              <BundleBuilder />
            </Layout>
          } />
          <Route path="/assets" element={
            <Layout showHero={false}>
              <Assets />
            </Layout>
          } />
          <Route path="/bundles" element={
            <Layout showHero={false}>
              <Bundles />
            </Layout>
          } />
          <Route path="/portfolio" element={
            <Layout showHero={false}>
              <Portfolio />
            </Layout>
          } />
          <Route path="/lending" element={
            <Layout showHero={false}>
              <Lending />
            </Layout>
          } />
          <Route path="/lending/supply" element={
            <Layout showHero={false}>
              <Lend />
            </Layout>
          } />
          <Route path="/lending/borrow" element={
            <Layout showHero={false}>
              <Borrow />
            </Layout>
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
          </Router>
        </AuthProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
