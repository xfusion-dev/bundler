import { Controller, Post, Param, Body, Get, HttpException, HttpStatus } from '@nestjs/common';
import { QuoteService } from './quote.service';

@Controller('quote')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Post('process/:id')
  async processQuote(@Param('id') quoteId: string) {
    try {
      const result = await this.quoteService.processQuote(quoteId);
      return {
        success: true,
        quoteId,
        resolver: result.resolver,
        price: result.price,
        validUntil: result.validUntil,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to process quote',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':id/status')
  async getQuoteStatus(@Param('id') quoteId: string) {
    try {
      const status = await this.quoteService.getQuoteStatus(quoteId);
      return {
        success: true,
        quoteId,
        ...status,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get quote status',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
