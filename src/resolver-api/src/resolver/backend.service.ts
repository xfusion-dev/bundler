import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Actor, HttpAgent, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { idlFactory } from './backend.did';

const BACKEND_CANISTER_ID = 'dk3fi-vyaaa-aaaae-qfycq-cai';
const ORACLE_CANISTER_ID = 'zutfo-jqaaa-aaaao-a4puq-cai';

// Oracle IDL Factory
const oracleIdlFactory = ({ IDL }) => {
  const Price = IDL.Record({
    'value': IDL.Nat64,
    'confidence': IDL.Opt(IDL.Nat64),
    'timestamp': IDL.Nat64,
    'source': IDL.Text,
  });

  return IDL.Service({
    'get_price': IDL.Func([IDL.Text], [IDL.Opt(Price)], ['query']),
    'get_prices': IDL.Func([IDL.Vec(IDL.Text)], [IDL.Vec(IDL.Opt(Price))], ['query']),
  });
};

@Injectable()
export class BackendService {
  private agent: HttpAgent;
  private authenticatedAgent: HttpAgent;
  private backendActor: any;
  private oracleActor: any;
  private resolverIdentity: Identity;
  private resolverPrincipal: Principal;

  constructor(private configService: ConfigService) {
    this.initializeAgent();
  }

  private async initializeAgent() {
    // Anonymous agent for queries
    this.agent = new HttpAgent({
      host: this.configService.get<string>('IC_HOST') || 'https://ic0.app',
    });

    // Create identity from mnemonic if provided
    const mnemonic = this.configService.get<string>('RESOLVER_MNEMONIC');
    if (mnemonic) {
      try {
        const seed = mnemonic.trim().split(' ');
        this.resolverIdentity = await Secp256k1KeyIdentity.fromSeedPhrase(seed);
        this.resolverPrincipal = this.resolverIdentity.getPrincipal();

        console.log('Resolver Principal:', this.resolverPrincipal.toText());

        // Authenticated agent for updates
        this.authenticatedAgent = new HttpAgent({
          host: this.configService.get<string>('IC_HOST') || 'https://ic0.app',
          identity: this.resolverIdentity,
        });
      } catch (error) {
        console.error('Failed to create identity from mnemonic:', error);
      }
    } else {
      console.warn('No RESOLVER_MNEMONIC provided - resolver cannot sign transactions');
    }

    this.backendActor = Actor.createActor(idlFactory, {
      agent: this.agent,
      canisterId: BACKEND_CANISTER_ID,
    });

    this.oracleActor = Actor.createActor(oracleIdlFactory, {
      agent: this.agent,
      canisterId: ORACLE_CANISTER_ID,
    });
  }

  getResolverPrincipal(): Principal | null {
    return this.resolverPrincipal || null;
  }

  async getQuote(quoteId: number): Promise<any> {
    // Get quote request from backend
    const result = await this.backendActor.get_quote_request(quoteId);
    if ('Ok' in result) {
      return result.Ok;
    }
    throw new Error(result.Err);
  }

  async calculateBundleNav(bundleId: number): Promise<any> {
    const result = await this.backendActor.calculate_bundle_nav(bundleId);
    if ('Ok' in result) {
      return result.Ok;
    }
    throw new Error(result.Err);
  }

  async getAssetPrices(assetIds: string[]): Promise<any> {
    // Call Oracle canister directly for real prices
    const prices = {};

    // Map frontend asset IDs to oracle tickers
    const tickerMap = {
      'ckBTC': 'BTC',
      'ckETH': 'ETH',
      'ckUSDC': 'USDC'
    };

    for (const assetId of assetIds) {
      const ticker = tickerMap[assetId] || assetId;
      try {
        const priceResult = await this.oracleActor.get_price(ticker);
        console.log(`Oracle response for ${ticker}:`, priceResult);

        // Oracle returns Option<Price>, check if it exists
        if (priceResult && priceResult.length > 0) {
          const price = priceResult[0];
          if (price && price.value) {
            // Oracle returns price with 8 decimals (e.g., 6500000000000 for $65,000)
            prices[assetId] = Number(price.value) / 100000000;
            console.log(`Price for ${ticker}: $${prices[assetId]} (source: ${price.source})`);
          } else {
            console.log(`No price data for ${ticker}`);
            prices[assetId] = 0;
          }
        } else {
          console.log(`Empty response for ${ticker}`);
          prices[assetId] = 0;
        }
      } catch (error) {
        console.error(`Failed to get price for ${ticker}:`, error);
        prices[assetId] = 0;
      }
    }

    return prices;
  }

  async confirmAssetDeposit(quoteId: number): Promise<boolean> {
    try {
      if (!this.authenticatedAgent) {
        throw new Error('No authenticated agent - resolver mnemonic not configured');
      }

      // Create authenticated actor for this call
      const authenticatedActor = Actor.createActor(idlFactory, {
        agent: this.authenticatedAgent,
        canisterId: BACKEND_CANISTER_ID,
      });

      const result = await authenticatedActor.confirm_asset_deposit_icrc2(quoteId);
      if ('Ok' in result) {
        console.log(`Successfully confirmed asset deposit for quote ${quoteId}`);
        return true;
      }
      console.error('Confirm asset deposit failed:', result.Err);
      return false;
    } catch (error) {
      console.error('Failed to confirm asset deposit:', error);
      return false;
    }
  }
}