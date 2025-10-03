import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './lib/AuthContext';
import Layout from './components/layout/Layout';
import ScrollToTop from './components/layout/ScrollToTop';
import HomePage from './pages/HomePage';
import BundleDetails from './pages/BundleDetails';
import BundleBuilder from './pages/BundleBuilder';
import Assets from './pages/Assets';
import Bundles from './pages/Bundles';
import Portfolio from './pages/Portfolio';
import Supply from './pages/Supply';
import Borrow from './pages/Borrow';

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
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
          <Route path="/supply" element={
            <Layout showHero={false}>
              <Supply />
            </Layout>
          } />
          <Route path="/borrow" element={
            <Layout showHero={false}>
              <Borrow />
            </Layout>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
