import { Controller, Post, Get, Param } from '@nestjs/common';
import { ResolverService } from './resolver.service';

@Controller('resolver')
export class ResolverController {
  constructor(private readonly resolverService: ResolverService) {}

  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('quote/:quoteId/price')
  async getQuotePrice(@Param('quoteId') quoteId: string) {
    return this.resolverService.getQuotePrice(parseInt(quoteId));
  }

  @Post('quote/:quoteId/execute')
  async executeQuote(@Param('quoteId') quoteId: string) {
    return this.resolverService.executeQuote(parseInt(quoteId));
  }

  @Get('prices')
  async getPrices() {
    return this.resolverService.getAssetPrices();
  }

  @Get('wallet')
  async getWalletInfo() {
    return this.resolverService.getResolverWalletInfo();
  }

  @Get('setup-status')
  async getSetupStatus() {
    return this.resolverService.checkSetupStatus();
  }
}