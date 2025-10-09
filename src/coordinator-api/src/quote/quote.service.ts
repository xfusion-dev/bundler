import { Injectable } from '@nestjs/common';
import { BackendService } from '../services/backend.service';
import { ResolverService } from '../services/resolver.service';
import { SelectorService } from '../services/selector.service';
import { SignerService } from '../services/signer.service';

@Injectable()
export class QuoteService {
  constructor(
    private readonly backendService: BackendService,
    private readonly resolverService: ResolverService,
    private readonly selectorService: SelectorService,
    private readonly signerService: SignerService,
  ) {}

  async getQuote(bundleId: number, operation: any, user: string) {
    const startTime = Date.now();
    const operationType = Object.keys(operation)[0];
    console.log(`[Quote] Request for bundle ${bundleId}, operation: ${operationType}, user: ${user.slice(0, 8)}...`);

    const bundle = await this.backendService.getBundle(bundleId);

    const quotes = await this.resolverService.queryAllResolvers(
      bundleId,
      operation,
      user,
    );

    console.log(`[Quote] Received ${quotes.length} quote(s) from resolvers`);

    if (quotes.length === 0) {
      console.error('[Quote] No quotes available from any resolver');
      throw new Error('No quotes available from resolvers');
    }

    const bestQuote = this.selectorService.selectBestQuote(quotes, operation);

    if (!bestQuote) {
      console.error('[Quote] Failed to select best quote');
      throw new Error('Failed to select best quote');
    }

    console.log(`[Quote] Selected resolver: ${bestQuote.resolver}, NAV tokens: ${bestQuote.nav_tokens}, USDC: ${bestQuote.ckusdc_amount}`);

    const nonce = Date.now() * 1000 + Math.floor(Math.random() * 1000);
    const validUntilSeconds = Math.floor((Date.now() + 30000) / 1000);
    const validUntil = validUntilSeconds * 1000000000;

    const platformFee = Math.floor(
      (bestQuote.ckusdc_amount * (bundle.platform_fee_bps || 50)) / 10000,
    );

    const quoteObject: any = {
      bundle_id: bundleId,
      operation,
      resolver: bestQuote.resolver_principal,
      nav_tokens: bestQuote.nav_tokens,
      ckusdc_amount: bestQuote.ckusdc_amount,
      asset_amounts: bestQuote.asset_amounts,
      fees: platformFee,
      valid_until: validUntil,
      nonce,
      coordinator_signature: [],
    };

    const signature = await this.signerService.signQuote(quoteObject);
    quoteObject.coordinator_signature = Array.from(signature);

    const duration = Date.now() - startTime;
    console.log(`[Quote] Generated quote in ${duration}ms, nonce: ${nonce}, fee: $${(platformFee / 1e8).toFixed(2)}`);

    return quoteObject;
  }
}
