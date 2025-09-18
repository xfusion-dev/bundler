import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PricingService } from './pricing.service';

@Module({
  imports: [ConfigModule],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}