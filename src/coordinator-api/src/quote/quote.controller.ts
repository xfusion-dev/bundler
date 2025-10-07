import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { QuoteService } from './quote.service';

@Controller('quote')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Post('get')
  async getQuote(@Body() body: { bundleId: number; operation: any; user: string }) {
    try {
      const { bundleId, operation, user } = body;

      if (!bundleId || !operation || !user) {
        throw new HttpException('Missing required fields', HttpStatus.BAD_REQUEST);
      }

      const quote = await this.quoteService.getQuote(bundleId, operation, user);
      return quote;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get quote',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('accepted')
  async notifyAccepted(@Body() body: { assignmentId: number; resolverPrincipal: string }) {
    return { success: true };
  }
}
