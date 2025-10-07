import { Injectable, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

export interface ResolverConfig {
  name: string;
  url: string;
  principal: string;
}

export interface ResolverQuote {
  resolver: string;
  resolver_principal: string;
  nav_tokens: number;
  ckusdc_amount: number;
  asset_amounts: Array<{ asset_id: string; amount: number }>;
  fees: number;
}

@Injectable()
export class ResolverService implements OnModuleInit {
  private resolvers: ResolverConfig[] = [];

  onModuleInit() {
    const configPath = path.resolve(__dirname, '../../resolvers.config.json');

    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configData);
      this.resolvers = config.resolvers || [];
      console.log(`[Resolver] Loaded ${this.resolvers.length} resolver(s) from config`);
    } else {
      console.warn('[Resolver] No resolvers.config.json found, using empty resolver list');
    }
  }

  async queryAllResolvers(
    bundleId: number,
    operation: any,
    user: string,
  ): Promise<ResolverQuote[]> {
    const promises = this.resolvers.map(async (resolver) => {
      try {
        const response = await axios.post(
          `${resolver.url}/quote`,
          {
            bundleId,
            operation,
            user,
          },
          { timeout: 5000 },
        );

        return {
          resolver: resolver.name,
          resolver_principal: resolver.principal,
          ...response.data,
        };
      } catch (error) {
        console.error(`Resolver ${resolver.name} failed:`, error.message);
        return null;
      }
    });

    const results = await Promise.all(promises);
    return results.filter((quote) => quote !== null);
  }
}
