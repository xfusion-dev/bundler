import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { authService } from './auth';

// ICRC-151 Candid interface
const icrc151IdlFactory = ({ IDL }: any) => {
  const TokenBalance = IDL.Record({
    'token_id': IDL.Vec(IDL.Nat8),
    'balance': IDL.Nat,
  });

  return IDL.Service({
    'get_balances_for': IDL.Func(
      [IDL.Principal, IDL.Opt(IDL.Vec(IDL.Nat8))],
      [IDL.Vec(TokenBalance)],
      ['query']
    ),
  });
};

const ICRC151_LEDGER_CANISTER_ID = 'owhk5-ciaaa-aaaae-qfzlq-cai';

class ICRC151Service {
  private actor: any = null;

  private async getActor() {
    if (this.actor) return this.actor;

    // Use anonymous agent for queries
    const agent = new HttpAgent({
      host: 'https://ic0.app',
    });

    this.actor = Actor.createActor(icrc151IdlFactory, {
      agent,
      canisterId: ICRC151_LEDGER_CANISTER_ID,
    });

    return this.actor;
  }

  async getBalancesFor(principal: Principal): Promise<Array<{ token_id: Uint8Array; balance: bigint }>> {
    try {
      const actor = await this.getActor();
      const balances = await actor.get_balances_for(principal, []);
      console.log('ICRC151 balances:', balances);
      return balances;
    } catch (error) {
      console.error('Failed to get ICRC151 balances:', error);
      return [];
    }
  }

  // Convert token_id (blob) to bundle_id (u64)
  // Token ID is created as bundle_id.to_le_bytes() padded to 32 bytes
  tokenIdToBundleId(tokenId: Uint8Array): number {
    // Read first 8 bytes as little-endian u64
    const view = new DataView(tokenId.buffer, tokenId.byteOffset, 8);
    return Number(view.getBigUint64(0, true)); // true = little-endian
  }
}

export const icrc151Service = new ICRC151Service();
