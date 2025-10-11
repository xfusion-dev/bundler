import { Injectable, Logger } from '@nestjs/common';
import { Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { IdentityService } from './identity.service';

@Injectable()
export class Icrc2Service {
  private readonly logger = new Logger(Icrc2Service.name);
  private readonly CKUSDC_LEDGER = 'xevnm-gaaaa-aaaar-qafnq-cai';

  constructor(private readonly identityService: IdentityService) {}

  private getIdlFactory() {
    return ({ IDL }: any) => {
      const Account = IDL.Record({
        owner: IDL.Principal,
        subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
      });

      const ApproveArgs = IDL.Record({
        from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
        spender: Account,
        amount: IDL.Nat,
        expected_allowance: IDL.Opt(IDL.Nat),
        expires_at: IDL.Opt(IDL.Nat64),
        fee: IDL.Opt(IDL.Nat),
        memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
        created_at_time: IDL.Opt(IDL.Nat64),
      });

      const ApproveError = IDL.Variant({
        BadFee: IDL.Record({ expected_fee: IDL.Nat }),
        InsufficientFunds: IDL.Record({ balance: IDL.Nat }),
        AllowanceChanged: IDL.Record({ current_allowance: IDL.Nat }),
        Expired: IDL.Record({ ledger_time: IDL.Nat64 }),
        TooOld: IDL.Null,
        CreatedInFuture: IDL.Record({ ledger_time: IDL.Nat64 }),
        Duplicate: IDL.Record({ duplicate_of: IDL.Nat }),
        TemporarilyUnavailable: IDL.Null,
        GenericError: IDL.Record({ error_code: IDL.Nat, message: IDL.Text }),
      });

      const ApproveResult = IDL.Variant({
        Ok: IDL.Nat,
        Err: ApproveError,
      });

      const AllowanceArgs = IDL.Record({
        account: Account,
        spender: Account,
      });

      const Allowance = IDL.Record({
        allowance: IDL.Nat,
        expires_at: IDL.Opt(IDL.Nat64),
      });

      const TransferArgs = IDL.Record({
        to: Account,
        fee: IDL.Opt(IDL.Nat),
        memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
        from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
        created_at_time: IDL.Opt(IDL.Nat64),
        amount: IDL.Nat,
      });

      const TransferError = IDL.Variant({
        BadFee: IDL.Record({ expected_fee: IDL.Nat }),
        BadBurn: IDL.Record({ min_burn_amount: IDL.Nat }),
        InsufficientFunds: IDL.Record({ balance: IDL.Nat }),
        TooOld: IDL.Null,
        CreatedInFuture: IDL.Record({ ledger_time: IDL.Nat64 }),
        Duplicate: IDL.Record({ duplicate_of: IDL.Nat }),
        TemporarilyUnavailable: IDL.Null,
        GenericError: IDL.Record({ error_code: IDL.Nat, message: IDL.Text }),
      });

      const TransferResult = IDL.Variant({
        Ok: IDL.Nat,
        Err: TransferError,
      });

      return IDL.Service({
        icrc2_approve: IDL.Func([ApproveArgs], [ApproveResult], []),
        icrc2_allowance: IDL.Func([AllowanceArgs], [Allowance], ['query']),
        icrc1_transfer: IDL.Func([TransferArgs], [TransferResult], []),
        icrc1_balance_of: IDL.Func([Account], [IDL.Nat], ['query']),
      });
    };
  }

  private async getActor(ledgerCanisterId: string = this.CKUSDC_LEDGER) {
    const agent = this.identityService.getAgent();
    return Actor.createActor(this.getIdlFactory(), {
      agent,
      canisterId: ledgerCanisterId,
    });
  }

  async approveSpender(
    spender: Principal,
    amount: bigint,
    memo?: string,
  ): Promise<bigint> {
    try {
      const actor = await this.getActor();

      const memoBytes = memo ? Array.from(new TextEncoder().encode(memo)) : [];

      const approveArgs = {
        from_subaccount: [],
        spender: { owner: spender, subaccount: [] },
        amount,
        expected_allowance: [],
        expires_at: [],
        fee: [],
        memo: memoBytes.length > 0 ? [memoBytes] : [],
        created_at_time: [],
      };

      const result: any = await actor.icrc2_approve(approveArgs);

      if ('Ok' in result) {
        this.logger.log(`Approved ${amount} ckUSDC for ${spender.toText()}, block: ${result.Ok}`);
        return BigInt(result.Ok.toString());
      } else {
        throw new Error(`Approval failed: ${JSON.stringify(result.Err)}`);
      }
    } catch (error) {
      this.logger.error(`Failed to approve ckUSDC: ${error.message}`);
      throw error;
    }
  }

  async getAllowance(owner: Principal, spender: Principal): Promise<bigint> {
    try {
      const actor = await this.getActor();

      const result: any = await actor.icrc2_allowance({
        account: { owner, subaccount: [] },
        spender: { owner: spender, subaccount: [] },
      });

      return BigInt(result.allowance.toString());
    } catch (error) {
      this.logger.error(`Failed to get allowance: ${error.message}`);
      throw error;
    }
  }

  async getBalance(account: Principal): Promise<bigint> {
    try {
      const actor = await this.getActor();

      const result: any = await actor.icrc1_balance_of({
        owner: account,
        subaccount: [],
      });

      return BigInt(result.toString());
    } catch (error) {
      this.logger.error(`Failed to get balance: ${error.message}`);
      throw error;
    }
  }

  async transfer(
    to: Principal,
    amount: bigint,
    memo?: string,
  ): Promise<bigint> {
    try {
      const actor = await this.getActor();

      const memoBytes = memo ? Array.from(new TextEncoder().encode(memo)) : [];

      const transferArgs = {
        to: { owner: to, subaccount: [] },
        fee: [],
        memo: memoBytes.length > 0 ? [memoBytes] : [],
        from_subaccount: [],
        created_at_time: [],
        amount,
      };

      const result: any = await actor.icrc1_transfer(transferArgs);

      if ('Ok' in result) {
        this.logger.log(`Transferred ${amount} ckUSDC to ${to.toText()}, block: ${result.Ok}`);
        return BigInt(result.Ok.toString());
      } else {
        throw new Error(`Transfer failed: ${JSON.stringify(result.Err)}`);
      }
    } catch (error) {
      this.logger.error(`Failed to transfer ckUSDC: ${error.message}`);
      throw error;
    }
  }
}
