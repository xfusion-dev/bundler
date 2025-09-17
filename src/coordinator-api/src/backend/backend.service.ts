import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Actor, HttpAgent, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory } from '../declarations/backend.did.js';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { AnonymousIdentity } from '@dfinity/agent';

@Injectable()
export class BackendService implements OnModuleInit {
  private readonly logger = new Logger(BackendService.name);
  private backendActor: any;
  private identity: Identity;
  private readonly backendCanisterId: string;
  private readonly network: string;

  constructor(private readonly configService: ConfigService) {
    this.backendCanisterId = this.configService.get<string>(
      'BACKEND_CANISTER_ID',
      'dk3fi-vyaaa-aaaae-qfycq-cai',
    );
    this.network = this.configService.get<string>('NETWORK', 'local');
  }

  async onModuleInit() {
    try {
      const mnemonic = this.configService.get<string>('COORDINATOR_MNEMONIC');
      if (mnemonic) {
        this.identity = await Secp256k1KeyIdentity.fromSeedPhrase(mnemonic);
        this.logger.log('Using coordinator identity from mnemonic');
      } else {
        this.identity = new AnonymousIdentity();
        this.logger.log('Using anonymous identity');
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

      this.backendActor = Actor.createActor(idlFactory, {
        agent,
        canisterId: Principal.fromText(this.backendCanisterId),
      });

      this.logger.log(`Backend actor initialized for ${this.network} network`);
    } catch (error) {
      this.logger.error(`Failed to initialize backend actor: ${error.message}`);
      throw error;
    }
  }

  async getQuote(quoteId: string): Promise<any> {
    try {
      const result = await this.backendActor.get_quote(quoteId);

      if (result.length === 0) {
        return null;
      }

      const quote = result[0];
      return this.transformQuote(quote);
    } catch (error) {
      this.logger.error(`Failed to get quote ${quoteId}: ${error.message}`);
      throw error;
    }
  }

  async assignQuote(quoteId: string, resolver: string, price: number, validUntil: Date): Promise<boolean> {
    try {
      const validUntilNanos = BigInt(validUntil.getTime()) * BigInt(1000000);

      const result = await this.backendActor.assign_quote({
        quote_id: quoteId,
        resolver: Principal.fromText(resolver),
        price: BigInt(price),
        valid_until: validUntilNanos,
      });

      if ('ok' in result) {
        this.logger.log(`Quote ${quoteId} assigned successfully`);
        return true;
      } else {
        this.logger.error(`Failed to assign quote ${quoteId}: ${result.err}`);
        throw new Error(result.err);
      }
    } catch (error) {
      this.logger.error(`Failed to assign quote ${quoteId}: ${error.message}`);
      throw error;
    }
  }

  async getBundleInfo(bundleId: string): Promise<any> {
    try {
      const result = await this.backendActor.get_bundle(bundleId);

      if (result.length === 0) {
        return null;
      }

      const bundle = result[0];
      return {
        id: bundle.id,
        name: bundle.name,
        symbol: bundle.symbol,
        description: bundle.description,
        totalSupply: Number(bundle.total_supply),
        navPerToken: Number(bundle.nav_per_token),
        constituents: bundle.constituents.map(c => ({
          tokenId: c.token_id,
          symbol: c.symbol,
          allocation: Number(c.allocation),
          currentPrice: Number(c.current_price),
        })),
      };
    } catch (error) {
      this.logger.error(`Failed to get bundle ${bundleId}: ${error.message}`);
      throw error;
    }
  }

  async getResolverInfo(resolverId: string): Promise<any> {
    try {
      const resolvers = await this.backendActor.get_resolvers();

      const resolver = resolvers.find(r =>
        r.principal.toString() === resolverId
      );

      if (!resolver) {
        return null;
      }

      return {
        principal: resolver.principal.toString(),
        name: resolver.name,
        feePercentage: Number(resolver.fee_percentage),
        totalVolume: Number(resolver.total_volume),
        successRate: Number(resolver.success_rate),
        isActive: resolver.is_active,
      };
    } catch (error) {
      this.logger.error(`Failed to get resolver ${resolverId}: ${error.message}`);
      throw error;
    }
  }

  private transformQuote(quote: any): any {
    return {
      id: quote.id,
      type: quote.quote_type.buy ? 'buy' : 'sell',
      bundleId: quote.bundle_id,
      amount: Number(quote.nav_amount),
      userPrincipal: quote.user.toString(),
      createdAt: new Date(Number(quote.created_at) / 1000000),
      expiresAt: new Date(Number(quote.expires_at) / 1000000),
      status: this.getQuoteStatus(quote),
      assignedResolver: quote.assigned_resolver.length > 0
        ? quote.assigned_resolver[0].toString()
        : null,
      price: quote.price.length > 0 ? Number(quote.price[0]) : null,
      validUntil: quote.valid_until.length > 0
        ? new Date(Number(quote.valid_until[0]) / 1000000)
        : null,
    };
  }

  private getQuoteStatus(quote: any): string {
    if (quote.executed) {
      return 'executed';
    }
    if (quote.assigned_resolver.length > 0) {
      return 'assigned';
    }
    if (new Date(Number(quote.expires_at) / 1000000) < new Date()) {
      return 'expired';
    }
    return 'pending';
  }
}