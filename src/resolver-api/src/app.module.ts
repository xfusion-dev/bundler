import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { QuoteModule } from './quote/quote.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [QuoteModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
