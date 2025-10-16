import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service';
import { IsString, MinLength } from 'class-validator';

export class GenerateBundleDto {
  @IsString()
  @MinLength(10, { message: 'Prompt must be at least 10 characters long' })
  prompt: string;
}

export class BundleAllocationDto {
  asset_id: string;
  percentage: number;
}

export class BundleResponseDto {
  valid: boolean;
  reason?: string;
  name?: string;
  symbol?: string;
  description?: string;
  allocations?: BundleAllocationDto[];
}

@Controller('api/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-bundle')
  async generateBundle(@Body() dto: GenerateBundleDto): Promise<BundleResponseDto> {
    return this.aiService.generateBundle(dto.prompt);
  }
}
