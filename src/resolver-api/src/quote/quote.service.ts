import { Injectable, Logger } from '@nestjs/common';
import { PricingService } from '../services/pricing.service';
import { BackendService } from '../services/backend.service';

@Injectable()
export class QuoteService {
  private readonly logger = new Logger(QuoteService.name);

  constructor(
    private readonly pricingService: PricingService,
    private readonly backendService: BackendService,
  ) {}

  async generateQuote(bundleId: number, operation: any, user: string) {
    this.logger.log(`Generating quote for bundle ${bundleId}, operation: ${JSON.stringify(operation)}`);

    const bundle = await this.backendService.getBundle(bundleId);

    const operationType = Object.keys(operation)[0];
    let navTokens = 0;
    let ckusdcAmount = 0;
    let assetAmounts: Array<{ asset_id: string; amount: number }> = [];

    let usdValue = 0;
    let navPerToken = 1.0; // Default to $1 for InitialBuy

    // Fetch current NAV per token for Buy/Sell operations
    if (operationType !== 'InitialBuy') {
      try {
        const bundleNav = await this.backendService.calculateBundleNav(bundleId);
        navPerToken = Number(bundleNav.nav_per_token) / 1e8;
        this.logger.log(`Current NAV per token: $${navPerToken.toFixed(8)}`);
      } catch (error) {
        this.logger.warn(`Could not fetch NAV, using default $1: ${error.message}`);
      }
    }

    if (operationType === 'InitialBuy') {
      ckusdcAmount = operation.InitialBuy.usd_amount;
      navTokens = operation.InitialBuy.nav_tokens;
      usdValue = ckusdcAmount / 1e6;
    } else if (operationType === 'Buy') {
      ckusdcAmount = operation.Buy.ckusdc_amount;
      usdValue = ckusdcAmount / 1e6;
      // Calculate NAV tokens based on current NAV per token price
      navTokens = Math.floor((usdValue / navPerToken) * 1e8);
    } else if (operationType === 'Sell') {
      navTokens = operation.Sell.nav_tokens;
      // Calculate USD value based on current NAV per token price
      const navTokensDecimal = navTokens / 1e8;
      usdValue = navTokensDecimal * navPerToken;
      ckusdcAmount = Math.floor(usdValue * 1e6);
    }

    for (const allocation of bundle.allocations) {
      const allocationUsd = usdValue * (allocation.percentage / 100);

      const quote = await this.pricingService.calculateQuote(
        allocation.asset_id,
        allocationUsd,
      );

      assetAmounts.push({
        asset_id: allocation.asset_id,
        amount: quote.amount,
      });

      this.logger.log(
        `${allocation.asset_id}: ${allocation.percentage}% = $${allocationUsd.toFixed(2)} = ${quote.amount / 1e8} tokens @ $${quote.price}`,
      );
    }

    const resolverFee = Math.floor(ckusdcAmount * 0.003);

    this.logger.log(`Quote generated: NAV=${navTokens}, USDC=${ckusdcAmount}, Fee=${resolverFee}`);

    return {
      nav_tokens: navTokens,
      ckusdc_amount: ckusdcAmount,
      asset_amounts: assetAmounts,
      fees: resolverFee,
    };
  }
}
