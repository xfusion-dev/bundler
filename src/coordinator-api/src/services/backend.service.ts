import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory } from '../backend-declarations/backend.did.js';

const BACKEND_CANISTER_ID = 'dk3fi-vyaaa-aaaae-qfycq-cai';

@Injectable()
export class BackendService {
  private actor: any;
  private agent: HttpAgent;
  private mockMode: boolean;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.mockMode = this.configService.get<string>('MOCK_BACKEND') === 'true';

    if (this.mockMode) {
      console.log('[Backend] Running in MOCK mode - not connecting to IC');
      return;
    }

    this.agent = new HttpAgent({
      host: 'https://ic0.app',
    });

    this.actor = Actor.createActor(idlFactory, {
      agent: this.agent,
      canisterId: BACKEND_CANISTER_ID,
    });
  }

  async getBundle(bundleId: number) {
    if (this.mockMode) {
      console.log(`[Backend] MOCK: getBundle(${bundleId})`);
      return {
        id: bundleId,
        name: 'Test Bundle',
        symbol: 'TEST',
        creator: '2vxsx-fae',
        allocations: [
          { asset_id: 'ckBTC', percentage: 60 },
          { asset_id: 'ckETH', percentage: 40 },
        ],
        platform_fee_bps: 50,
        is_active: true,
      };
    }

    try {
      const result = await this.actor.get_bundle(bundleId);
      if ('Ok' in result) {
        return result.Ok;
      }
      throw new Error(result.Err || 'Failed to get bundle');
    } catch (error) {
      throw new Error(`Backend call failed: ${error.message}`);
    }
  }

  async getBundleNav(bundleId: number) {
    if (this.mockMode) {
      console.log(`[Backend] MOCK: getBundleNav(${bundleId})`);
      return {
        total_nav_usd: 1000000,
        nav_per_token: 100,
        total_tokens: 10000,
      };
    }

    try {
      const result = await this.actor.calculate_bundle_nav(bundleId);
      if ('Ok' in result) {
        return result.Ok;
      }
      throw new Error(result.Err || 'Failed to calculate NAV');
    } catch (error) {
      throw new Error(`Backend call failed: ${error.message}`);
    }
  }
}
