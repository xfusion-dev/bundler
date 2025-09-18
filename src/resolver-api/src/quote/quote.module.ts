import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QuoteController } from './quote.controller';
import { QuoteService } from './quote.service';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [ConfigModule, PricingModule],
  controllers: [QuoteController],
  providers: [QuoteService],
})
export class QuoteModule {}