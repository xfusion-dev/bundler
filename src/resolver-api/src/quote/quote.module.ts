import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { QuoteController } from './quote.controller';
import { QuoteService } from './quote.service';
import { PricingService } from '../services/pricing.service';
import { BackendService } from '../services/backend.service';

@Module({
  imports: [HttpModule],
  controllers: [QuoteController],
  providers: [QuoteService, PricingService, BackendService],
})
export class QuoteModule {}
