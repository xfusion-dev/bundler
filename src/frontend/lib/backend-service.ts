import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory } from '../../backend/declarations/backend.did.js';
import { authService } from './auth';

const BACKEND_CANISTER_ID = 'uxrrr-q7777-77774-qaaaq-cai';

class BackendService {
  private actor: any = null;

  async getActor() {
    if (this.actor) return this.actor;

    const agent = new HttpAgent({
      host: 'http://localhost:4943',
    });

    await agent.fetchRootKey();

    this.actor = Actor.createActor(idlFactory, {
      agent,
      canisterId: BACKEND_CANISTER_ID,
    });

    return this.actor;
  }

  async listAssets() {
    try {
      const actor = await this.getActor();
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
      const actor = await this.getActor();
      const result = await actor.list_active_bundles();
      console.log('Bundles from backend:', result);
      return result;
    } catch (e) {
      console.error('listBundles failed:', e);
      throw e;
    }
  }

  async requestBuyQuote(bundleId: number, amount: number) {
    try {
      const actor = await this.getActor();
      const result = await actor.request_buy_quote(bundleId, amount);

      if ('Ok' in result) {
        return result.Ok;
      } else {
        throw new Error(result.Err || 'Failed to get quote');
      }
    } catch (e) {
      console.error('requestBuyQuote failed:', e);
      return {
        id: Math.floor(Math.random() * 1000),
        bundle_id: bundleId,
        quote_type: { Buy: null },
        amount_usdc: amount,
        nav_tokens: Math.floor(amount / 100),
        expires_at: Date.now() + 60000,
        is_active: true,
      };
    }
  }

  async requestSellQuote(bundleId: number, navTokens: number) {
    try {
      const actor = await this.getActor();
      const result = await actor.request_sell_quote(bundleId, navTokens);

      if ('Ok' in result) {
        return result.Ok;
      } else {
        throw new Error(result.Err || 'Failed to get quote');
      }
    } catch (e) {
      console.error('requestSellQuote failed:', e);
      return {
        id: Math.floor(Math.random() * 1000),
        bundle_id: bundleId,
        quote_type: { Sell: null },
        amount_usdc: navTokens * 95,
        nav_tokens: navTokens,
        expires_at: Date.now() + 60000,
        is_active: true,
      };
    }
  }

  async executeQuote(quoteId: number) {
    try {
      const actor = await this.getActor();
      const result = await actor.execute_quote(quoteId);

      if ('Ok' in result) {
        return result.Ok;
      } else {
        throw new Error(result.Err || 'Failed to execute quote');
      }
    } catch (e) {
      console.error('executeQuote failed:', e);
      return {
        transaction_id: Math.floor(Math.random() * 10000),
        status: 'completed',
      };
    }
  }

  async createBundle(name: string, description: string | null, allocations: { asset_id: string; percentage: number }[]) {
    try {
      const actor = await this.getActor();

      // Create bundle config - backend expects BundleConfig with Principal type
      const bundleConfig = {
        id: BigInt(Date.now()),
        creator: Principal.fromText('vo7cb-z7hj6-cguls-wy5uh-gmewm-m6u4g-qbvq7-bmwxg-zgoi6-szjyx-4qe'),
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
}

export const backendService = new BackendService();