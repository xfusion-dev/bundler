import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { BackendService } from '../services/backend.service';
import { ResolverService } from '../services/resolver.service';

@Injectable()
export class AssignmentService {
  private readonly logger = new Logger(AssignmentService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly backendService: BackendService,
    private readonly resolverService: ResolverService,
  ) {}

  async executeAssignment(assignmentId: number): Promise<void> {
    this.logger.log(`Received execution request for assignment ${assignmentId}`);

    const assignment = await this.backendService.getAssignment(assignmentId);

    const resolverPrincipal = assignment.resolver.toText();
    this.logger.log(`Assignment ${assignmentId} assigned to resolver: ${resolverPrincipal}`);

    const resolverUrl = await this.getResolverUrl(resolverPrincipal);

    if (!resolverUrl) {
      throw new Error(`No URL configured for resolver ${resolverPrincipal}`);
    }

    const apiSecret = this.configService.get<string>('RESOLVER_API_SECRET');
    if (!apiSecret) {
      throw new Error('RESOLVER_API_SECRET not configured');
    }

    this.logger.log(`Forwarding assignment ${assignmentId} to resolver at ${resolverUrl}`);

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${resolverUrl}/execute`,
          { assignmentId },
          {
            headers: {
              'X-API-Secret': apiSecret,
            },
            timeout: 30000,
          },
        ),
      );

      this.logger.log(`Resolver successfully executed assignment ${assignmentId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to execute assignment ${assignmentId} on resolver: ${error.message}`);
      throw new Error(`Resolver execution failed: ${error.message}`);
    }
  }

  private async getResolverUrl(principalText: string): Promise<string | null> {
    const resolversConfigPath = require('path').resolve(__dirname, '../../resolvers.config.json');

    try {
      const fs = require('fs');
      if (fs.existsSync(resolversConfigPath)) {
        const configData = fs.readFileSync(resolversConfigPath, 'utf-8');
        const config = JSON.parse(configData);
        const resolver = config.resolvers?.find((r: any) => r.principal === principalText);
        return resolver?.url || null;
      }
    } catch (error) {
      this.logger.error(`Failed to read resolver config: ${error.message}`);
    }

    return null;
  }
}
