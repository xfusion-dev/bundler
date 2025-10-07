import { Injectable } from '@nestjs/common';
import { BackendService } from '../services/backend.service';
import { ResolverService } from '../services/resolver.service';
import { SelectorService } from '../services/selector.service';
import { SignerService } from '../services/signer.service';

@Injectable()
export class QuoteService {
  private nonceCounter = 0;

  constructor(
    private readonly backendService: BackendService,
    private readonly resolverService: ResolverService,
    private readonly selectorService: SelectorService,
    private readonly signerService: SignerService,
  ) {}

  async getQuote(bundleId: number, operation: any, user: string) {
    const bundle = await this.backendService.getBundle(bundleId);

    const quotes = await this.resolverService.queryAllResolvers(
      bundleId,
      operation,
      user,
    );

    if (quotes.length === 0) {
      throw new Error('No quotes available from resolvers');
    }

    const bestQuote = this.selectorService.selectBestQuote(quotes, operation);

    if (!bestQuote) {
      throw new Error('Failed to select best quote');
    }

    const nonce = ++this.nonceCounter;
    const validUntil = Date.now() + 30000;

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

    return quoteObject;
  }
}
