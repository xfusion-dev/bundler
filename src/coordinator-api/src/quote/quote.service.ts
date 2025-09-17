import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResolverService } from '../resolver/resolver.service';
import { BackendService } from '../backend/backend.service';

@Injectable()
export class QuoteService {
  private readonly logger = new Logger(QuoteService.name);
  private quoteCache = new Map<string, any>();

  constructor(
    private readonly configService: ConfigService,
    private readonly resolverService: ResolverService,
    private readonly backendService: BackendService,
  ) {
    this.logger.log('Quote service initialized');
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
      status: quote.status || 'pending',
      quote,
    };
  }

  private async fetchQuoteFromBackend(quoteId: string): Promise<any> {
    this.logger.log(`Fetching quote ${quoteId} from backend`);

    try {
      const quote = await this.backendService.getQuote(quoteId);

      if (!quote) {
        throw new Error(`Quote ${quoteId} not found`);
      }

      return quote;
    } catch (error) {
      this.logger.error(`Failed to fetch quote from backend: ${error.message}`);
      throw error;
    }
  }

  private async queryResolverForBid(quoteDetails: any): Promise<any> {
    this.logger.log(`Querying resolver for bid on quote ${quoteDetails.id}`);

    try {
      const bid = await this.resolverService.getBestBid({
        quoteId: quoteDetails.id,
        type: quoteDetails.type as 'buy' | 'sell',
        bundleId: quoteDetails.bundleId,
        amount: quoteDetails.amount,
        userPrincipal: quoteDetails.userPrincipal,
      });

      return bid;
    } catch (error) {
      this.logger.error(`Failed to get resolver bid: ${error.message}`);
      throw new Error(`Resolver unavailable: ${error.message}`);
    }
  }

  private async assignQuoteToBackend(quoteId: string, resolverBid: any): Promise<any> {
    this.logger.log(`Assigning quote ${quoteId} to backend with resolver bid`);

    try {
      const success = await this.backendService.assignQuote(
        quoteId,
        resolverBid.resolver,
        resolverBid.price,
        new Date(resolverBid.validUntil),
      );

      if (!success) {
        throw new Error('Failed to assign quote');
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
