import { Injectable } from '@nestjs/common';
import { ResolverQuote } from './resolver.service';

@Injectable()
export class SelectorService {
  selectBestQuote(quotes: ResolverQuote[], operation: any): ResolverQuote | null {
    if (quotes.length === 0) {
      return null;
    }

    if ('Buy' in operation || 'InitialBuy' in operation) {
      return quotes.reduce((best, current) =>
        current.nav_tokens > best.nav_tokens ? current : best
      );
    }

    if ('Sell' in operation) {
      return quotes.reduce((best, current) =>
        current.ckusdc_amount > best.ckusdc_amount ? current : best
      );
    }

    return quotes[0];
  }
}
