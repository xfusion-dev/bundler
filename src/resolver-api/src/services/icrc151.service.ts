import { Injectable, Logger } from '@nestjs/common';
import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { IdentityService } from './identity.service';

@Injectable()
export class Icrc151Service {
  private readonly logger = new Logger(Icrc151Service.name);

  constructor(private readonly identityService: IdentityService) {}

  private getIdlFactory() {
    return ({ IDL }: any) => {
      const Account = IDL.Record({
        owner: IDL.Principal,
        subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
      });

      const TransferArgs = IDL.Record({
        to: Account,
        fee: IDL.Opt(IDL.Nat),
        token_id: IDL.Vec(IDL.Nat8),
        memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
        from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
        created_at_time: IDL.Opt(IDL.Nat64),
        amount: IDL.Nat,
      });

      const TransferError = IDL.Variant({
        GenericError: IDL.Record({ message: IDL.Text, error_code: IDL.Nat }),
        TemporarilyUnavailable: IDL.Null,
        BadBurn: IDL.Record({ min_burn_amount: IDL.Nat }),
        Duplicate: IDL.Record({ duplicate_of: IDL.Nat64 }),
        BadFee: IDL.Record({ expected_fee: IDL.Nat }),
        CreatedInFuture: IDL.Record({ ledger_time: IDL.Nat64 }),
        TooOld: IDL.Null,
        InsufficientFunds: IDL.Record({ balance: IDL.Nat }),
      });

      const TransferResult = IDL.Variant({
        Ok: IDL.Nat64,
        Err: TransferError,
      });

      const MintArgs = IDL.Record({
        token_id: IDL.Vec(IDL.Nat8),
        to: Account,
        amount: IDL.Nat,
        memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
      });

      const MintResult = IDL.Variant({
        Ok: IDL.Nat64,
        Err: IDL.Text,
      });

      const ApproveArgs = IDL.Record({
        spender: Account,
        fee: IDL.Opt(IDL.Nat),
        token_id: IDL.Vec(IDL.Nat8),
        memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
        from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
        created_at_time: IDL.Opt(IDL.Nat64),
        amount: IDL.Nat,
        expected_allowance: IDL.Opt(IDL.Nat),
        expires_at: IDL.Opt(IDL.Nat64),
      });

      const ApproveResult = IDL.Variant({
        Ok: IDL.Nat64,
        Err: IDL.Text,
      });

      const TokenMetadata = IDL.Record({
        fee: IDL.Nat,
        decimals: IDL.Nat8,
        logo: IDL.Opt(IDL.Text),
        name: IDL.Text,
        description: IDL.Opt(IDL.Text),
        total_supply: IDL.Nat,
        symbol: IDL.Text,
      });

      const MetadataResult = IDL.Variant({
        Ok: TokenMetadata,
        Err: IDL.Text,
      });

      return IDL.Service({
        mint_tokens: IDL.Func([IDL.Vec(IDL.Nat8), Account, IDL.Nat, IDL.Opt(IDL.Vec(IDL.Nat8))], [MintResult], []),
        icrc151_transfer: IDL.Func([TransferArgs], [TransferResult], []),
        icrc151_approve: IDL.Func([ApproveArgs], [ApproveResult], []),
        get_token_metadata: IDL.Func([IDL.Vec(IDL.Nat8)], [MetadataResult], ['query']),
      });
    };
  }

  private async getActor(ledgerCanisterId: string) {
    const agent = this.identityService.getAgent();
    return Actor.createActor(this.getIdlFactory(), {
      agent,
      canisterId: ledgerCanisterId,
    });
  }

  async mintTokens(
    ledgerCanisterId: string,
    tokenId: Uint8Array,
    to: Principal,
    amount: bigint,
    memo?: string,
  ): Promise<bigint> {
    try {
      const actor = await this.getActor(ledgerCanisterId);

      const memoBytes = memo ? Array.from(new TextEncoder().encode(memo)) : [];

      const result: any = await actor.mint_tokens(
        Array.from(tokenId),
        { owner: to, subaccount: [] },
        amount,
        memoBytes.length > 0 ? [memoBytes] : [],
      );

      if ('Ok' in result) {
        this.logger.log(`Minted ${amount} tokens on ledger ${ledgerCanisterId}, block: ${result.Ok}`);
        return BigInt(result.Ok.toString());
      } else {
        throw new Error(`Mint failed: ${result.Err}`);
      }
    } catch (error) {
      this.logger.error(`Failed to mint tokens: ${error.message}`);
      throw error;
    }
  }

  async transferTokens(
    ledgerCanisterId: string,
    tokenId: Uint8Array,
    to: Principal,
    amount: bigint,
    memo?: string,
  ): Promise<bigint> {
    try {
      const actor = await this.getActor(ledgerCanisterId);

      const memoBytes = memo ? Array.from(new TextEncoder().encode(memo)) : [];

      const transferArgs = {
        to: { owner: to, subaccount: [] },
        fee: [],
        token_id: Array.from(tokenId),
        memo: memoBytes.length > 0 ? [memoBytes] : [],
        from_subaccount: [],
        created_at_time: [],
        amount,
      };

      const result: any = await actor.icrc151_transfer(transferArgs);

      if ('Ok' in result) {
        this.logger.log(`Transferred ${amount} tokens to ${to.toText()}, block: ${result.Ok}`);
        return BigInt(result.Ok.toString());
      } else {
        throw new Error(`Transfer failed: ${JSON.stringify(result.Err)}`);
      }
    } catch (error) {
      this.logger.error(`Failed to transfer tokens: ${error.message}`);
      throw error;
    }
  }

  async approveTokens(
    ledgerCanisterId: string,
    tokenId: Uint8Array,
    spender: Principal,
    amount: bigint,
    memo?: string,
  ): Promise<bigint> {
    try {
      const actor = await this.getActor(ledgerCanisterId);

      const memoBytes = memo ? Array.from(new TextEncoder().encode(memo)) : [];

      const approveArgs = {
        spender: { owner: spender, subaccount: [] },
        fee: [],
        token_id: Array.from(tokenId),
        memo: memoBytes.length > 0 ? [memoBytes] : [],
        from_subaccount: [],
        created_at_time: [],
        amount,
        expected_allowance: [],
        expires_at: [],
      };

      const result: any = await actor.icrc151_approve(approveArgs);

      if ('Ok' in result) {
        this.logger.log(`Approved ${amount} tokens for ${spender.toText()}, block: ${result.Ok}`);
        return BigInt(result.Ok.toString());
      } else {
        throw new Error(`Approval failed: ${JSON.stringify(result.Err)}`);
      }
    } catch (error) {
      this.logger.error(`Failed to approve tokens: ${error.message}`);
      throw error;
    }
  }

  async getTokenMetadata(
    ledgerCanisterId: string,
    tokenId: Uint8Array,
  ): Promise<{ fee: bigint; decimals: number; name: string; symbol: string }> {
    try {
      const actor = await this.getActor(ledgerCanisterId);
      const result: any = await actor.get_token_metadata(Array.from(tokenId));

      if ('Ok' in result) {
        const metadata = result.Ok;
        return {
          fee: BigInt(metadata.fee.toString()),
          decimals: Number(metadata.decimals),
          name: metadata.name,
          symbol: metadata.symbol,
        };
      } else {
        throw new Error(`Failed to get token metadata: ${JSON.stringify(result.Err)}`);
      }
    } catch (error) {
      this.logger.error(`Failed to get token metadata: ${error.message}`);
      throw error;
    }
  }
}
