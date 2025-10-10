import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { IdentityService } from './identity.service';

@Injectable()
export class BackendService {
  constructor(
    private configService: ConfigService,
    private identityService: IdentityService,
  ) {}

  private getIdlFactory() {
    return ({ IDL }: any) => {
      const TokenLocation = IDL.Variant({
        'ICRC151': IDL.Record({ ledger: IDL.Principal, token_id: IDL.Vec(IDL.Nat8) }),
        'ICRC2': IDL.Record({ ledger: IDL.Principal }),
      });
      const AssetAllocation = IDL.Record({
        asset_id: IDL.Text,
        token_location: TokenLocation,
        percentage: IDL.Nat8,
      });
      const BundleConfig = IDL.Record({
        id: IDL.Nat64,
        creator: IDL.Principal,
        name: IDL.Text,
        description: IDL.Opt(IDL.Text),
        created_at: IDL.Nat64,
        platform_fee_bps: IDL.Opt(IDL.Nat64),
        token_location: TokenLocation,
        allocations: IDL.Vec(AssetAllocation),
        is_active: IDL.Bool,
        symbol: IDL.Text,
      });
      const AssetAmount = IDL.Record({
        asset_id: IDL.Text,
        amount: IDL.Nat64,
      });
      const AssetValue = IDL.Record({
        asset_id: IDL.Text,
        amount: IDL.Nat64,
        value_usd: IDL.Nat64,
        percentage: IDL.Float64,
      });
      const BundleNAV = IDL.Record({
        bundle_id: IDL.Nat64,
        nav_per_token: IDL.Nat64,
        total_nav_usd: IDL.Nat64,
        total_tokens: IDL.Nat64,
        asset_values: IDL.Vec(AssetValue),
        calculated_at: IDL.Nat64,
      });
      const QuoteAssignment = IDL.Record({
        request_id: IDL.Nat64,
        resolver: IDL.Principal,
        asset_amounts: IDL.Vec(AssetAmount),
        fees: IDL.Nat64,
        ckusdc_amount: IDL.Nat64,
        assigned_at: IDL.Nat64,
        valid_until: IDL.Nat64,
        estimated_nav: IDL.Nat64,
        nav_tokens: IDL.Nat64,
      });
      const TransactionStatus = IDL.Variant({
        'Failed': IDL.Null,
        'FundsLocked': IDL.Null,
        'WaitingForResolver': IDL.Null,
        'TimedOut': IDL.Null,
        'InProgress': IDL.Null,
        'AssetsTransferred': IDL.Null,
        'Completed': IDL.Null,
        'Pending': IDL.Null,
      });
      const OperationType = IDL.Variant({
        'Buy': IDL.Record({ ckusdc_amount: IDL.Nat64 }),
        'Sell': IDL.Record({ nav_tokens: IDL.Nat64 }),
        'InitialBuy': IDL.Record({ usd_amount: IDL.Nat64, nav_tokens: IDL.Nat64 }),
      });
      const Transaction = IDL.Record({
        id: IDL.Nat64,
        request_id: IDL.Nat64,
        status: TransactionStatus,
        resolver: IDL.Principal,
        updated_at: IDL.Nat64,
        bundle_id: IDL.Nat64,
        user: IDL.Principal,
        created_at: IDL.Nat64,
        timeout_at: IDL.Nat64,
        ckusdc_amount: IDL.Nat64,
        operation: OperationType,
        completed_at: IDL.Opt(IDL.Nat64),
        nav_tokens: IDL.Nat64,
      });
      const ConfirmResult = IDL.Variant({
        Ok: IDL.Null,
        Err: IDL.Text,
      });

      return IDL.Service({
        get_bundle: IDL.Func([IDL.Nat64], [IDL.Variant({ Ok: BundleConfig, Err: IDL.Text })], ['query']),
        get_assignment: IDL.Func([IDL.Nat64], [IDL.Variant({ Ok: QuoteAssignment, Err: IDL.Text })], ['query']),
        get_transaction: IDL.Func([IDL.Nat64], [IDL.Variant({ Ok: Transaction, Err: IDL.Text })], ['query']),
        calculate_bundle_nav: IDL.Func([IDL.Nat64], [IDL.Variant({ Ok: BundleNAV, Err: IDL.Text })], []),
        confirm_asset_deposit: IDL.Func([IDL.Nat64], [ConfirmResult], []),
      });
    };
  }

  private createActor() {
    const agent = this.identityService.getAgent();
    const backendCanisterId = this.configService.get<string>('BACKEND_CANISTER_ID')!;

    return Actor.createActor(this.getIdlFactory(), {
      agent,
      canisterId: backendCanisterId,
    });
  }

  async getBundle(bundleId: number) {
    try {
      const actor = this.createActor();
      const result: any = await actor.get_bundle(bundleId);
      if ('Ok' in result) {
        return result.Ok;
      }
      throw new Error(result.Err || 'Failed to get bundle');
    } catch (error: any) {
      throw new Error(`Backend call failed: ${error.message}`);
    }
  }

  async getAssignment(assignmentId: number) {
    try {
      const actor = this.createActor();
      const result: any = await actor.get_assignment(assignmentId);
      if ('Ok' in result) {
        return result.Ok;
      }
      throw new Error(result.Err || 'Failed to get assignment');
    } catch (error: any) {
      throw new Error(`Backend call failed: ${error.message}`);
    }
  }

  async getTransaction(transactionId: number) {
    try {
      const actor = this.createActor();
      const result: any = await actor.get_transaction(transactionId);
      if ('Ok' in result) {
        return result.Ok;
      }
      throw new Error(result.Err || 'Failed to get transaction');
    } catch (error: any) {
      throw new Error(`Backend call failed: ${error.message}`);
    }
  }

  async calculateBundleNav(bundleId: number) {
    try {
      const actor = this.createActor();
      const result: any = await actor.calculate_bundle_nav(bundleId);
      if ('Ok' in result) {
        return result.Ok;
      }
      throw new Error(result.Err || 'Failed to calculate bundle NAV');
    } catch (error: any) {
      throw new Error(`Backend call failed: ${error.message}`);
    }
  }

  async confirmAssetDeposit(requestId: number): Promise<void> {
    try {
      const actor = this.createActor();
      const result: any = await actor.confirm_asset_deposit(requestId);
      if ('Ok' in result) {
        console.log(`[Backend] Successfully confirmed asset deposit for request ${requestId}`);
        return;
      }
      throw new Error(result.Err || 'Failed to confirm asset deposit');
    } catch (error: any) {
      throw new Error(`Backend call failed: ${error.message}`);
    }
  }

}
