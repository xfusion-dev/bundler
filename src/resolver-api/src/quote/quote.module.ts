import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QuoteController } from './quote.controller';
import { QuoteService } from './quote.service';

@Module({
  imports: [ConfigModule],
  controllers: [QuoteController],
  providers: [QuoteService],
})
export class QuoteModule {}