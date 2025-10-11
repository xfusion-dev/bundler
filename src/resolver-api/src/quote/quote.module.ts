import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { QuoteController } from './quote.controller';
import { QuoteService } from './quote.service';
import { PricingService } from '../services/pricing.service';
import { BackendService } from '../services/backend.service';
import { ExecutionService } from '../services/execution.service';
import { Icrc151Service } from '../services/icrc151.service';
import { Icrc2Service } from '../services/icrc2.service';
import { IdentityService } from '../services/identity.service';
import { ApiSecretGuard } from '../guards/api-secret.guard';

@Module({
  imports: [HttpModule],
  controllers: [QuoteController],
  providers: [QuoteService, PricingService, BackendService, ExecutionService, Icrc151Service, Icrc2Service, IdentityService, ApiSecretGuard],
})
export class QuoteModule {}
