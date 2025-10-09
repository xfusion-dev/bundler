import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';

interface AssetConfig {
  asset_id: string;
  symbol: string;
  exchange: string;
  trading_pair: string;
  decimals: number;
  notes?: string;
}

interface ExchangeConfig {
  api_endpoint: string;
  rate_limit_per_minute: number;
  timeout_ms: number;
}

interface PricingConfig {
  assets: AssetConfig[];
  exchanges: Record<string, ExchangeConfig>;
  pricing_settings: {
    spread_bps: number;
    min_profit_bps: number;
    max_slippage_bps: number;
    price_staleness_seconds: number;
  };
}

interface PriceCache {
  price: number;
  timestamp: number;
}

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);
  private config: PricingConfig;
  private priceCache: Map<string, PriceCache> = new Map();

  constructor(private readonly httpService: HttpService) {
    const configPath = path.join(process.cwd(), 'pricing-config.json');
    this.config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    this.logger.log('Pricing service initialized');
  }

  async getPrice(assetId: string): Promise<number> {
    const cached = this.priceCache.get(assetId);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.config.pricing_settings.price_staleness_seconds * 1000) {
      return cached.price;
    }

    const assetConfig = this.config.assets.find(a => a.asset_id === assetId);
    if (!assetConfig) {
      throw new Error(`Asset ${assetId} not found in pricing config`);
    }

    const price = await this.fetchPriceFromExchange(assetConfig);

    this.priceCache.set(assetId, {
      price,
      timestamp: now,
    });

    return price;
  }

  private async fetchPriceFromExchange(asset: AssetConfig): Promise<number> {
    const exchangeConfig = this.config.exchanges[asset.exchange];

    if (!exchangeConfig) {
      throw new Error(`Exchange ${asset.exchange} not configured`);
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(exchangeConfig.api_endpoint, {
          params: {
            category: 'spot',
            symbol: asset.trading_pair,
          },
          timeout: exchangeConfig.timeout_ms,
        })
      );

      const ticker = response.data?.result?.list?.[0];
      if (!ticker || !ticker.lastPrice) {
        throw new Error(`No price data for ${asset.trading_pair}`);
      }

      const price = parseFloat(ticker.lastPrice);
      this.logger.log(`Fetched ${asset.asset_id} price: $${price} (${asset.trading_pair})`);

      return price;
    } catch (error) {
      this.logger.error(`Failed to fetch price for ${asset.asset_id}: ${error.message}`);
      throw error;
    }
  }

  async calculateQuote(
    assetId: string,
    usdAmount: number,
  ): Promise<{ amount: number; price: number; total_usd: number }> {
    const price = await this.getPrice(assetId);
    const assetConfig = this.config.assets.find(a => a.asset_id === assetId);

    if (!assetConfig) {
      throw new Error(`Asset ${assetId} not found`);
    }

    const spreadMultiplier = 1 + (this.config.pricing_settings.spread_bps / 10000);
    const effectivePrice = price * spreadMultiplier;

    const rawAmount = usdAmount / effectivePrice;
    const amount = Math.floor(rawAmount * Math.pow(10, assetConfig.decimals));

    return {
      amount,
      price: effectivePrice,
      total_usd: usdAmount,
    };
  }

  getSpreadBps(): number {
    return this.config.pricing_settings.spread_bps;
  }

  getMinProfitBps(): number {
    return this.config.pricing_settings.min_profit_bps;
  }
}
