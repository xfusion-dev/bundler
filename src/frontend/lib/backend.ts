import { authService } from './auth';
import { backend } from '../../backend/declarations';
import { idlFactory, canisterId } from '../../backend/declarations';
import type { _SERVICE } from '../../backend/declarations/backend.did';

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  category_id: string;
  logo_url?: string;
  description?: string;
  decimals: number;
  canister_id?: string;
  is_active: boolean;
  slug?: string;
  current_price: number;
  price_change_24h: number;
  created_at: bigint;
  updated_at: bigint;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
  created_at: bigint;
  updated_at: bigint;
}

export interface BundleAsset {
  asset_id: string;
  allocation_percentage: number;
}

export interface Bundle {
  id: string;
  name: string;
  description: string;
  creator: string;
  category: string;
  status: string; // draft/published/paused/archived
  assets: BundleAsset[];
  total_value_usd: number;
  performance_24h: number;
  subscribers: number;
  likes: number;
  views: number;
  tags: string[];
  logo_url?: string;
  color?: string;
  is_featured: boolean;
  created_at: bigint;
  updated_at: bigint;
}

export interface CreateBundlePayload {
  name: string;
  description: string;
  category: string;
  assets: BundleAsset[];
  tags: string[];
  logo_url?: string;
  color?: string;
}

class BackendService {
  // Asset operations
  async getAssets(): Promise<Asset[]> {
    try {
      const result = await backend.get_assets();
      return result;
    } catch (error) {
      console.error('Failed to get assets:', error);
      throw error;
    }
  }

  async getActiveAssets(): Promise<Asset[]> {
    try {
      const result = await backend.get_active_assets();
      return result;
    } catch (error) {
      console.error('Failed to get active assets:', error);
      throw error;
    }
  }

  async getAssetsByCategory(categoryId: string): Promise<Asset[]> {
    try {
      const result = await backend.get_assets_by_category(categoryId);
      return result;
    } catch (error) {
      console.error('Failed to get assets by category:', error);
      throw error;
    }
  }

  async searchAssets(query: string): Promise<Asset[]> {
    try {
      const result = await backend.search_assets(query);
      return result;
    } catch (error) {
      console.error('Failed to search assets:', error);
      throw error;
    }
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    try {
      const result = await backend.get_categories();
      return result;
    } catch (error) {
      console.error('Failed to get categories:', error);
      throw error;
    }
  }

  async getActiveCategories(): Promise<Category[]> {
    try {
      const result = await backend.get_active_categories();
      return result;
    } catch (error) {
      console.error('Failed to get active categories:', error);
      throw error;
    }
  }

  // Bundle operations
  async createBundle(payload: CreateBundlePayload): Promise<Bundle> {
    try {
      // Create authenticated actor
      const backendCanisterId = canisterId || 'fgvpf-xiaaa-aaaai-q325q-cai'; // Use mainnet canister ID
      console.log('Creating authenticated actor for canister:', backendCanisterId);
      
      const isAuth = await authService.isAuthenticated();
      console.log('User is authenticated:', isAuth);
      
      const authenticatedBackend = await authService.createActor<_SERVICE>(backendCanisterId, idlFactory);
      if (!authenticatedBackend) {
        throw new Error('Failed to create authenticated connection');
      }
      
      console.log('Authenticated actor created successfully');

      // Convert optional fields to Candid format
      const candidPayload: any = {
        name: payload.name,
        description: payload.description,
        category: payload.category,
        assets: payload.assets,
        tags: payload.tags,
        logo_url: payload.logo_url ? [payload.logo_url] : [],
        color: payload.color ? [payload.color] : [],
      };
      
      const result = await authenticatedBackend.create_bundle(candidPayload);
      if ('Ok' in result) {
        // Convert Candid optional fields back to TypeScript format
        const bundle = result.Ok;
        return {
          ...bundle,
          logo_url: Array.isArray(bundle.logo_url) && bundle.logo_url.length > 0 ? bundle.logo_url[0] : undefined,
          color: Array.isArray(bundle.color) && bundle.color.length > 0 ? bundle.color[0] : undefined,
          is_featured: false, // Add missing field
        };
      } else {
        throw new Error(result.Err);
      }
    } catch (error) {
      console.error('Failed to create bundle:', error);
      throw error;
    }
  }

  async getBundles(): Promise<Bundle[]> {
    try {
      const result = await backend.get_bundles();
      return result;
    } catch (error) {
      console.error('Failed to get bundles:', error);
      throw error;
    }
  }

  async getPublishedBundles(): Promise<Bundle[]> {
    try {
      const result = await backend.get_published_bundles();
      return result;
    } catch (error) {
      console.error('Failed to get published bundles:', error);
      throw error;
    }
  }

  async getFeaturedBundles(): Promise<Bundle[]> {
    try {
      const result = await backend.get_featured_bundles();
      return result;
    } catch (error) {
      console.error('Failed to get featured bundles:', error);
      throw error;
    }
  }

  async getBundlesByCreator(creator: string): Promise<Bundle[]> {
    try {
      const result = await backend.get_bundles_by_creator(creator);
      return result;
    } catch (error) {
      console.error('Failed to get bundles by creator:', error);
      throw error;
    }
  }

  async getBundlesByCategory(category: string): Promise<Bundle[]> {
    try {
      const result = await backend.get_bundles_by_category(category);
      return result;
    } catch (error) {
      console.error('Failed to get bundles by category:', error);
      throw error;
    }
  }

  async searchBundles(query: string): Promise<Bundle[]> {
    try {
      const result = await backend.search_bundles(query);
      return result;
    } catch (error) {
      console.error('Failed to search bundles:', error);
      throw error;
    }
  }

  async getBundle(id: string): Promise<Bundle> {
    try {
      const result = await backend.get_bundle(id);
      if ('Ok' in result) {
        return result.Ok;
      } else {
        throw new Error(result.Err);
      }
    } catch (error) {
      console.error('Failed to get bundle:', error);
      throw error;
    }
  }

  // Platform statistics
  async getPlatformStats(): Promise<{ categories: number; assets: number; bundles: number }> {
    try {
      const [categories, assets, bundles] = await backend.get_platform_stats();
      return {
        categories: Number(categories),
        assets: Number(assets),
        bundles: Number(bundles)
      };
    } catch (error) {
      console.error('Failed to get platform stats:', error);
      throw error;
    }
  }

  // Helper to check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    const authState = await authService.getAuthState();
    return authState.isAuthenticated;
  }

  // Helper to get current user principal
  async getCurrentUserPrincipal(): Promise<string | null> {
    const authState = await authService.getAuthState();
    return authState.principal ? authState.principal.toString() : null;
  }
}

export const backendService = new BackendService(); 