import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { firstValueFrom } from 'rxjs';
import { idlFactory } from '../declarations/backend/backend.did.js';

@Injectable()
export class QuoteService implements OnModuleInit {
  private readonly logger = new Logger(QuoteService.name);
  private backendActor: any;
  private readonly resolverApiUrl: string;
  private readonly backendCanisterId: string;
  private quoteCache = new Map<string, any>();

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.resolverApiUrl = this.configService.get<string>('RESOLVER_API_URL', 'http://localhost:3001');
    this.backendCanisterId = this.configService.get<string>('BACKEND_CANISTER_ID', 'dk3fi-vyaaa-aaaae-qfycq-cai');
    this.logger.log(`Initialized with resolver API at ${this.resolverApiUrl}`);
  }

  async onModuleInit() {
    const agent = new HttpAgent({ host: 'http://localhost:4943' });
    await agent.fetchRootKey();

    this.backendActor = Actor.createActor(idlFactory, {
      agent,
      canisterId: Principal.fromText(this.backendCanisterId),
    });

    this.logger.log('Backend actor initialized');
  }

  async processQuote(quoteId: string): Promise<any> {
    this.logger.log(`Processing quote ${quoteId}`);

    const quoteDetails = await this.fetchQuoteFromBackend(quoteId);
    const resolverBid = await this.queryResolverForBid(quoteDetails);
    const assignment = await this.assignQuoteToBackend(quoteId, resolverBid);

    this.quoteCache.set(quoteId, {
      ...assignment,
      processedAt: new Date().toISOString(),
    });

    return assignment;
  }

  async getQuoteStatus(quoteId: string): Promise<any> {
    if (this.quoteCache.has(quoteId)) {
      return this.quoteCache.get(quoteId);
    }

    const quote = await this.fetchQuoteFromBackend(quoteId);
    return {
      status: quote.assigned ? 'assigned' : 'pending',
      quote,
    };
  }

  private async fetchQuoteFromBackend(quoteId: string): Promise<any> {
    this.logger.log(`Fetching quote ${quoteId} from backend`);

    try {
      const result = await this.backendActor.get_quote(quoteId);

      if (result.length === 0) {
        throw new Error(`Quote ${quoteId} not found`);
      }

      const quote = result[0];
      return {
        id: quote.id,
        type: quote.quote_type.buy ? 'buy' : 'sell',
        bundleId: quote.bundle_id,
        amount: Number(quote.nav_amount),
        userPrincipal: quote.user.toString(),
        createdAt: new Date(Number(quote.created_at) / 1000000).toISOString(),
        assigned: quote.assigned_resolver.length > 0,
        resolver: quote.assigned_resolver.length > 0 ? quote.assigned_resolver[0].toString() : null,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch quote from backend: ${error.message}`);
      throw error;
    }
  }

  private async queryResolverForBid(quoteDetails: any): Promise<any> {
    this.logger.log(`Querying resolver for bid on quote ${quoteDetails.id}`);

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.resolverApiUrl}/quote/bid`, {
          quoteId: quoteDetails.id,
          type: quoteDetails.type,
          bundleId: quoteDetails.bundleId,
          amount: quoteDetails.amount,
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get resolver bid: ${error.message}`);
      throw new Error(`Resolver unavailable: ${error.message}`);
    }
  }

  private async assignQuoteToBackend(quoteId: string, resolverBid: any): Promise<any> {
    this.logger.log(`Assigning quote ${quoteId} to backend with resolver bid`);

    try {
      const validUntilNanos = new Date(resolverBid.validUntil).getTime() * 1000000;

      const result = await this.backendActor.assign_quote({
        quote_id: quoteId,
        resolver: Principal.fromText(resolverBid.resolver),
        price: BigInt(resolverBid.price),
        valid_until: BigInt(validUntilNanos),
      });

      if ('err' in result) {
        throw new Error(result.err);
      }

      return {
        quoteId,
        resolver: resolverBid.resolver,
        price: resolverBid.price,
        validUntil: resolverBid.validUntil,
        assigned: true,
      };
    } catch (error) {
      this.logger.error(`Failed to assign quote to backend: ${error.message}`);
      throw error;
    }
  }
}
