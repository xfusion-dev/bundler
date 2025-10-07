import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { QuoteController } from './quote.controller';
import { QuoteService } from './quote.service';
import { BackendService } from '../services/backend.service';
import { ResolverService } from '../services/resolver.service';
import { SelectorService } from '../services/selector.service';
import { SignerService } from '../services/signer.service';

@Module({
  imports: [HttpModule],
  controllers: [QuoteController],
  providers: [
    QuoteService,
    BackendService,
    ResolverService,
    SelectorService,
    SignerService,
  ],
})
export class QuoteModule {}
