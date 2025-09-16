import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ResolverModule } from './resolver/resolver.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ResolverModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
