import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Actor, HttpAgent, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { AnonymousIdentity } from '@dfinity/agent';

interface BidRequest {
  quoteId: string;
  type: 'buy' | 'sell';
  bundleId: string;
  amount: number;
  userPrincipal: string;
}

interface ResolverBid {
  resolver: string;
  price: number;
  validUntil: string;
  confidence: number;
  feePercentage: number;
}

@Injectable()
export class QuoteService implements OnModuleInit {
  private readonly logger = new Logger(QuoteService.name);
  private backendActor: any;
  private identity: Identity;
  private resolverPrincipal: string;
  private readonly network: string;
  private readonly backendCanisterId: string;
  private readonly feePercentage: number;

  constructor(private readonly configService: ConfigService) {
    this.network = this.configService.get<string>('NETWORK', 'local');
    this.backendCanisterId = this.configService.get<string>(
      'BACKEND_CANISTER_ID',
      'dk3fi-vyaaa-aaaae-qfycq-cai',
    );
    this.feePercentage = this.configService.get<number>('RESOLVER_FEE_PERCENTAGE', 30);
  }

  async onModuleInit() {
    try {
      const mnemonic = this.configService.get<string>('RESOLVER_MNEMONIC');
      if (mnemonic) {
        this.identity = await Secp256k1KeyIdentity.fromSeedPhrase(mnemonic);
        this.resolverPrincipal = this.identity.getPrincipal().toString();
        this.logger.log(`Resolver principal: ${this.resolverPrincipal}`);
      } else {
        this.identity = new AnonymousIdentity();
        this.resolverPrincipal = 'anonymous';
        this.logger.warn('Using anonymous identity - resolver functionality limited');
      }

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

      this.logger.log(`Resolver initialized for ${this.network} network`);
    } catch (error) {
      this.logger.error(`Failed to initialize resolver: ${error.message}`);
      throw error;
    }
  }

  async calculateBid(request: BidRequest): Promise<ResolverBid> {
    this.logger.log(`Calculating bid for quote ${request.quoteId}`);

    try {
      const navInfo = await this.getNavInfo(request.bundleId);

      const basePrice = request.amount * navInfo.navPerToken;

      let adjustedPrice: number;
      if (request.type === 'buy') {
        adjustedPrice = basePrice * (1 + this.feePercentage / 10000);
      } else {
        adjustedPrice = basePrice * (1 - this.feePercentage / 10000);
      }

      adjustedPrice = Math.round(adjustedPrice);

      const validUntil = new Date(Date.now() + 15000);

      const bid: ResolverBid = {
        resolver: this.resolverPrincipal,
        price: adjustedPrice,
        validUntil: validUntil.toISOString(),
        confidence: 0.98,
        feePercentage: this.feePercentage,
      };

      this.logger.log(`Bid calculated: ${JSON.stringify(bid)}`);
      return bid;
    } catch (error) {
      this.logger.error(`Failed to calculate bid: ${error.message}`);
      throw error;
    }
  }

  async getNavInfo(bundleId: string): Promise<any> {
    try {
      const result = await this.backendActor.get_bundle(bundleId);

      if (result.length === 0) {
        throw new Error(`Bundle ${bundleId} not found`);
      }

      const bundle = result[0];
      return {
        navPerToken: Number(bundle.nav_per_token) / 100000000,
        totalSupply: Number(bundle.total_supply),
      };
    } catch (error) {
      this.logger.error(`Failed to get NAV info: ${error.message}`);
      return {
        navPerToken: 100,
        totalSupply: 0,
      };
    }
  }

  async getResolverInfo() {
    return {
      principal: this.resolverPrincipal,
      network: this.network,
      feePercentage: this.feePercentage,
      active: true,
    };
  }

  async getWalletStatus() {
    try {
      const balances = await this.checkBalances();
      const approvals = await this.checkApprovals();

      return {
        principal: this.resolverPrincipal,
        balances,
        approvals,
        ready: this.isResolverReady(balances, approvals),
      };
    } catch (error) {
      this.logger.error(`Failed to get wallet status: ${error.message}`);
      throw error;
    }
  }

  private async checkBalances(): Promise<any> {
    const balances: any = {};

    try {
      const ckusdcBalance = await this.backendActor.get_token_balance(
        this.identity.getPrincipal(),
        'ckusdc',
      );
      balances.ckusdc = Number(ckusdcBalance);

      const ckbtcBalance = await this.backendActor.get_token_balance(
        this.identity.getPrincipal(),
        'ckbtc',
      );
      balances.ckbtc = Number(ckbtcBalance);

      const ckethBalance = await this.backendActor.get_token_balance(
        this.identity.getPrincipal(),
        'cketh',
      );
      balances.cketh = Number(ckethBalance);
    } catch (error) {
      this.logger.warn(`Failed to check some balances: ${error.message}`);
    }

    return balances;
  }

  private async checkApprovals(): Promise<any> {
    return {
      ckusdc: true,
      ckbtc: true,
      cketh: true,
    };
  }

  private isResolverReady(balances: any, approvals: any): boolean {
    const hasMinimumCkusdc = balances.ckusdc && balances.ckusdc > 100000000;
    const hasMinimumAssets = balances.ckbtc > 0 || balances.cketh > 0;
    const hasApprovals = approvals.ckusdc && approvals.ckbtc && approvals.cketh;

    return hasMinimumCkusdc && hasMinimumAssets && hasApprovals;
  }
}