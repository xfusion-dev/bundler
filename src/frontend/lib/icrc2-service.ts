import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { authService } from './auth';

// ICRC-2 Candid interface
const icrc2IdlFactory = ({ IDL }: any) => {
  const Account = IDL.Record({
    'owner': IDL.Principal,
    'subaccount': IDL.Opt(IDL.Vec(IDL.Nat8)),
  });

  const ApproveArgs = IDL.Record({
    'from_subaccount': IDL.Opt(IDL.Vec(IDL.Nat8)),
    'spender': Account,
    'amount': IDL.Nat,
    'expected_allowance': IDL.Opt(IDL.Nat),
    'expires_at': IDL.Opt(IDL.Nat64),
    'fee': IDL.Opt(IDL.Nat),
    'memo': IDL.Opt(IDL.Vec(IDL.Nat8)),
    'created_at_time': IDL.Opt(IDL.Nat64),
  });

  const ApproveResult = IDL.Variant({
    'Ok': IDL.Nat,
    'Err': IDL.Variant({
      'BadFee': IDL.Record({ 'expected_fee': IDL.Nat }),
      'InsufficientFunds': IDL.Record({ 'balance': IDL.Nat }),
      'AllowanceChanged': IDL.Record({ 'current_allowance': IDL.Nat }),
      'Expired': IDL.Record({ 'ledger_time': IDL.Nat64 }),
      'TooOld': IDL.Null,
      'CreatedInFuture': IDL.Record({ 'ledger_time': IDL.Nat64 }),
      'Duplicate': IDL.Record({ 'duplicate_of': IDL.Nat }),
      'TemporarilyUnavailable': IDL.Null,
      'GenericError': IDL.Record({
        'error_code': IDL.Nat,
        'message': IDL.Text
      }),
    }),
  });

  const AllowanceArgs = IDL.Record({
    'account': Account,
    'spender': Account,
  });

  const Allowance = IDL.Record({
    'allowance': IDL.Nat,
    'expires_at': IDL.Opt(IDL.Nat64),
  });

  const TransferArgs = IDL.Record({
    'from_subaccount': IDL.Opt(IDL.Vec(IDL.Nat8)),
    'to': Account,
    'amount': IDL.Nat,
    'fee': IDL.Opt(IDL.Nat),
    'memo': IDL.Opt(IDL.Vec(IDL.Nat8)),
    'created_at_time': IDL.Opt(IDL.Nat64),
  });

  const TransferResult = IDL.Variant({
    'Ok': IDL.Nat,
    'Err': IDL.Variant({
      'BadFee': IDL.Record({ 'expected_fee': IDL.Nat }),
      'BadBurn': IDL.Record({ 'min_burn_amount': IDL.Nat }),
      'InsufficientFunds': IDL.Record({ 'balance': IDL.Nat }),
      'TooOld': IDL.Null,
      'CreatedInFuture': IDL.Record({ 'ledger_time': IDL.Nat64 }),
      'Duplicate': IDL.Record({ 'duplicate_of': IDL.Nat }),
      'TemporarilyUnavailable': IDL.Null,
      'GenericError': IDL.Record({
        'error_code': IDL.Nat,
        'message': IDL.Text
      }),
    }),
  });

  return IDL.Service({
    'icrc2_approve': IDL.Func([ApproveArgs], [ApproveResult], []),
    'icrc2_allowance': IDL.Func([AllowanceArgs], [Allowance], ['query']),
    'icrc1_balance_of': IDL.Func([Account], [IDL.Nat], ['query']),
    'icrc1_transfer': IDL.Func([TransferArgs], [TransferResult], []),
  });
};

const CKUSDC_LEDGER_CANISTER_ID = 'xevnm-gaaaa-aaaar-qafnq-cai';
const BACKEND_CANISTER_ID = 'dk3fi-vyaaa-aaaae-qfycq-cai';

class ICRC2Service {
  private actor: any = null;

  constructor() {
    authService.onAuthChange(() => {
      console.log('[ICRC2Service] Invalidating cached actor');
      this.actor = null;
    });
  }

  private async getActor() {
    if (this.actor) return this.actor;

    const authAgent = await authService.getAgent();
    if (!authAgent) {
      throw new Error('Not authenticated');
    }

    this.actor = Actor.createActor(icrc2IdlFactory, {
      agent: authAgent,
      canisterId: CKUSDC_LEDGER_CANISTER_ID,
    });

    return this.actor;
  }

