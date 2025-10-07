import { Injectable } from '@nestjs/common';

@Injectable()
export class QuoteService {
  private hardcodedPrices = {
    ckBTC: 100000,
    ckETH: 5000,
    ckUSDC: 1,
    ICP: 12.5,
  };

  generateQuote(bundleId: number, operation: any, user: string) {
    console.log(`[Quote] Generating quote for bundle ${bundleId}, operation:`, operation);

    const operationType = Object.keys(operation)[0];
    let navTokens = 0;
    let ckusdcAmount = 0;
    let assetAmounts: Array<{ asset_id: string; amount: number }> = [];

    if (operationType === 'InitialBuy') {
      ckusdcAmount = operation.InitialBuy.usd_amount;
      navTokens = operation.InitialBuy.nav_tokens;

      assetAmounts = [
        { asset_id: 'ckBTC', amount: Math.floor((ckusdcAmount * 0.6) / this.hardcodedPrices.ckBTC * 1e8) },
        { asset_id: 'ckETH', amount: Math.floor((ckusdcAmount * 0.4) / this.hardcodedPrices.ckETH * 1e8) },
      ];
    } else if (operationType === 'Buy') {
      ckusdcAmount = operation.Buy.ckusdc_amount;
      const usdValue = ckusdcAmount / 1e8;
      navTokens = Math.floor(usdValue * 1e8);

      assetAmounts = [
        { asset_id: 'ckBTC', amount: Math.floor((usdValue * 0.6) / this.hardcodedPrices.ckBTC * 1e8) },
        { asset_id: 'ckETH', amount: Math.floor((usdValue * 0.4) / this.hardcodedPrices.ckETH * 1e8) },
      ];
    } else if (operationType === 'Sell') {
      navTokens = operation.Sell.nav_tokens;
      const usdValue = navTokens / 1e8;
      ckusdcAmount = Math.floor(usdValue * 1e8);

      assetAmounts = [
        { asset_id: 'ckBTC', amount: Math.floor((usdValue * 0.6) / this.hardcodedPrices.ckBTC * 1e8) },
        { asset_id: 'ckETH', amount: Math.floor((usdValue * 0.4) / this.hardcodedPrices.ckETH * 1e8) },
      ];
    }

    const resolverFee = Math.floor(ckusdcAmount * 0.003);

    console.log(`[Quote] Generated: NAV=${navTokens}, USDC=${ckusdcAmount}, Fee=${resolverFee}`);

    return {
      nav_tokens: navTokens,
      ckusdc_amount: ckusdcAmount,
      asset_amounts: assetAmounts,
      fees: resolverFee,
    };
  }
}
