import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Actor, HttpAgent, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { PricingService } from '../pricing/pricing.service';

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

  constructor(
    private readonly configService: ConfigService,
    private readonly pricingService: PricingService,
  ) {
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
      if (!mnemonic) {
        throw new Error('RESOLVER_MNEMONIC is required - resolver cannot operate without identity');
      }

      this.identity = await Secp256k1KeyIdentity.fromSeedPhrase(mnemonic);
      this.resolverPrincipal = this.identity.getPrincipal().toString();
      this.logger.log(`Resolver principal: ${this.resolverPrincipal}`);

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
      const bundleInfo = await this.getBundleInfo(request.bundleId);

      const basePrice = await this.pricingService.calculateNavPrice(
        request.bundleId,
        request.amount,
        bundleInfo.constituents,
      );

      const adjustedPrice = this.pricingService.calculateSpread(
        request.type,
        basePrice,
        this.feePercentage,
      );

      const gasFees = await this.pricingService.estimateGasFees();
      const finalPrice = Math.round(adjustedPrice + gasFees);

      const confidence = 0.95;

      const validUntil = new Date(Date.now() + 15000);

      const bid: ResolverBid = {
        resolver: this.resolverPrincipal,
        price: finalPrice,
        validUntil: validUntil.toISOString(),
        confidence,
        feePercentage: this.feePercentage,
      };

      this.logger.log(`Bid calculated: ${JSON.stringify(bid)}`);
      return bid;
    } catch (error) {
      this.logger.error(`Failed to calculate bid: ${error.message}`);
      throw error;
    }
  }

  async getBundleInfo(bundleId: string): Promise<any> {
    try {
      const result = await this.backendActor.get_bundle_config(bundleId);

      if ('err' in result) {
        throw new Error(`Bundle ${bundleId} not found: ${result.err}`);
      }

      const bundle = result.ok;
      const constituents = [];

      for (const allocation of bundle.allocations) {
        try {
          const assetResult = await this.backendActor.get_asset(allocation.asset_id);
          if ('ok' in assetResult) {
            const asset = assetResult.ok;
            constituents.push({
              tokenId: allocation.asset_id,
              symbol: asset.symbol,
              allocation: Number(allocation.percentage) * 100,
              oracleTicker: asset.oracle_ticker.length > 0 ? asset.oracle_ticker[0] : asset.symbol,
            });
          }
        } catch (error) {
          this.logger.warn(`Failed to get asset info for ${allocation.asset_id}`);
        }
      }

      const navResult = await this.backendActor.calculate_nav(bundleId);
      if (!('ok' in navResult)) {
        throw new Error(`Failed to calculate NAV for bundle ${bundleId}`);
      }
      const navPerToken = Number(navResult.ok) / 100000000;

      return {
        navPerToken,
        totalSupply: 0,
        constituents,
      };
    } catch (error) {
      this.logger.error(`Failed to get bundle info: ${error.message}`);
      throw new Error(`Cannot retrieve bundle information for ${bundleId}: ${error.message}`);
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