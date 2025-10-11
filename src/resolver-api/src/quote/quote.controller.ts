import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { QuoteService } from './quote.service';
import { ExecutionService } from '../services/execution.service';
import { PricingService } from '../services/pricing.service';
import { ApiSecretGuard } from '../guards/api-secret.guard';

@Controller()
export class QuoteController {
  constructor(
    private readonly quoteService: QuoteService,
    private readonly executionService: ExecutionService,
    private readonly pricingService: PricingService,
  ) {}

  @Post('quote')
  async getQuote(@Body() body: { bundleId: number; operation: any; user: string }) {
    return await this.quoteService.generateQuote(body.bundleId, body.operation, body.user);
  }

  @Post('execute')
  @UseGuards(ApiSecretGuard)
  async execute(@Body() body: { assignmentId: number }) {
    console.log(`[Execute] Received execution request for assignment ${body.assignmentId}`);

    try {
      await this.executionService.executeAssignment(body.assignmentId);
      return { success: true, message: 'Assignment executed successfully' };
    } catch (error) {
      console.error(`[Execute] Failed:`, error);
      return { success: false, error: error?.message || String(error) };
    }
  }

  @Get('prices')
  async getPrices() {
    const assets = ['AAPLX', 'BCH', 'BTC', 'ETH', 'GLDT', 'GOOGLX', 'ICP', 'LTC', 'MATIC', 'METAX', 'SOL', 'SPYX', 'TSLAX', 'XRP'];
    const prices = {};

    for (const asset of assets) {
      try {
        const price = await this.pricingService.getPrice(asset);
        prices[asset] = { price, status: 'ok' };
      } catch (error) {
        prices[asset] = { error: error?.message || String(error), status: 'error' };
      }
    }

    return prices;
  }
}
