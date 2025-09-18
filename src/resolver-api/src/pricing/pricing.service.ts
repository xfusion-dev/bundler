import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

interface PriceData {
  tokenId: string;
  symbol: string;
  price: number;
  timestamp: Date;
}

interface NavCalculation {
  bundleId: string;
  navPerToken: number;
  totalValue: number;
  constituents: Array<{
    symbol: string;
    allocation: number;
    currentPrice: number;
    value: number;
  }>;
  timestamp: Date;
}

@Injectable()
export class PricingService implements OnModuleInit {
  private readonly logger = new Logger(PricingService.name);
  private priceCache: Map<string, PriceData> = new Map();
  private navCache: Map<string, NavCalculation> = new Map();
  private readonly cacheTtl = 5000;
  private backendActor: any;
  private readonly backendCanisterId: string;
  private readonly network: string;

  constructor(private readonly configService: ConfigService) {
    this.backendCanisterId = this.configService.get<string>(
      'BACKEND_CANISTER_ID',
      'dk3fi-vyaaa-aaaae-qfycq-cai',
    );
    this.network = this.configService.get<string>('NETWORK', 'local');
  }

  async onModuleInit() {
    const host = this.network === 'local'
      ? 'http://localhost:4943'
      : 'https://ic0.app';

    const agent = new HttpAgent({ host });

    if (this.network === 'local') {
      await agent.fetchRootKey();
    }

    const { idlFactory } = await import('../declarations/backend.did.js');

    this.backendActor = Actor.createActor(idlFactory, {
      agent,
      canisterId: Principal.fromText(this.backendCanisterId),
    });

    this.logger.log('Pricing service initialized with backend actor');
  }

  async calculateNavPrice(
    bundleId: string,
    amount: number,
    constituents: any[],
  ): Promise<number> {
    this.logger.log(`Calculating NAV price for ${amount} tokens of ${bundleId}`);

    try {
      const navResult = await this.backendActor.calculate_nav(bundleId);

      if ('ok' in navResult) {
        const navPerToken = Number(navResult.ok) / 100000000;
        this.logger.log(`Backend NAV for ${bundleId}: $${navPerToken} per token`);
        return navPerToken * amount;
      }
    } catch (error) {
      this.logger.warn(`Failed to get backend NAV, calculating manually: ${error.message}`);
    }

    const cachedNav = this.navCache.get(bundleId);
    if (cachedNav && Date.now() - cachedNav.timestamp.getTime() < this.cacheTtl) {
      return cachedNav.navPerToken * amount;
    }

    let totalValue = 0;
    const constituentValues = [];

    for (const constituent of constituents) {
      const price = await this.getTokenPrice(constituent.tokenId || constituent.symbol);
      const value = (constituent.allocation / 10000) * price;
      totalValue += value;

      constituentValues.push({
        symbol: constituent.symbol,
        allocation: constituent.allocation,
        currentPrice: price,
        value,
      });
    }

    const navCalculation: NavCalculation = {
      bundleId,
      navPerToken: totalValue,
      totalValue,
      constituents: constituentValues,
      timestamp: new Date(),
    };

    this.navCache.set(bundleId, navCalculation);
    this.logger.log(`Calculated NAV: $${totalValue.toFixed(2)} per token`);

    return totalValue * amount;
  }

  async getTokenPrice(assetIdOrSymbol: string): Promise<number> {
    const cached = this.priceCache.get(assetIdOrSymbol);
    if (cached && Date.now() - cached.timestamp.getTime() < this.cacheTtl) {
      return cached.price;
    }

    try {
      const oracleTicker = await this.getOracleTicker(assetIdOrSymbol);

      const priceResult = await this.backendActor.get_oracle_price(oracleTicker);

      if (priceResult.length === 0) {
        throw new Error(`No oracle price available for ${oracleTicker}`)
      }

      const price = Number(priceResult[0]) / 100000000;

      this.priceCache.set(assetIdOrSymbol, {
        tokenId: oracleTicker,
        symbol: assetIdOrSymbol,
        price,
        timestamp: new Date(),
      });

      this.logger.log(`Oracle price for ${assetIdOrSymbol} (ticker: ${oracleTicker}): $${price}`);
      return price;
    } catch (error) {
      this.logger.error(`Failed to get oracle price for ${assetIdOrSymbol}: ${error.message}`);
      throw error;
    }
  }

  private async getOracleTicker(assetIdOrSymbol: string): Promise<string> {
    try {
      const assetResult = await this.backendActor.get_asset(assetIdOrSymbol);

      if ('ok' in assetResult) {
        const asset = assetResult.ok;
        if (asset.oracle_ticker && asset.oracle_ticker.length > 0) {
          return asset.oracle_ticker[0];
        }
        return asset.symbol.toLowerCase();
      }
    } catch (error) {
      this.logger.warn(`Failed to get asset info for ${assetIdOrSymbol}: ${error.message}`);
    }

    return assetIdOrSymbol.toLowerCase();
  }

  calculateSpread(type: 'buy' | 'sell', basePrice: number, feePercentage: number): number {
    const feeMultiplier = feePercentage / 10000;

    if (type === 'buy') {
      return basePrice * (1 + feeMultiplier);
    } else {
      return basePrice * (1 - feeMultiplier);
    }
  }

  calculateSlippage(amount: number, liquidity: number): number {
    const impactFactor = amount / liquidity;
    const slippageBps = Math.min(impactFactor * 100, 50);
    return slippageBps;
  }

  async estimateGasFees(): Promise<number> {
    const network = this.configService.get<string>('NETWORK', 'local');
    const baseFee = this.configService.get<number>('BASE_GAS_FEE', 10000);

    if (network === 'local') {
      return baseFee;
    }

    return baseFee * 10;
  }

  calculateConfidence(
    amount: number,
    liquidity: number,
    volatility: number,
  ): number {
    const sizeScore = Math.max(0, 1 - amount / (liquidity * 0.1));
    const volScore = Math.max(0, 1 - volatility / 100);
    const confidence = (sizeScore * 0.7 + volScore * 0.3);

    return Math.min(0.99, Math.max(0.5, confidence));
  }
}