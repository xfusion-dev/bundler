import { useQuery } from '@tanstack/react-query';
import { backendService } from '../lib/backend-service';

export function useBundlesList() {
  return useQuery({
    queryKey: ['bundles-list'],
    queryFn: () => backendService.getBundlesList(),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

export function useAssets() {
  return useQuery({
    queryKey: ['assets'],
    queryFn: () => backendService.listAssets(),
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
