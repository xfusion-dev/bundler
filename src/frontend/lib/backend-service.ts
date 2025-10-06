import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory } from '../../backend/declarations/backend.did.js';
import { authService } from './auth';

const BACKEND_CANISTER_ID = 'dk3fi-vyaaa-aaaae-qfycq-cai';

class BackendService {
  private actor: any = null;
  private agent: HttpAgent | null = null;

  async getActor() {
    if (this.actor) return this.actor;

    // Try to get authenticated agent first
    const authAgent = await authService.getAgent();

    if (authAgent) {
      // Use authenticated agent
      this.agent = authAgent;
      this.actor = Actor.createActor(idlFactory, {
        agent: authAgent,
        canisterId: BACKEND_CANISTER_ID,
      });
    } else {
      // Fall back to anonymous agent
      const agent = new HttpAgent({
        host: 'https://ic0.app',
      });

      this.agent = agent;
      this.actor = Actor.createActor(idlFactory, {
        agent,
        canisterId: BACKEND_CANISTER_ID,
      });
    }

    return this.actor;
  }

  async listAssets() {
    try {
      // Create a fresh agent for query calls to avoid signature issues
      const agent = new HttpAgent({
        host: 'https://ic0.app',
      });

      const actor = Actor.createActor(idlFactory, {
        agent,
        canisterId: BACKEND_CANISTER_ID,
      });

      const result = await actor.list_assets([]);
      return result;
    } catch (e) {
      console.error('listAssets failed:', e);
      return [
        { id: 'ckBTC', symbol: 'ckBTC', name: 'Bitcoin', is_active: true },
        { id: 'ckETH', symbol: 'ckETH', name: 'Ethereum', is_active: true },
        { id: 'ckUSDC', symbol: 'ckUSDC', name: 'USD Coin', is_active: true },
      ];
    }
  }

  async listBundles() {
    try {
      // Create a fresh agent for query calls to avoid signature issues
      const agent = new HttpAgent({
        host: 'https://ic0.app',
      });

      const actor = Actor.createActor(idlFactory, {
        agent,
        canisterId: BACKEND_CANISTER_ID,
      });

      const result = await actor.list_active_bundles();
      console.log('Bundles from backend:', result);
      return result;
    } catch (e) {
      console.error('listBundles failed:', e);
      throw e;
    }
  }

  async executeQuote(quote: any): Promise<number> {
    try {
      const actor = await this.getActor();
      const result = await actor.execute_quote(quote);

      if ('Ok' in result) {
        return Number(result.Ok);
      } else {
        throw new Error(result.Err || 'Failed to execute quote');
      }
    } catch (e) {
      console.error('executeQuote failed:', e);
      throw e;
    }
  }

  async getUserHoldings() {
    try {
      const actor = await this.getActor();
      const principal = await authService.getPrincipal();
      if (!principal) {
        throw new Error('Not authenticated');
      }

      const result = await actor.get_user_holdings(principal);
      if ('Ok' in result) {
        return result.Ok;
      } else {
        throw new Error(result.Err || 'Failed to get holdings');
      }
    } catch (e) {
      console.error('getUserHoldings failed:', e);
      return [];
    }
  }

  async createBundle(name: string, description: string | null, allocations: { asset_id: string; percentage: number }[]) {
    try {
      const actor = await this.getActor();

      // Get the current user's principal from the auth service
      const userPrincipal = await authService.getPrincipal();
      if (!userPrincipal) {
        throw new Error('Not authenticated');
      }

      // Create bundle config - backend expects BundleConfig with Principal type
      const bundleConfig = {
        id: BigInt(Date.now()),
        creator: userPrincipal,
        name: name,
        description: description ? [description] : [],
        created_at: BigInt(Date.now() * 1000000),
        allocations: allocations,
        is_active: true
      };

      console.log('Creating bundle with config:', bundleConfig);
      const result = await actor.create_bundle(bundleConfig);

      if ('Ok' in result) {
        console.log('Bundle created successfully with ID:', result.Ok);
        return result.Ok;
      } else {
        throw new Error(result.Err || 'Failed to create bundle');
      }
    } catch (e) {
      console.error('createBundle failed:', e);
      throw e;
    }
  }

  async calculateBundleNav(bundleId: number) {
    try {
      const agent = new HttpAgent({
        host: 'https://ic0.app',
      });

      const actor = Actor.createActor(idlFactory, {
        agent,
        canisterId: BACKEND_CANISTER_ID,
      });

      const result = await actor.calculate_bundle_nav(bundleId);

      if ('Ok' in result) {
        return result.Ok;
      }
      throw new Error(result.Err);
    } catch (e) {
      console.error('calculateBundleNav failed:', e);
      throw e;
    }
  }

  async getBundleHolderCount(bundleId: number) {
    try {
      const agent = new HttpAgent({
        host: 'https://ic0.app',
      });

      const actor = Actor.createActor(idlFactory, {
        agent,
        canisterId: BACKEND_CANISTER_ID,
      });

      const holders = await actor.get_nav_holders(bundleId);
      return holders.length;
    } catch (e) {
      console.error('getBundleHolderCount failed:', e);
      return 0;
    }
  }

  async getBundleHoldings(bundleId: number) {
    try {
      const agent = new HttpAgent({
        host: 'https://ic0.app',
      });

      const actor = Actor.createActor(idlFactory, {
        agent,
        canisterId: BACKEND_CANISTER_ID,
      });

      const holdings = await actor.get_bundle_holdings(bundleId);
      return holdings;
    } catch (e) {
      console.error('getBundleHoldings failed:', e);
      return [];
    }
  }

  // Note: We get asset prices from NAV calculation data instead
  // as it includes the oracle prices already
}

export const backendService = new BackendService();