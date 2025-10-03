import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
}

export default function SEO({
  title = 'XFusion - Bundle Tokens. Trade as One.',
  description = "Crypto's ETF moment — reimagined for DeFi. Create diversified crypto portfolios as single tradeable tokens with institutional-grade security.",
  keywords = 'crypto, DeFi, token bundling, portfolio, Chain-Key, blockchain, ethereum, bitcoin',
  ogImage = 'https://xfusion.finance/og.png'
}: SEOProps) {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />

      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={ogImage} />
    </Helmet>
  );
}
