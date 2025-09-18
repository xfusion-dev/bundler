import { Controller, Post, Body, Get, HttpException, HttpStatus } from '@nestjs/common';
import { QuoteService } from './quote.service';

interface BidRequest {
  quoteId: string;
  type: 'buy' | 'sell';
  bundleId: string;
  amount: number;
  userPrincipal: string;
}

@Controller('quote')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Post('bid')
  async submitBid(@Body() bidRequest: BidRequest) {
    try {
      const bid = await this.quoteService.calculateBid(bidRequest);
      return bid;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to calculate bid',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('health')
  async health() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      resolver: await this.quoteService.getResolverInfo(),
    };
  }

  @Get('wallet')
  async walletStatus() {
    try {
      const status = await this.quoteService.getWalletStatus();
      return status;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get wallet status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}