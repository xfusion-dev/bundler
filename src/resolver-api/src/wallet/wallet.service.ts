import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Actor, HttpAgent, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';

interface TokenBalance {
  token: string;
  balance: bigint;
  decimals: number;
  formattedBalance: string;
}

interface ApprovalStatus {
  token: string;
  spender: string;
  allowance: bigint;
  isApproved: boolean;
}

@Injectable()
export class WalletService implements OnModuleInit {
  private readonly logger = new Logger(WalletService.name);
  private identity: Identity;
  private resolverPrincipal: Principal;
  private backendActor: any;
  private tokenActors: Map<string, any> = new Map();
  private readonly network: string;
  private readonly backendCanisterId: string;

  constructor(private readonly configService: ConfigService) {
    this.network = this.configService.get<string>('NETWORK', 'local');
    this.backendCanisterId = this.configService.get<string>(
      'BACKEND_CANISTER_ID',
      'dk3fi-vyaaa-aaaae-qfycq-cai',
    );
  }

  async onModuleInit() {
    try {
      const mnemonic = this.configService.get<string>('RESOLVER_MNEMONIC');
      if (!mnemonic) {
        throw new Error('RESOLVER_MNEMONIC is required for wallet operations');
      }

      this.identity = await Secp256k1KeyIdentity.fromSeedPhrase(mnemonic);
      this.resolverPrincipal = this.identity.getPrincipal();
      this.logger.log(`Wallet initialized for principal: ${this.resolverPrincipal.toString()}`);

      await this.initializeActors();
    } catch (error) {
      this.logger.error(`Failed to initialize wallet: ${error.message}`);
      throw error;
    }
  }

  private async initializeActors() {
    const host = this.network === 'local'
      ? 'http://localhost:4943'
      : 'https://ic0.app';

    const agent = new HttpAgent({
      host,
      identity: this.identity,
    });

    if (this.network === 'local') {
      await agent.fetchRootKey();
    }

    const { idlFactory } = await import('../declarations/backend.did.js');

    this.backendActor = Actor.createActor(idlFactory, {
      agent,
      canisterId: Principal.fromText(this.backendCanisterId),
    });

    await this.initializeTokenActors(agent);
  }

  private async initializeTokenActors(agent: HttpAgent) {
    try {
      const assets = await this.backendActor.get_asset_summary();

      for (const asset of assets) {
        if (asset.ledger_canister) {
          const { idlFactory: tokenIdlFactory } = await import('../declarations/icrc2.did.js');

          const tokenActor = Actor.createActor(tokenIdlFactory, {
            agent,
            canisterId: asset.ledger_canister,
          });

          this.tokenActors.set(asset.id, tokenActor);
          this.logger.log(`Initialized actor for token ${asset.id}`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to initialize token actors: ${error.message}`);
    }
  }

  async getBalances(): Promise<TokenBalance[]> {
    const balances: TokenBalance[] = [];

    for (const [tokenId, actor] of this.tokenActors) {
      try {
        const balance = await actor.icrc1_balance_of({
          owner: this.resolverPrincipal,
          subaccount: [],
        });

        const metadata = await actor.icrc1_metadata();
        const decimals = metadata.find(m => m[0] === 'icrc1:decimals')?.[1]?.Nat || 8;

        balances.push({
          token: tokenId,
          balance,
          decimals,
          formattedBalance: this.formatBalance(balance, decimals),
        });
      } catch (error) {
        this.logger.error(`Failed to get balance for ${tokenId}: ${error.message}`);
      }
    }

    return balances;
  }

  async checkApprovals(): Promise<ApprovalStatus[]> {
    const approvals: ApprovalStatus[] = [];
    const backendPrincipal = Principal.fromText(this.backendCanisterId);

    for (const [tokenId, actor] of this.tokenActors) {
      try {
        const allowance = await actor.icrc2_allowance({
          account: { owner: this.resolverPrincipal, subaccount: [] },
          spender: { owner: backendPrincipal, subaccount: [] },
        });

        approvals.push({
          token: tokenId,
          spender: this.backendCanisterId,
          allowance: allowance.allowance,
          isApproved: allowance.allowance > 0n,
        });
      } catch (error) {
        this.logger.error(`Failed to check approval for ${tokenId}: ${error.message}`);
        approvals.push({
          token: tokenId,
          spender: this.backendCanisterId,
          allowance: 0n,
          isApproved: false,
        });
      }
    }

    return approvals;
  }

  async setApproval(tokenId: string, amount: bigint): Promise<boolean> {
    const actor = this.tokenActors.get(tokenId);
    if (!actor) {
      throw new Error(`Token actor not found for ${tokenId}`);
    }

    try {
      const result = await actor.icrc2_approve({
        spender: {
          owner: Principal.fromText(this.backendCanisterId),
          subaccount: []
        },
        amount,
        fee: [],
        memo: [],
        from_subaccount: [],
        created_at_time: [],
        expected_allowance: [],
        expires_at: [],
      });

      if ('Ok' in result) {
        this.logger.log(`Approval set for ${tokenId}: ${amount.toString()}`);
        return true;
      } else {
        this.logger.error(`Failed to set approval for ${tokenId}: ${JSON.stringify(result.Err)}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Error setting approval for ${tokenId}: ${error.message}`);
      throw error;
    }
  }

  async setupAllApprovals(): Promise<void> {
    const MAX_APPROVAL = BigInt('1000000000000000000');

    for (const tokenId of this.tokenActors.keys()) {
      try {
        await this.setApproval(tokenId, MAX_APPROVAL);
        this.logger.log(`Approval set for ${tokenId}`);
      } catch (error) {
        this.logger.error(`Failed to set approval for ${tokenId}: ${error.message}`);
      }
    }
  }

  getResolverPrincipal(): string {
    return this.resolverPrincipal.toString();
  }

  async getWalletStatus(): Promise<any> {
    const balances = await this.getBalances();
    const approvals = await this.checkApprovals();

    const hasMinimumBalance = balances.some(b =>
      b.token === 'ckusdc' && b.balance > BigInt(100000000)
    );

    const hasAssets = balances.some(b =>
      (b.token === 'ckbtc' || b.token === 'cketh' || b.token === 'gold') &&
      b.balance > 0n
    );

    const allApproved = approvals.every(a => a.isApproved);

    return {
      principal: this.resolverPrincipal.toString(),
      network: this.network,
      balances,
      approvals,
      ready: hasMinimumBalance && hasAssets && allApproved,
      checks: {
        hasMinimumBalance,
        hasAssets,
        allApproved,
      },
    };
  }

  private formatBalance(balance: bigint, decimals: number): string {
    const divisor = BigInt(10 ** decimals);
    const wholePart = balance / divisor;
    const fractionalPart = balance % divisor;

    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    const trimmedFractional = fractionalStr.replace(/0+$/, '');

    if (trimmedFractional === '') {
      return wholePart.toString();
    }

    return `${wholePart}.${trimmedFractional}`;
  }
}