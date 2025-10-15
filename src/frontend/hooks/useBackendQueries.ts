import { useQuery } from '@tanstack/react-query';
import { backendService } from '../lib/backend-service';
import { icrc2Service } from '../lib/icrc2-service';
import { icrc151Service } from '../lib/icrc151-service';
import { authService } from '../lib/auth';

export function useBundlesList() {
  return useQuery({
    queryKey: ['bundles-list'],
    queryFn: async () => {
      const data = await backendService.getBundlesList();
      return data.map((bundle: any) => {
        const cleaned: any = { ...bundle };
        if (cleaned.token_location && 'ICRC151' in cleaned.token_location) {
          cleaned.token_location = {
            ICRC151: {
              ledger: cleaned.token_location.ICRC151.ledger,
              token_id: Array.from(cleaned.token_location.ICRC151.token_id)
            }
          };
        }
        for (const key in cleaned) {
          if (typeof cleaned[key] === 'bigint') {
            cleaned[key] = cleaned[key].toString();
          }
        }
        return cleaned;
      });
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

export function useAssets() {
  return useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const data = await backendService.listAssets();
      return JSON.parse(JSON.stringify(data, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ));
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
}

export function useBundlesWithAssets() {
  const bundlesQuery = useBundlesList();
  const assetsQuery = useAssets();

  const transformedBundles = bundlesQuery.data && assetsQuery.data
    ? transformBundlesData(bundlesQuery.data, assetsQuery.data)
    : [];

  return {
    bundles: transformedBundles,
    isLoading: bundlesQuery.isLoading || assetsQuery.isLoading,
    error: bundlesQuery.error || assetsQuery.error,
  };
}

export function useUsdcBalance() {
  return useQuery({
    queryKey: ['usdc-balance'],
    queryFn: async () => {
      const balance = await icrc2Service.getBalance();
      const numBalance = typeof balance === 'bigint' ? Number(balance) : Number(balance);
      return (numBalance / 1000000).toFixed(2);
    },
    staleTime: 10_000,
    gcTime: 5 * 60_000,
  });
}

export function useUserTokenBalances() {
  return useQuery({
    queryKey: ['user-token-balances'],
    queryFn: async () => {
      const principal = await authService.getPrincipal();
      if (!principal) return [];
      const balances = await icrc151Service.getBalancesFor(principal);
      return balances.map((b: any) => ({
        balance: typeof b.balance === 'bigint' ? Number(b.balance) : Number(b.balance),
        token_id: Array.from(b.token_id)
      }));
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

export function useBundleNav(bundleId: number) {
  return useQuery({
    queryKey: ['bundle-nav', bundleId],
    queryFn: async () => {
      const data = await backendService.calculateBundleNav(bundleId);
      return JSON.parse(JSON.stringify(data, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ));
    },
    staleTime: 3 * 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useUserHoldings() {
  const tokenBalancesQuery = useUserTokenBalances();
  const bundlesQuery = useBundlesList();
  const assetsQuery = useAssets();

  const isLoading = tokenBalancesQuery.isLoading || bundlesQuery.isLoading || assetsQuery.isLoading;

  return useQuery({
    queryKey: ['user-holdings', tokenBalancesQuery.data, bundlesQuery.data, assetsQuery.data],
    queryFn: async () => {
      const tokenBalances = tokenBalancesQuery.data;
      const allBundles = bundlesQuery.data;
      const allAssets = assetsQuery.data;

      if (!tokenBalances || tokenBalances.length === 0) {
        return { holdings: [], totalValue: 0 };
      }

      const assetMap = new Map(allAssets.map((asset: any) => [asset.id, asset]));

      const tokenIdToBundleMap = new Map();
      allBundles.forEach((bundle: any) => {
        if (bundle.token_location && 'ICRC151' in bundle.token_location) {
          const tokenIdHex = Array.from(bundle.token_location.ICRC151.token_id)
            .map((b: number) => b.toString(16).padStart(2, '0'))
            .join('');
          tokenIdToBundleMap.set(tokenIdHex, bundle);
        }
      });

      const holdingsPromises = tokenBalances.map(async (tokenBalance: any) => {
        try {
          const tokenIdHex = Array.from(tokenBalance.token_id)
            .map((b: number) => b.toString(16).padStart(2, '0'))
            .join('');

          const bundle = tokenIdToBundleMap.get(tokenIdHex);
          if (!bundle) {
            console.warn('Bundle not found for token_id:', tokenIdHex);
            return null;
          }

          const bundleId = Number(bundle.id);
          console.log(`Processing holding - Bundle ID: ${bundleId}, Name: ${bundle.name}, Token ID: ${tokenIdHex}`);

          const navData = await backendService.calculateBundleNav(bundleId);

          const navTokens = tokenBalance.balance / 1e8;
          const navPrice = Number(navData.nav_per_token) / 1e8;
          const totalValue = navTokens * navPrice;

          return {
            bundleId,
            bundleName: bundle.name,
            tokenSymbol: bundle.symbol || 'NAV',
            navTokens,
            navPrice,
            totalValue,
            allocations: bundle.allocations.map((a: any) => {
              const assetDetails = assetMap.get(a.asset_id);
              return {
                symbol: a.asset_id,
                percentage: a.percentage,
                logo: assetDetails?.metadata?.logo_url || ''
              };
            })
          };
        } catch (error) {
          console.error(`Failed to load bundle data:`, error);
          return null;
        }
      });

      const loadedHoldings = (await Promise.all(holdingsPromises)).filter((h): h is any => h !== null);
      const totalValue = loadedHoldings.reduce((sum: number, h: any) => sum + h.totalValue, 0);

      return { holdings: loadedHoldings, totalValue };
    },
    enabled: !isLoading && !!tokenBalancesQuery.data && !!bundlesQuery.data && !!assetsQuery.data,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

function transformBundlesData(bundlesList: any[], allAssets: any[]) {
  const assetMap = new Map(allAssets.map((asset: any) => [asset.id, asset]));

  return bundlesList.map((bundle: any) => ({
    id: Number(bundle.id),
    name: bundle.name,
    symbol: bundle.symbol,
    description: bundle.description || '',
    tokens: bundle.allocations.map((a: any) => {
      const assetDetails = assetMap.get(a.asset_id);
      return {
        symbol: assetDetails?.symbol || a.asset_id,
        name: assetDetails?.name || a.asset_id,
        allocation: a.percentage,
        logo: assetDetails?.metadata?.logo_url || ''
      };
    }),
    totalValue: Number(bundle.nav_per_token) / 100000000,
    change24h: 0,
    subscribers: Number(bundle.holders),
    creator: '',
    allocations: bundle.allocations,
    created_at: bundle.created_at,
    is_active: bundle.is_active,
    marketCapValue: Number(bundle.total_nav_usd) / 100000000
  }));
}
