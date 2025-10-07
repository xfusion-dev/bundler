import { Controller, Post, Body } from '@nestjs/common';
import { QuoteService } from './quote.service';

@Controller()
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Post('quote')
  async getQuote(@Body() body: { bundleId: number; operation: any; user: string }) {
    return this.quoteService.generateQuote(body.bundleId, body.operation, body.user);
  }

  @Post('execute')
  async execute(@Body() body: { assignmentId: number }) {
    console.log(`[Execute] Received execution request for assignment ${body.assignmentId}`);
    return { success: true, message: 'Execution acknowledged' };
  }
}
