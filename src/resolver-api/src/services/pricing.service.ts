import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { ConfigService } from '@nestjs/config';

const ORACLE_CANISTER_ID = 'zutfo-jqaaa-aaaao-a4puq-cai';
const RESOLVER_SPREAD_BPS = 50;
const CACHE_TTL_MS = 10_000;
const CACHE_REFRESH_INTERVAL_MS = 10_000;

const COMMON_ASSETS = ['BTC', 'ETH', 'XAUT', 'ICP', 'SOL', 'XRP', 'BNB', 'NVDA', 'TSLA', 'GOOGL'];

interface OraclePrice {
  value: bigint;
  confidence: bigint | null;
  timestamp: bigint;
  source: string;
}

interface PriceCache {
  price: number;
  timestamp: number;
}

const oracleIdlFactory = ({ IDL }: any) => {
  const Price = IDL.Record({
    value: IDL.Nat64,
    confidence: IDL.Opt(IDL.Nat64),
    timestamp: IDL.Nat64,
    source: IDL.Text,
  });

  return IDL.Service({
    get_price: IDL.Func([IDL.Text], [IDL.Opt(Price)], ['query']),
    get_prices: IDL.Func([IDL.Vec(IDL.Text)], [IDL.Vec(IDL.Opt(Price))], ['query']),
  });
};

@Injectable()
export class PricingService implements OnModuleInit {
  private readonly logger = new Logger(PricingService.name);
  private priceCache: Map<string, PriceCache> = new Map();
  private agent: HttpAgent;
  private oracleActor: any;
  private refreshInterval: NodeJS.Timeout;

  constructor(private readonly configService: ConfigService) {
    this.agent = new HttpAgent({
      host: 'https://ic0.app',
    });

    this.oracleActor = Actor.createActor(oracleIdlFactory, {
      agent: this.agent,
      canisterId: ORACLE_CANISTER_ID,
    });

    this.logger.log('Pricing service initialized with oracle canister');
  }

  onModuleInit() {
    this.testOracleConnection();
    this.startBackgroundRefresh();
  }

  private startBackgroundRefresh() {
    this.logger.log(`Starting background price refresh every ${CACHE_REFRESH_INTERVAL_MS / 1000}s for ${COMMON_ASSETS.length} assets`);

    this.refreshPrices();

    this.refreshInterval = setInterval(() => {
      this.refreshPrices();
    }, CACHE_REFRESH_INTERVAL_MS);
  }

  private async refreshPrices() {
    try {
      const pricesMap = await this.fetchPricesFromOracle(COMMON_ASSETS);
      const now = Date.now();

      for (const [assetId, price] of pricesMap) {
        this.priceCache.set(assetId, {
          price,
          timestamp: now,
        });
      }

      this.logger.log(`Background refresh: cached ${pricesMap.size} prices`);
    } catch (error) {
      this.logger.error(`Background price refresh failed: ${error.message}`);
    }
  }

  private async testOracleConnection() {
    try {
      this.logger.log('Testing oracle connection...');
      const btcPriceArray = await this.oracleActor.get_price('BTC');
      const xautPriceArray = await this.oracleActor.get_price('XAUT');

      if (btcPriceArray && btcPriceArray.length > 0) {
        const btcPrice = Number(btcPriceArray[0].value) / 100_000_000;
        this.logger.log(`Oracle test - BTC: $${btcPrice.toFixed(2)}`);
      }

      if (xautPriceArray && xautPriceArray.length > 0) {
        const xautPrice = Number(xautPriceArray[0].value) / 100_000_000;
        this.logger.log(`Oracle test - XAUT: $${xautPrice.toFixed(2)}`);
      }
    } catch (error) {
      this.logger.error(`Oracle connection test failed: ${error.message}`);
    }
  }

  async getPrice(assetId: string): Promise<number> {
    const cached = this.priceCache.get(assetId);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
      return cached.price;
    }

    const price = await this.fetchPriceFromOracle(assetId);

