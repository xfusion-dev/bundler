import { Injectable } from '@nestjs/common';
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory } from '../backend-declarations/backend.did.js';

const BACKEND_CANISTER_ID = 'dk3fi-vyaaa-aaaae-qfycq-cai';

@Injectable()
export class BackendService {
  private actor: any;
  private agent: HttpAgent;

  async onModuleInit() {
    this.agent = new HttpAgent({
      host: 'https://ic0.app',
    });

    this.actor = Actor.createActor(idlFactory, {
      agent: this.agent,
      canisterId: BACKEND_CANISTER_ID,
    });
  }

  async getBundle(bundleId: number) {
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