  async approveSpender(spenderPrincipal: string, amount: bigint): Promise<bigint | null> {
    try {
      const actor = await this.getActor();
      const userPrincipal = await authService.getPrincipal();

      if (!userPrincipal) {
        throw new Error('User not authenticated');
      }

      const spender = Principal.fromText(spenderPrincipal);

      // Create the approval args
      const approveArgs = {
        from_subaccount: [],
        spender: {
          owner: spender,
          subaccount: [],
        },
        amount: amount,
        expected_allowance: [],
        expires_at: [],
        fee: [],
        memo: [],
        created_at_time: [],
      };

      console.log('Approving spender:', spenderPrincipal, 'for amount:', amount.toString());
      const result = await actor.icrc2_approve(approveArgs);

      if ('Ok' in result) {
        console.log('Approval successful, block index:', result.Ok.toString());
        return result.Ok;
      } else {
        console.error('Approval failed:', result.Err);
        throw new Error(`Approval failed: ${JSON.stringify(result.Err)}`);
      }
    } catch (error) {
      console.error('Failed to approve spender:', error);
      throw error;
    }
  }

  async checkAllowance(spenderPrincipal: string): Promise<bigint> {
    try {
      const actor = await this.getActor();
      const userPrincipal = await authService.getPrincipal();

      if (!userPrincipal) {
        throw new Error('User not authenticated');
      }

      const spender = Principal.fromText(spenderPrincipal);

      const allowanceArgs = {
        account: {
          owner: userPrincipal,
          subaccount: [],
        },
        spender: {
          owner: spender,
          subaccount: [],
        },
      };

      console.log('Checking allowance for:');
      console.log('  User:', userPrincipal.toText());
      console.log('  Spender (Backend):', spender.toText());

      const result = await actor.icrc2_allowance(allowanceArgs);
      console.log('Current allowance:', result.allowance.toString());
      return result.allowance;
    } catch (error) {
      console.error('Failed to check allowance:', error);
      return BigInt(0);
    }
  }

  async getBalance(): Promise<bigint> {
    try {
      const actor = await this.getActor();
      const userPrincipal = await authService.getPrincipal();

      if (!userPrincipal) {
        return BigInt(0);
      }

      const account = {
        owner: userPrincipal,
        subaccount: [],
      };

      const balance = await actor.icrc1_balance_of(account);
      console.log('ckUSDC balance:', balance.toString());
      return balance;
    } catch (error) {
      console.error('Failed to get balance:', error);
      return BigInt(0);
    }
  }

  // Approve the backend canister to spend ckUSDC on behalf of the user
  async approveBackendCanister(amount: bigint): Promise<bigint | null> {
    return this.approveSpender(BACKEND_CANISTER_ID, amount);
  }

  // Check if backend canister has sufficient allowance
  async checkBackendAllowance(): Promise<bigint> {
    return this.checkAllowance(BACKEND_CANISTER_ID);
  }

  // Transfer ckUSDC to another principal
  async transfer(recipientPrincipal: string, amount: bigint): Promise<bigint> {
    try {
      const actor = await this.getActor();
      const userPrincipal = await authService.getPrincipal();

      if (!userPrincipal) {
        throw new Error('User not authenticated');
      }

      const recipient = Principal.fromText(recipientPrincipal);

      const transferArgs = {
        from_subaccount: [],
        to: {
          owner: recipient,
          subaccount: [],
        },
        amount: amount,
        fee: [BigInt(10000)],
        memo: [],
        created_at_time: [],
      };

      const result = await actor.icrc1_transfer(transferArgs);

      if ('Ok' in result) {
        return result.Ok;
      } else {

        if ('InsufficientFunds' in result.Err) {
          throw new Error(`Insufficient funds. Balance: ${result.Err.InsufficientFunds.balance.toString()}`);
        } else if ('BadFee' in result.Err) {
          throw new Error(`Bad fee. Expected: ${result.Err.BadFee.expected_fee.toString()}`);
        } else if ('GenericError' in result.Err) {
          throw new Error(`Transfer failed: ${result.Err.GenericError.message}`);
        } else {
          throw new Error(`Transfer failed: ${JSON.stringify(result.Err)}`);
        }
      }
    } catch (error) {
      throw error;
    }
  }

  // Validate principal format
  validatePrincipal(principalText: string): boolean {
    try {
      Principal.fromText(principalText);
      return true;
    } catch {
      return false;
    }
  }
}

export const icrc2Service = new ICRC2Service();