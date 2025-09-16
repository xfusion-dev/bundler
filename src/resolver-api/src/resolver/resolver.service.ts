import { Injectable } from '@nestjs/common';
import { BackendService } from './backend.service';

@Injectable()
export class ResolverService {
  constructor(private readonly backendService: BackendService) {}

  async getQuotePrice(quoteId: number) {
    // Get the actual quote from backend
    const quote = await this.backendService.getQuote(quoteId);

    // Get the actual NAV calculation from backend
    const bundleNav = await this.backendService.calculateBundleNav(quote.bundle_id);

    // Get real oracle prices
    const prices = await this.backendService.getAssetPrices(['ckBTC', 'ckETH', 'ckUSDC']);

    return {
      quoteId,
      bundleId: quote.bundle_id,
      navTokens: quote.nav_tokens,
      pricePerNav: bundleNav.nav_per_token / 100000000, // Convert from 8 decimals
      totalUSDC: quote.amount_usdc,
      oraclePrices: prices,
      timestamp: new Date().toISOString(),
    };
  }

  async executeQuote(quoteId: number) {
    // Call the real backend method
    const result = await this.backendService.confirmAssetDeposit(quoteId);
    return {
      success: result,
      quoteId,
      timestamp: new Date().toISOString(),
    };
  }

  async getAssetPrices() {
    // Fetch BTC and ETH prices from the backend/oracle
    const prices = await this.backendService.getAssetPrices(['ckBTC', 'ckETH']);

    return {
      BTC: prices['ckBTC'] || 0,
      ETH: prices['ckETH'] || 0,
      timestamp: new Date().toISOString(),
      source: 'XFusion Oracle'
    };
  }

  async getResolverWalletInfo() {
    const resolverPrincipal = this.backendService.getResolverPrincipal();
    const BACKEND_CANISTER = 'dk3fi-vyaaa-aaaae-qfycq-cai';

    return {
      resolverPrincipal: resolverPrincipal ? resolverPrincipal.toText() : 'Not configured - add RESOLVER_MNEMONIC to .env',
      backendCanister: BACKEND_CANISTER,
      requiredAssets: [
        {
          asset: 'ckBTC',
          ledgerCanister: 'mxzaz-hqaaa-aaaar-qaada-cai',
          minimumBalance: '0.01 BTC',
          approvalNeeded: true
        },
        {
          asset: 'ckETH',
          ledgerCanister: 'ss2fx-dyaaa-aaaar-qacoq-cai',
          minimumBalance: '0.1 ETH',
          approvalNeeded: true
        },
        {
          asset: 'ckUSDC',
          ledgerCanister: 'xevnm-gaaaa-aaaar-qafnq-cai',
          minimumBalance: '1000 USDC',
          approvalNeeded: true
        }
      ],
      setupInstructions: [
        '1. Generate a wallet/principal for the resolver',
        '2. Fund the wallet with test ckBTC, ckETH, and ckUSDC',
        '3. Call icrc2_approve on each asset ledger to approve the backend canister',
        '4. Register the resolver principal in the backend canister',
        '5. Update this API with the resolver principal/private key'
      ]
    };
  }

  async checkSetupStatus() {
    // Check if resolver is properly set up
    return {
      hasWallet: false, // TODO: Check if resolver principal is configured
      hasBalances: false, // TODO: Check asset balances
      hasApprovals: false, // TODO: Check ICRC-2 approvals
      isRegistered: false, // TODO: Check if registered in backend
      ready: false
    };
  }
}