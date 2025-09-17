import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { QuoteController } from './quote.controller';
import { QuoteService } from './quote.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
  ],
  controllers: [QuoteController],
  providers: [QuoteService],
})
export class QuoteModule {}
