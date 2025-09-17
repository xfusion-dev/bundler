import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

interface ResolverBid {
  resolver: string;
  price: number;
  validUntil: string;
  confidence: number;
}

interface QuoteRequest {
  quoteId: string;
  type: 'buy' | 'sell';
  bundleId: string;
  amount: number;
  userPrincipal: string;
}

@Injectable()
export class ResolverService {
  private readonly logger = new Logger(ResolverService.name);
  private readonly resolvers: string[] = [];

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const primaryResolver = this.configService.get<string>('RESOLVER_API_URL', 'http://localhost:3001');
    this.resolvers.push(primaryResolver);

    const additionalResolvers = this.configService.get<string>('ADDITIONAL_RESOLVERS', '');
    if (additionalResolvers) {
      this.resolvers.push(...additionalResolvers.split(',').map(r => r.trim()));
    }

    this.logger.log(`Initialized with ${this.resolvers.length} resolver(s)`);
  }

  async getBestBid(quoteRequest: QuoteRequest): Promise<ResolverBid> {
    const bids = await this.collectBids(quoteRequest);

    if (bids.length === 0) {
      throw new Error('No resolver bids available');
    }

    const sortedBids = this.sortBids(bids, quoteRequest.type);
    return sortedBids[0];
  }

  private async collectBids(quoteRequest: QuoteRequest): Promise<ResolverBid[]> {
    const bidPromises = this.resolvers.map(resolverUrl =>
      this.queryResolver(resolverUrl, quoteRequest),
    );

    const results = await Promise.allSettled(bidPromises);

    const successfulBids = results
      .filter((result): result is PromiseFulfilledResult<ResolverBid> =>
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.warn(`Resolver ${this.resolvers[index]} failed: ${result.reason}`);
      }
    });

    return successfulBids;
  }

  private async queryResolver(resolverUrl: string, quoteRequest: QuoteRequest): Promise<ResolverBid | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${resolverUrl}/quote/bid`,
          quoteRequest,
          {
            timeout: 5000,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      if (!this.isValidBid(response.data)) {
        this.logger.warn(`Invalid bid from ${resolverUrl}: ${JSON.stringify(response.data)}`);
        return null;
      }

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        this.logger.error(`Failed to query resolver ${resolverUrl}: ${error.message}`);
        if (error.response) {
          this.logger.error(`Response: ${JSON.stringify(error.response.data)}`);
        }
      } else {
        this.logger.error(`Unknown error querying ${resolverUrl}: ${error}`);
      }
      return null;
    }
  }

  private isValidBid(bid: any): bid is ResolverBid {
    return (
      bid &&
      typeof bid.resolver === 'string' &&
      typeof bid.price === 'number' &&
      bid.price > 0 &&
      typeof bid.validUntil === 'string' &&
      new Date(bid.validUntil).getTime() > Date.now()
    );
  }

  private sortBids(bids: ResolverBid[], type: 'buy' | 'sell'): ResolverBid[] {
    return bids.sort((a, b) => {
      if (type === 'buy') {
        return a.price - b.price;
      } else {
        return b.price - a.price;
      }
    });
  }
}