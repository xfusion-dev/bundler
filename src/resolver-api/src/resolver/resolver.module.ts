import { Module } from '@nestjs/common';
import { ResolverController } from './resolver.controller';
import { ResolverService } from './resolver.service';
import { BackendService } from './backend.service';

@Module({
  controllers: [ResolverController],
  providers: [ResolverService, BackendService],
})
export class ResolverModule {}