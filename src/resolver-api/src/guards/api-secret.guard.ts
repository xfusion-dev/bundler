import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiSecretGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiSecret = request.headers['x-api-secret'];

    const expectedSecret = this.configService.get<string>('API_SECRET');

    if (!expectedSecret) {
      throw new UnauthorizedException('API_SECRET not configured on resolver');
    }

    if (!apiSecret || apiSecret !== expectedSecret) {
      throw new UnauthorizedException('Invalid or missing API secret');
    }

    return true;
  }
}
