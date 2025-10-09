import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

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

    const backendCanisterId = this.configService.get<string>('BACKEND_CANISTER_ID');
    if (!backendCanisterId) {
      throw new Error('BACKEND_CANISTER_ID not configured in .env');
    }

    this.agent = new HttpAgent({
      host: 'https://ic0.app',
    });

    const idlFactory = ({ IDL }: any) => {
      const AssetId = IDL.Text;
      const AssetAllocation = IDL.Record({
        asset_id: AssetId,
        percentage: IDL.Nat8,
      });
      const BundleConfig = IDL.Record({
        id: IDL.Nat64,
        name: IDL.Text,
        symbol: IDL.Text,
        allocations: IDL.Vec(AssetAllocation),
        platform_fee_bps: IDL.Opt(IDL.Nat64),
        is_active: IDL.Bool,
      });
      const Result = IDL.Variant({
        Ok: BundleConfig,
        Err: IDL.Text,
      });
      return IDL.Service({
        get_bundle: IDL.Func([IDL.Nat64], [Result], ['query']),
      });
    };

    this.actor = Actor.createActor(idlFactory, {
      agent: this.agent,
      canisterId: backendCanisterId,
    });
  }

  async getBundle(bundleId: number) {
    if (this.mockMode) {
      console.log(`[Backend] MOCK: getBundle(${bundleId})`);
      return {
        id: bundleId,
        name: 'Test Bundle',
        symbol: 'TEST',
        allocations: [
          { asset_id: 'BTC', percentage: 60 },
          { asset_id: 'ETH', percentage: 40 },
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
}
