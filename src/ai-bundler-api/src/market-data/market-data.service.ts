import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Actor, HttpAgent } from '@dfinity/agent';
import { idlFactory } from '../declarations';

interface Asset {
  id: string;
  symbol: string;
  name: string;
  category: string;
  description?: string;
  market_cap?: number;
  market_cap_rank?: number;
  volume_24h?: number;
  price_change_24h_percent?: number;
  price_change_7d_percent?: number;
  is_stablecoin?: boolean;
}

@Injectable()
export class MarketDataService {
  private assetsCache: Asset[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 3600000;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  async getAssets(): Promise<Asset[]> {
    const now = Date.now();

    if (this.assetsCache && now - this.cacheTimestamp < this.CACHE_TTL) {
      return this.assetsCache;
    }

    const icAssets = await this.fetchAssetsFromIC();
    const marketData = await this.fetchMarketDataFromCoinGecko(icAssets);

    const enrichedAssets: Asset[] = icAssets.map((asset) => {
      const data = marketData[asset.symbol?.toUpperCase() || ''];
      return {
        id: asset.id!,
        symbol: asset.symbol!,
        name: asset.name!,
        category: asset.category!,
        description: asset.description,
        market_cap: data?.market_cap,
        market_cap_rank: data?.market_cap_rank,
        volume_24h: data?.total_volume,
        price_change_24h_percent: data?.price_change_percentage_24h,
        price_change_7d_percent: data?.price_change_percentage_7d,
        is_stablecoin: asset.category === 'Stablecoin',
      };
    });

    this.assetsCache = enrichedAssets;
    this.cacheTimestamp = now;

    return enrichedAssets;
  }

  private async fetchAssetsFromIC(): Promise<Partial<Asset>[]> {
    try {
      const agent = new HttpAgent({ host: 'https://ic0.app' });
      const actor = Actor.createActor(idlFactory, {
        agent,
        canisterId: 'dk3fi-vyaaa-aaaae-qfycq-cai',
      });

      const result: any = await actor.list_assets([]);

      const assets = result
        .filter((asset: any) => asset.is_active)
        .map((asset: any) => {
          const category = this.getCategoryName(asset);
          return {
            id: asset.id,
            symbol: asset.symbol,
            name: asset.name,
            category: category,
            description: asset.metadata?.description?.[0] || '',
          };
        });

      return assets;
    } catch (error) {
      console.error('Failed to fetch assets from IC:', error);
      return [];
    }
  }

  private getCategoryName(asset: any): string {
    const category = asset.metadata?.category;
    if (!category) return 'Other';

    if ('Cryptocurrency' in category) return 'Cryptocurrency';
    if ('RWA' in category) return 'RWA';
    if ('LiquidStaking' in category) return 'Liquid Staking';
    if ('Yield' in category) return 'Yield';
    if ('Stablecoin' in category) return 'Cryptocurrency';
    if ('CommodityBacked' in category) return 'RWA';
    if ('Stocks' in category) return 'RWA';
    return 'Other';
  }

  private async fetchMarketDataFromCoinGecko(assets: Partial<Asset>[]): Promise<Record<string, any>> {
    try {
      const symbolToCoinGeckoId: Record<string, string> = {
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'SOL': 'solana',
        'ICP': 'internet-computer',
        'ADA': 'cardano',
        'ARB': 'arbitrum',
        'AVAX': 'avalanche-2',
        'BCH': 'bitcoin-cash',
        'BNB': 'binancecoin',
        'DOGE': 'dogecoin',
        'HBAR': 'hedera-hashgraph',
        'HYPE': 'hyperliquid',
        'LINK': 'chainlink',
        'LTC': 'litecoin',
        'MATIC': 'matic-network',
        'SUI': 'sui',
        'TRX': 'tron',
        'UNI': 'uniswap',
        'XLM': 'stellar',
        'XRP': 'ripple',
        'STETH': 'staked-ether',
        'JITOSOL': 'jito-staked-sol',
        'XAUT': 'tether-gold',
      };

      const coinGeckoIds = assets
        .map((a) => symbolToCoinGeckoId[a.symbol || ''])
        .filter(Boolean)
        .join(',');

      if (!coinGeckoIds) {
        return {};
      }

      const apiKey = this.configService.get<string>('COINGECKO_API_KEY');
      const baseUrl = apiKey
        ? 'https://pro-api.coingecko.com/api/v3'
        : 'https://api.coingecko.com/api/v3';

      const headers = apiKey ? { 'x-cg-pro-api-key': apiKey } : {};

      const url = `${baseUrl}/coins/markets`;
      const params = {
        vs_currency: 'usd',
        ids: coinGeckoIds,
        order: 'market_cap_desc',
        per_page: 250,
        page: 1,
        sparkline: false,
        price_change_percentage: '24h,7d',
      };

      const response = await firstValueFrom(
        this.httpService.get(url, { params, headers }),
      );

      const dataMap: Record<string, any> = {};
      response.data.forEach((coin: any) => {
        dataMap[coin.symbol.toUpperCase()] = coin;
      });

      return dataMap;
    } catch (error) {
      console.error('Failed to fetch market data from CoinGecko:', error);
      return {};
    }
  }
}
