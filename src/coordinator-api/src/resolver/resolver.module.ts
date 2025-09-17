import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ResolverService } from './resolver.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [ResolverService],
  exports: [ResolverService],
})
export class ResolverModule {}