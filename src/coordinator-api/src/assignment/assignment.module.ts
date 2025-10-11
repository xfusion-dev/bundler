import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AssignmentController } from './assignment.controller';
import { AssignmentService } from './assignment.service';
import { BackendService } from '../services/backend.service';
import { ResolverService } from '../services/resolver.service';

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [AssignmentController],
  providers: [AssignmentService, BackendService, ResolverService],
})
export class AssignmentModule {}
