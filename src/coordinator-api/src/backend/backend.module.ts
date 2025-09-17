import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BackendService } from './backend.service';

@Module({
  imports: [ConfigModule],
  providers: [BackendService],
  exports: [BackendService],
})
export class BackendModule {}