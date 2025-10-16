import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MarketDataService } from './market-data.service';

@Module({
  imports: [HttpModule],
  providers: [MarketDataService],
  exports: [MarketDataService],
})
export class MarketDataModule {}
