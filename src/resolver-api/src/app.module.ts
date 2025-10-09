import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { QuoteModule } from './quote/quote.module';
import { HealthController } from './health/health.controller';
import { IdentityService } from './services/identity.service';
import { PricingService } from './services/pricing.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    HttpModule,
    QuoteModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService, IdentityService, PricingService],
  exports: [PricingService],
})
export class AppModule {}
