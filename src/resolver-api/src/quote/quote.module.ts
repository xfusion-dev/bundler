import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QuoteController } from './quote.controller';
import { QuoteService } from './quote.service';
import { PricingModule } from '../pricing/pricing.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [ConfigModule, PricingModule, WalletModule],
  controllers: [QuoteController],
  providers: [QuoteService],
})
export class QuoteModule {}