import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MarketDataService } from '../market-data/market-data.service';
import OpenAI from 'openai';
import { BundleResponseDto } from './ai.controller';

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor(
    private configService: ConfigService,
    private marketDataService: MarketDataService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not found in environment variables');
    }
    this.openai = new OpenAI({ apiKey });
  }

  async generateBundle(userPrompt: string): Promise<BundleResponseDto> {
    try {
      const assets = await this.marketDataService.getAssets();
      const systemPrompt = this.configService.get<string>('AI_SYSTEM_PROMPT');

      if (!systemPrompt) {
        throw new Error('AI_SYSTEM_PROMPT not found in environment variables');
      }

      const assetsList = assets
        .map(
          (asset, idx) =>
            `${idx + 1}. ${asset.symbol} (${asset.name}) - Category: ${asset.category}\n` +
            `   - Market Cap: ${asset.market_cap ? `$${(asset.market_cap / 1e9).toFixed(2)}B` : 'N/A'} (Rank #${asset.market_cap_rank || 'N/A'})\n` +
            `   - 24h Volume: ${asset.volume_24h ? `$${(asset.volume_24h / 1e6).toFixed(2)}M` : 'N/A'}\n` +
            `   - 24h Change: ${asset.price_change_24h_percent ? `${asset.price_change_24h_percent.toFixed(2)}%` : 'N/A'}\n` +
            `   - Description: ${asset.description || 'N/A'}`,
        )
        .join('\n\n');

      const fullSystemPrompt = systemPrompt.replace('__ASSETS_LIST__', assetsList);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: fullSystemPrompt },
          { role: 'user', content: userPrompt },
        ],
        functions: [
          {
            name: 'generate_bundle',
            description: 'Generate a crypto bundle allocation based on user requirements',
            parameters: {
              type: 'object',
              properties: {
                valid: {
                  type: 'boolean',
                  description: 'Whether the request is valid and appropriate',
                },
                reason: {
                  type: 'string',
                  description: 'Reason if the request is invalid or inappropriate',
                },
                name: {
                  type: 'string',
                  description: 'Bundle name (required if valid)',
                },
                symbol: {
                  type: 'string',
                  description: 'Bundle symbol, 3-5 uppercase characters (required if valid)',
                },
                description: {
                  type: 'string',
                  description: 'Bundle description explaining the strategy (required if valid)',
                },
                allocations: {
                  type: 'array',
                  description: 'Asset allocations that sum to exactly 100% (required if valid)',
                  items: {
                    type: 'object',
                    properties: {
                      asset_id: {
                        type: 'string',
                        description: 'Asset ID from the provided list',
                      },
                      percentage: {
                        type: 'number',
                        description: 'Allocation percentage (0-100)',
                      },
                    },
                    required: ['asset_id', 'percentage'],
                  },
                },
              },
              required: ['valid'],
            },
          },
        ],
        function_call: { name: 'generate_bundle' },
        temperature: 0.7,
      });

      const functionCall = response.choices[0]?.message?.function_call;
      if (!functionCall || !functionCall.arguments) {
        return {
          valid: false,
          reason: 'Failed to generate bundle. Please try again.',
        };
      }

      const result = JSON.parse(functionCall.arguments);

      if (!result.valid) {
        return {
          valid: false,
          reason: result.reason || 'Request rejected',
        };
      }

      const totalAllocation = result.allocations?.reduce(
        (sum: number, a: any) => sum + a.percentage,
        0,
      );
      if (Math.abs(totalAllocation - 100) > 0.01) {
        return {
          valid: false,
          reason: `Allocations must sum to 100% (got ${totalAllocation}%)`,
        };
      }

      return {
        valid: true,
        name: result.name,
        symbol: result.symbol,
        description: result.description,
        allocations: result.allocations,
      };
    } catch (error) {
      console.error('AI generation failed:', error);
      return {
        valid: false,
        reason: error.message || 'Failed to generate bundle',
      };
    }
  }
}