    this.priceCache.set(assetId, {
      price,
      timestamp: now,
    });

    return price;
  }

  async getPrices(assetIds: string[]): Promise<Map<string, number>> {
    const now = Date.now();
    const pricesMap = new Map<string, number>();
    const assetsToFetch: string[] = [];

    for (const assetId of assetIds) {
      const cached = this.priceCache.get(assetId);
      if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
        pricesMap.set(assetId, cached.price);
      } else {
        assetsToFetch.push(assetId);
      }
    }

    if (assetsToFetch.length > 0) {
      const fetchedPrices = await this.fetchPricesFromOracle(assetsToFetch);

      for (const [assetId, price] of fetchedPrices) {
        pricesMap.set(assetId, price);
        this.priceCache.set(assetId, {
          price,
          timestamp: now,
        });
      }
    }

    return pricesMap;
  }

  private async fetchPriceFromOracle(assetId: string): Promise<number> {
    try {
      const priceOptArray: OraclePrice[] = await this.oracleActor.get_price(assetId);

      if (!priceOptArray || priceOptArray.length === 0) {
        throw new Error(`No price available for ${assetId} from oracle`);
      }

      const priceOpt = priceOptArray[0];

      if (!priceOpt || priceOpt.value === undefined || priceOpt.value === null) {
        throw new Error(`No price available for ${assetId} from oracle`);
      }

      const priceE8s = BigInt(priceOpt.value);
      const priceUsd = Number(priceE8s) / 100_000_000;

      this.logger.log(`Fetched ${assetId} price from oracle: $${priceUsd.toFixed(2)}`);

      return priceUsd;
    } catch (error) {
      this.logger.error(`Failed to fetch price for ${assetId} from oracle: ${error.message}`);
      throw error;
    }
  }

  private async fetchPricesFromOracle(assetIds: string[]): Promise<Map<string, number>> {
    try {
      const priceOptArrays: OraclePrice[][] = await this.oracleActor.get_prices(assetIds);

      const pricesMap = new Map<string, number>();

      for (let i = 0; i < assetIds.length; i++) {
        const assetId = assetIds[i];
        const priceOptArray = priceOptArrays[i];

        if (priceOptArray && priceOptArray.length > 0) {
          const priceOpt = priceOptArray[0];
          if (priceOpt && priceOpt.value !== undefined && priceOpt.value !== null) {
            const priceE8s = BigInt(priceOpt.value);
            const priceUsd = Number(priceE8s) / 100_000_000;
            pricesMap.set(assetId, priceUsd);
          } else {
            this.logger.warn(`No price available for ${assetId} from oracle`);
          }
        } else {
          this.logger.warn(`No price available for ${assetId} from oracle`);
        }
      }

      this.logger.log(`Batch fetched ${pricesMap.size}/${assetIds.length} prices from oracle`);

      return pricesMap;
    } catch (error) {
      this.logger.error(`Failed to batch fetch prices from oracle: ${error.message}`);
      throw error;
    }
  }

  async calculateQuote(
    assetId: string,
    usdAmount: number,
    decimals: number = 8,
  ): Promise<{ amount: number; price: number; total_usd: number }> {
    const oraclePrice = await this.getPrice(assetId);

    const spreadMultiplier = 1 + (RESOLVER_SPREAD_BPS / 10000);
    const effectivePrice = oraclePrice * spreadMultiplier;

    const rawAmount = usdAmount / effectivePrice;
    const amount = Math.floor(rawAmount * Math.pow(10, decimals));

    this.logger.log(`Quote for ${assetId}: ${usdAmount} USD = ${amount} tokens (price: $${effectivePrice.toFixed(4)})`);

    return {
      amount,
      price: effectivePrice,
      total_usd: usdAmount,
    };
  }

  getSpreadBps(): number {
    return RESOLVER_SPREAD_BPS;
  }

  getMinProfitBps(): number {
    return 10;
  }
}
