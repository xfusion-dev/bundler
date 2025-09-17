import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { QuoteController } from './quote.controller';
import { QuoteService } from './quote.service';
import { ResolverModule } from '../resolver/resolver.module';
import { BackendModule } from '../backend/backend.module';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    ResolverModule,
    BackendModule,
  ],
  controllers: [QuoteController],
  providers: [QuoteService],
})
export class QuoteModule {}
