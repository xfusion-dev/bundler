import { Controller, Get } from '@nestjs/common';
import { IdentityService } from '../services/identity.service';

@Controller('health')
export class HealthController {
  constructor(private readonly identityService: IdentityService) {}

  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'resolver-api',
    };
  }

  @Get('info')
  getInfo() {
    return {
      name: 'XFusion Resolver',
      version: '1.0.0',
      principal: this.identityService.getPrincipalText(),
    };
  }
}
